use base64::engine::general_purpose::{URL_SAFE, URL_SAFE_NO_PAD};
use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Production Master Public Key for KV File PRO (Ed25519 32-byte public key in hex)
pub const DEFAULT_MASTER_PUBLIC_KEY_HEX: &str =
    "f9b0e2b590ebee9310bd5496ed61595eb8f93468c62807876a1ca43f90c76a4e";

pub const PRO_BUNDLE_ID: &str = "kv-files-pro-all";

/// Superadmin Ultimate Master Activation Codes
/// Guaranteed to permanently unlock KV Files PRO Lifetime All-Access on any instance.
pub const MASTER_ACTIVATION_CODES: &[&str] = &[
    "KV-PRO-ULTIMATE-SUPERADMIN-ACCESS",
    "KVPRO-SUPERADMIN-MASTER-2026",
    "KV-VIP-SUPERADMIN-ALL-ACCESS",
];

pub fn is_master_activation_code(code: &str) -> bool {
    let clean = code.trim().to_uppercase();
    MASTER_ACTIVATION_CODES.iter().any(|&c| c == clean)
}

#[derive(Error, Debug)]
pub enum LicensingError {
    #[error("Invalid license format: {0}")]
    InvalidFormat(String),
    #[error("Cryptographic signature verification failed")]
    SignatureVerificationFailed,
    #[error("License has expired on {0}")]
    LicenseExpired(String),
    #[error("Payload deserialization error: {0}")]
    PayloadError(String),
    #[error("Cryptographic key error: {0}")]
    KeyError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LicensePayload {
    pub id: String,
    pub user: String,
    pub tier: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer_email: Option<String>,
    pub issued_at: i64,
    /// None indicates a Lifetime Perpetual License
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<i64>,
    #[serde(default)]
    pub features: Vec<String>,
}

impl LicensePayload {
    pub fn is_lifetime(&self) -> bool {
        self.expires_at.is_none()
    }

    pub fn is_active(&self) -> bool {
        match self.expires_at {
            Some(exp) => chrono::Utc::now().timestamp() <= exp,
            None => true,
        }
    }

    #[allow(dead_code)]
    pub fn covers_extension(&self, ext_id: &str) -> bool {
        if self.tier == PRO_BUNDLE_ID || self.tier == "all" {
            return true;
        }
        if self.tier == ext_id {
            return true;
        }
        self.features.iter().any(|f| f == "all" || f == ext_id)
    }
}

/// Decode base64 with or without padding
fn decode_base64_flexible(input: &str) -> Result<Vec<u8>, LicensingError> {
    let trimmed = input.trim();
    if let Ok(bytes) = URL_SAFE_NO_PAD.decode(trimmed) {
        return Ok(bytes);
    }
    if let Ok(bytes) = URL_SAFE.decode(trimmed) {
        return Ok(bytes);
    }
    base64::engine::general_purpose::STANDARD
        .decode(trimmed)
        .map_err(|e| LicensingError::InvalidFormat(format!("Base64 decode failed: {}", e)))
}

/// Verify an Ed25519-signed KV File PRO license token
///
/// Format: `KVPRO-<base64_payload>.<base64_signature>`
pub fn verify_pro_license(
    key: &str,
    custom_public_key_hex: Option<&str>,
) -> Result<LicensePayload, LicensingError> {
    let trimmed = key.trim();
    let token = if let Some(stripped) = trimmed.strip_prefix("KVPRO-") {
        stripped
    } else {
        trimmed
    };

    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 2 {
        return Err(LicensingError::InvalidFormat(
            "Expected format KVPRO-<payload>.<signature>".into(),
        ));
    }

    let payload_b64 = parts[0];
    let sig_b64 = parts[1];

    let payload_bytes = decode_base64_flexible(payload_b64)?;
    let sig_bytes = decode_base64_flexible(sig_b64)?;

    if sig_bytes.len() != 64 {
        return Err(LicensingError::InvalidFormat(format!(
            "Invalid signature length: expected 64 bytes, got {}",
            sig_bytes.len()
        )));
    }

    let pubkey_hex = custom_public_key_hex.unwrap_or(DEFAULT_MASTER_PUBLIC_KEY_HEX);
    let pubkey_bytes = hex::decode(pubkey_hex.trim())
        .map_err(|e| LicensingError::KeyError(format!("Invalid public key hex: {}", e)))?;

    if pubkey_bytes.len() != 32 {
        return Err(LicensingError::KeyError(format!(
            "Invalid public key length: expected 32 bytes, got {}",
            pubkey_bytes.len()
        )));
    }

    let mut pub_array = [0u8; 32];
    pub_array.copy_from_slice(&pubkey_bytes);

    let verifying_key = VerifyingKey::from_bytes(&pub_array)
        .map_err(|e| LicensingError::KeyError(format!("Invalid Ed25519 public key: {}", e)))?;

    let mut sig_array = [0u8; 64];
    sig_array.copy_from_slice(&sig_bytes);
    let signature = Signature::from_bytes(&sig_array);

    verifying_key
        .verify(&payload_bytes, &signature)
        .map_err(|_| LicensingError::SignatureVerificationFailed)?;

    let payload: LicensePayload = serde_json::from_slice(&payload_bytes)
        .map_err(|e| LicensingError::PayloadError(format!("Invalid JSON payload: {}", e)))?;

    if !payload.is_active() {
        let exp_time = payload.expires_at.unwrap_or(0);
        let dt = chrono::DateTime::from_timestamp(exp_time, 0)
            .map(|d| d.to_rfc3339())
            .unwrap_or_else(|| exp_time.to_string());
        return Err(LicensingError::LicenseExpired(dt));
    }

    Ok(payload)
}

/// Sign a license payload with an Ed25519 private key (used for offline key issuing or testing)
#[allow(dead_code)]
pub fn sign_license_payload(
    payload: &LicensePayload,
    private_key_bytes: &[u8; 32],
) -> Result<String, LicensingError> {
    use ed25519_dalek::Signer;
    let signing_key = ed25519_dalek::SigningKey::from_bytes(private_key_bytes);

    let json_bytes = serde_json::to_vec(payload)
        .map_err(|e| LicensingError::PayloadError(format!("JSON serialization failed: {}", e)))?;

    let signature = signing_key.sign(&json_bytes);

    let payload_b64 = URL_SAFE_NO_PAD.encode(&json_bytes);
    let sig_b64 = URL_SAFE_NO_PAD.encode(signature.to_bytes());

    Ok(format!("KVPRO-{}.{}", payload_b64, sig_b64))
}
