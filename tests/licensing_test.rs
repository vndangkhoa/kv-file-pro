use kv_files::licensing::{
    sign_license_payload, verify_pro_license, LicensePayload, DEFAULT_MASTER_PUBLIC_KEY_HEX,
    PRO_BUNDLE_ID,
};

// Test private key matching DEFAULT_MASTER_PUBLIC_KEY_HEX
// Generated via: 328cbd52260e870a3bce416049f8e97a55567a2c1e48db56f1f41aa6b12ee469
const TEST_MASTER_PRIVATE_KEY_HEX: &str =
    "328cbd52260e870a3bce416049f8e97a55567a2c1e48db56f1f41aa6b12ee469";

#[test]
fn test_ed25519_lifetime_license_verification() {
    let priv_bytes = hex::decode(TEST_MASTER_PRIVATE_KEY_HEX).unwrap();
    let mut priv_array = [0u8; 32];
    priv_array.copy_from_slice(&priv_bytes);

    let payload = LicensePayload {
        id: "LIC-PRO-12345".to_string(),
        user: "vndangkhoa@gmail.com".to_string(),
        tier: PRO_BUNDLE_ID.to_string(),
        customer_email: Some("vndangkhoa@gmail.com".to_string()),
        issued_at: chrono::Utc::now().timestamp(),
        expires_at: None, // Lifetime
        features: vec!["all".to_string()],
    };

    let signed_key = sign_license_payload(&payload, &priv_array).unwrap();
    assert!(signed_key.starts_with("KVPRO-"));

    let verified = verify_pro_license(&signed_key, Some(DEFAULT_MASTER_PUBLIC_KEY_HEX)).unwrap();
    assert_eq!(verified.id, "LIC-PRO-12345");
    assert_eq!(verified.tier, PRO_BUNDLE_ID);
    assert!(verified.is_lifetime());
    assert!(verified.is_active());
    assert!(verified.covers_extension("cad-viewer"));
    assert!(verified.covers_extension("adobe-suite-viewer"));
}

#[test]
fn test_ed25519_expired_license_fails() {
    let priv_bytes = hex::decode(TEST_MASTER_PRIVATE_KEY_HEX).unwrap();
    let mut priv_array = [0u8; 32];
    priv_array.copy_from_slice(&priv_bytes);

    let payload = LicensePayload {
        id: "LIC-EXP-999".to_string(),
        user: "expired@example.com".to_string(),
        tier: PRO_BUNDLE_ID.to_string(),
        customer_email: None,
        issued_at: 1600000000,
        expires_at: Some(1600000100), // Expired in the past
        features: vec!["all".to_string()],
    };

    let signed_key = sign_license_payload(&payload, &priv_array).unwrap();
    let res = verify_pro_license(&signed_key, Some(DEFAULT_MASTER_PUBLIC_KEY_HEX));
    assert!(res.is_err());
    assert!(res.unwrap_err().to_string().contains("expired"));
}

#[test]
fn test_ed25519_tampered_signature_fails() {
    let priv_bytes = hex::decode(TEST_MASTER_PRIVATE_KEY_HEX).unwrap();
    let mut priv_array = [0u8; 32];
    priv_array.copy_from_slice(&priv_bytes);

    let payload = LicensePayload {
        id: "LIC-TAMPER-001".to_string(),
        user: "victim@example.com".to_string(),
        tier: PRO_BUNDLE_ID.to_string(),
        customer_email: None,
        issued_at: chrono::Utc::now().timestamp(),
        expires_at: None,
        features: vec!["all".to_string()],
    };

    let signed_key = sign_license_payload(&payload, &priv_array).unwrap();
    let parts: Vec<&str> = signed_key.split('.').collect();

    // 1. Tamper with payload
    let tampered_payload = format!("{}_tampered.{}", parts[0], parts[1]);
    let res = verify_pro_license(&tampered_payload, Some(DEFAULT_MASTER_PUBLIC_KEY_HEX));
    assert!(res.is_err());

    // 2. Tamper with signature
    let mut sig_chars: Vec<char> = parts[1].chars().collect();
    sig_chars[0] = if sig_chars[0] == 'A' { 'B' } else { 'A' };
    let tampered_sig: String = sig_chars.into_iter().collect();
    let tampered_key = format!("{}.{}", parts[0], tampered_sig);
    let res_sig = verify_pro_license(&tampered_key, Some(DEFAULT_MASTER_PUBLIC_KEY_HEX));
    assert!(res_sig.is_err());
}
