use crate::error::{AppError, Result};
use crate::models::{
    ActivateLicenseRequest, ActivateLicenseResponse, AdminOrderActionRequest,
    AdminOrdersListResponse, AdminOrdersQuery, CreatePaymentRequest, CreatePaymentResponse,
    ExtensionLicense, ExtensionOrder, FsEvent, OrderStatusResponse, SubmitTransferRequest, User,
    ZaloPayCallbackData, ZaloPayCallbackRequest, ZaloPayCallbackResponse,
    ZaloPayCreateOrderRequest, ZaloPayCreateOrderResponse, ZaloPayQueryOrderRequest,
    ZaloPayQueryOrderResponse,
};
use crate::state::AppState;
use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use chrono::FixedOffset;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

pub const DEFAULT_LICENSE_SECRET: &str = "KV_FILES_PRO_MASTER_SIGNING_KEY_v2";

// -----------------------------------------------------------------------------
// ZaloPay Official Default Sandbox Credentials (https://sbmc.zalopay.vn)
// -----------------------------------------------------------------------------
pub const SANDBOX_ZALOPAY_APP_ID: u32 = 2554;
pub const SANDBOX_ZALOPAY_KEY1: &str = "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn";
pub const SANDBOX_ZALOPAY_KEY2: &str = "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf";
pub const SANDBOX_ZALOPAY_CREATE_ENDPOINT: &str = "https://sb-openapi.zalopay.vn/v2/create";
pub const SANDBOX_ZALOPAY_QUERY_ENDPOINT: &str = "https://sb-openapi.zalopay.vn/v2/query";

pub const PROD_ZALOPAY_CREATE_ENDPOINT: &str = "https://openapi.zalopay.vn/v2/create";
pub const PROD_ZALOPAY_QUERY_ENDPOINT: &str = "https://openapi.zalopay.vn/v2/query";

pub const DEFAULT_ZALOPAY_REDIRECT_URL: &str = "http://localhost:8866/settings?tab=extensions";
pub const DEFAULT_ZALOPAY_CALLBACK_URL: &str = "http://localhost:8866/api/v1/payments/zalopay/callback";

// -----------------------------------------------------------------------------
// ZaloPay Approved Production Merchant & VietQR Credentials
// Store ID: 835219_835220_835221
// -----------------------------------------------------------------------------
pub const DEFAULT_ZALOPAY_STORE_ID: &str = "835219_835220_835221";
pub const DEFAULT_ZALOPAY_MERCHANT_CODE: &str = "ZP-9B856443";
pub const DEFAULT_ZALOPAY_MERCHANT_NAME: &str = "KV FILE PRO (Thu Ngân)";
pub const DEFAULT_ZALOPAY_BANK_NAME: &str = "BVBank (Ngân hàng Bản Việt)";
pub const DEFAULT_ZALOPAY_BANK_BIN: &str = "970454";
pub const DEFAULT_ZALOPAY_ACCOUNT_NO: &str = "99ZP26264M77756812";
pub const DEFAULT_ZALOPAY_PRO_QR: &str = "/zalopay_pro_qr.png";

#[derive(Debug, Clone)]
pub struct ZaloPayConfig {
    pub app_id: u32,
    pub key1: String,
    pub key2: String,
    pub create_endpoint: String,
    pub query_endpoint: String,
    pub redirect_url: String,
    pub callback_url: String,
    pub is_sandbox: bool,
    pub store_id: String,
    pub merchant_code: String,
    pub merchant_name: String,
    pub bank_name: String,
    pub bank_bin: String,
    pub account_no: String,
    pub qr_image_url: String,
}

pub fn get_zalopay_config() -> ZaloPayConfig {
    get_zalopay_config_with_override(None)
}

pub fn get_zalopay_config_with_override(force_test: Option<bool>) -> ZaloPayConfig {
    let env_mode = std::env::var("ZALOPAY_ENV").unwrap_or_else(|_| "sandbox".into());

    let is_sandbox = force_test.unwrap_or_else(|| {
        env_mode.eq_ignore_ascii_case("sandbox")
            || env_mode.eq_ignore_ascii_case("test")
            || env_mode.eq_ignore_ascii_case("dev")
    });

    let app_id: u32 = std::env::var("ZALOPAY_APP_ID")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(SANDBOX_ZALOPAY_APP_ID);

    let key1 = std::env::var("ZALOPAY_KEY1").unwrap_or_else(|_| SANDBOX_ZALOPAY_KEY1.into());
    let key2 = std::env::var("ZALOPAY_KEY2").unwrap_or_else(|_| SANDBOX_ZALOPAY_KEY2.into());

    let create_endpoint = std::env::var("ZALOPAY_CREATE_ENDPOINT").unwrap_or_else(|_| {
        if is_sandbox {
            SANDBOX_ZALOPAY_CREATE_ENDPOINT.into()
        } else {
            PROD_ZALOPAY_CREATE_ENDPOINT.into()
        }
    });

    let query_endpoint = std::env::var("ZALOPAY_QUERY_ENDPOINT").unwrap_or_else(|_| {
        if is_sandbox {
            SANDBOX_ZALOPAY_QUERY_ENDPOINT.into()
        } else {
            PROD_ZALOPAY_QUERY_ENDPOINT.into()
        }
    });

    let redirect_url = std::env::var("ZALOPAY_REDIRECT_URL")
        .unwrap_or_else(|_| DEFAULT_ZALOPAY_REDIRECT_URL.into());
    let callback_url = std::env::var("ZALOPAY_CALLBACK_URL")
        .unwrap_or_else(|_| DEFAULT_ZALOPAY_CALLBACK_URL.into());

    let store_id = std::env::var("ZALOPAY_STORE_ID")
        .unwrap_or_else(|_| DEFAULT_ZALOPAY_STORE_ID.into());
    let merchant_code = std::env::var("ZALOPAY_MERCHANT_CODE")
        .unwrap_or_else(|_| DEFAULT_ZALOPAY_MERCHANT_CODE.into());
    let merchant_name = std::env::var("ZALOPAY_MERCHANT_NAME")
        .unwrap_or_else(|_| DEFAULT_ZALOPAY_MERCHANT_NAME.into());
    let bank_name = std::env::var("ZALOPAY_BANK_NAME")
        .unwrap_or_else(|_| DEFAULT_ZALOPAY_BANK_NAME.into());
    let bank_bin = std::env::var("ZALOPAY_BANK_BIN")
        .unwrap_or_else(|_| DEFAULT_ZALOPAY_BANK_BIN.into());
    let account_no = std::env::var("ZALOPAY_ACCOUNT_NO")
        .unwrap_or_else(|_| DEFAULT_ZALOPAY_ACCOUNT_NO.into());
    let qr_image_url = std::env::var("ZALOPAY_QR_IMAGE")
        .unwrap_or_else(|_| DEFAULT_ZALOPAY_PRO_QR.into());

    ZaloPayConfig {
        app_id,
        key1,
        key2,
        create_endpoint,
        query_endpoint,
        redirect_url,
        callback_url,
        is_sandbox,
        store_id,
        merchant_code,
        merchant_name,
        bank_name,
        bank_bin,
        account_no,
        qr_image_url,
    }
}

/// Generate app_trans_id compliant with ZaloPay v2: format `yymmdd_xxxx` (GMT+7)
pub fn generate_zalopay_trans_id(suffix: &str) -> String {
    let vn_tz = FixedOffset::east_opt(7 * 3600).unwrap_or(FixedOffset::east_opt(0).unwrap());
    let now_vn = chrono::Utc::now().with_timezone(&vn_tz);
    let date_prefix = now_vn.format("%y%m%d").to_string();
    let clean: String = suffix
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
        .take(28)
        .collect();
    format!("{}_{}", date_prefix, clean)
}

/// Sign ZaloPay Order creation MAC with Key1
/// Formula: HMAC_SHA256(key1, app_id|app_trans_id|app_user|amount|app_time|embed_data|item)
pub fn sign_zalopay_order_mac(
    app_id: u32,
    app_trans_id: &str,
    app_user: &str,
    amount: i64,
    app_time: i64,
    embed_data: &str,
    item: &str,
    key1: &str,
) -> String {
    let raw = format!(
        "{}|{}|{}|{}|{}|{}|{}",
        app_id, app_trans_id, app_user, amount, app_time, embed_data, item
    );
    let mut mac = HmacSha256::new_from_slice(key1.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(raw.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

/// Sign / Verify ZaloPay Callback MAC with Key2
/// Formula: HMAC_SHA256(key2, data)
pub fn sign_zalopay_callback_mac(data: &str, key2: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(key2.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(data.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

/// Sign ZaloPay Query Order MAC with Key1
/// Formula: HMAC_SHA256(key1, app_id|app_trans_id|key1)
pub fn sign_zalopay_query_mac(app_id: u32, app_trans_id: &str, key1: &str) -> String {
    let raw = format!("{}|{}|{}", app_id, app_trans_id, key1);
    let mut mac = HmacSha256::new_from_slice(key1.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(raw.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

/// Constant-time string equality to prevent timing attacks on HMAC signatures
pub fn subtle_string_eq(a: &str, b: &str) -> bool {
    let a_bytes = a.as_bytes();
    let b_bytes = b.as_bytes();
    if a_bytes.len() != b_bytes.len() {
        return false;
    }
    let mut result = 0u8;
    for (x, y) in a_bytes.iter().zip(b_bytes.iter()) {
        result |= x ^ y;
    }
    result == 0
}

/// Generate a cryptographically signed license key
pub fn generate_signed_license_key(extension_id: &str, secret_key: &str) -> String {
    let tag = match extension_id {
        crate::models::PRO_BUNDLE_ID => "PRO",
        "cad-viewer" => "CAD",
        "adobe-suite-viewer" | "psd-viewer" => "ADOBE",
        "font-viewer" => "FONT",
        "sysvis-flow-viewer" => "SYSVIS",
        "archive-inspector" => "ARCHIVE",
        "markdown-enhanced" => "MARKDOWN",
        "exif-metadata-pro" => "EXIF",
        "coreldraw-viewer" => "CORELDRAW",
        "code-config-studio" => "CODE",
        _ => "EXT",
    };

    let key_body = Uuid::new_v4().simple().to_string()[..8].to_uppercase();
    let payload = format!("{}:{}", extension_id, key_body);

    let mut mac = HmacSha256::new_from_slice(secret_key.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(payload.as_bytes());
    let sig = hex::encode(mac.finalize().into_bytes())[..8].to_uppercase();

    format!("KV-{}-{}-{}", tag, key_body, sig)
}

/// Verify a cryptographically signed license key against a secret
pub fn verify_signed_license_key(code: &str, secret_key: &str) -> Option<String> {
    let clean = code.trim().to_uppercase();
    let parts: Vec<&str> = clean.split('-').collect();
    if parts.len() != 4 || parts[0] != "KV" {
        return None;
    }

    let tag = parts[1];
    let key_body = parts[2];
    let signature = parts[3];

    if key_body.len() != 8 || signature.len() != 8 {
        return None;
    }

    let extension_id = match tag {
        "PRO" => crate::models::PRO_BUNDLE_ID,
        "CAD" => "cad-viewer",
        "ADOBE" | "PSD" => "adobe-suite-viewer",
        "FONT" => "font-viewer",
        "SYSVIS" => "sysvis-flow-viewer",
        "ARCHIVE" => "archive-inspector",
        "MARKDOWN" => "markdown-enhanced",
        "EXIF" => "exif-metadata-pro",
        "CORELDRAW" => "coreldraw-viewer",
        "CODE" => "code-config-studio",
        _ => return None,
    };

    let payload = format!("{}:{}", extension_id, key_body);
    let mut mac = match HmacSha256::new_from_slice(secret_key.as_bytes()) {
        Ok(m) => m,
        Err(_) => return None,
    };
    mac.update(payload.as_bytes());
    let expected_sig = hex::encode(mac.finalize().into_bytes())[..8].to_uppercase();

    if subtle_string_eq(signature, &expected_sig) {
        Some(extension_id.to_string())
    } else {
        None
    }
}

/// Verify license key against multiple candidate secrets
pub fn verify_license_against_secrets(code: &str, secrets: &[&str]) -> Option<String> {
    for secret in secrets {
        if let Some(ext_id) = verify_signed_license_key(code, secret) {
            return Some(ext_id);
        }
    }
    None
}

pub fn get_extension_price(ext_id: &str) -> i64 {
    match ext_id {
        crate::models::PRO_BUNDLE_ID => crate::models::PRO_BUNDLE_PRICE,
        "cad-viewer" => 99_000,
        "adobe-suite-viewer" | "psd-viewer" => 79_000,
        "font-viewer" => 39_000,
        "sysvis-flow-viewer" => 49_000,
        "archive-inspector" => 29_000,
        "markdown-enhanced" => 29_000,
        "exif-metadata-pro" => 29_000,
        "coreldraw-viewer" => 49_000,
        _ => crate::models::PRO_BUNDLE_PRICE,
    }
}

// -----------------------------------------------------------------------------
// ZaloPay v2 API Handlers
// -----------------------------------------------------------------------------

/// Create a ZaloPay v2 payment session (/v2/create)
pub async fn create_zalopay_payment(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Json(req): Json<CreatePaymentRequest>,
) -> Result<Json<CreatePaymentResponse>> {
    let extension_id = if req.extension_id.trim().is_empty() {
        crate::models::PRO_BUNDLE_ID
    } else {
        req.extension_id.trim()
    };

    // Check if user already owns this extension or Pro Pass
    if state.db.has_extension_license(&user.id, extension_id).await? {
        return Err(AppError::BadRequest("Extension or Pro Pass is already licensed for this user".into()));
    }

    let amount = get_extension_price(extension_id);
    let order_id = format!("KV-ORD-{}", Uuid::new_v4());
    let short_uuid = Uuid::new_v4().simple().to_string()[..12].to_string();
    let app_trans_id = generate_zalopay_trans_id(&short_uuid);
    let app_time = chrono::Utc::now().timestamp_millis();

    let cfg = get_zalopay_config_with_override(req.test_mode);

    let embed_data = serde_json::json!({
        "redirecturl": cfg.redirect_url,
        "order_id": order_id,
        "extension_id": extension_id,
    })
    .to_string();

    let item_name = if extension_id == crate::models::PRO_BUNDLE_ID {
        "KV Files: Lifetime Pro Pass (All Extensions)".to_string()
    } else {
        format!("KV Files Store: License for {}", extension_id)
    };

    let item = serde_json::json!([{
        "itemid": extension_id,
        "itemname": item_name,
        "itemprice": amount,
        "itemquantity": 1,
    }])
    .to_string();

    let description = format!("KV Files - Order {}", app_trans_id);

    // 1. Build signature MAC with Key1
    let mac = sign_zalopay_order_mac(
        cfg.app_id,
        &app_trans_id,
        &user.username,
        amount,
        app_time,
        &embed_data,
        &item,
        &cfg.key1,
    );

    // 2. Persist initial order in SQLite
    let now = chrono::Utc::now().to_rfc3339();
    let payment_method = if cfg.is_sandbox {
        "ZALOPAY_SANDBOX"
    } else {
        "ZALOPAY_PRODUCTION"
    };

    let order = ExtensionOrder {
        id: order_id.clone(),
        user_id: user.id.clone(),
        extension_id: extension_id.to_string(),
        amount,
        status: "PENDING".into(),
        gateway_trans_id: Some(app_trans_id.clone()),
        user_note: None,
        payment_method: Some(payment_method.into()),
        created_at: now.clone(),
        updated_at: now,
    };
    state.db.create_extension_order(&order).await?;

    // 3. Dispatch to official ZaloPay Gateway API (/v2/create) if configured
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| AppError::Internal(format!("Failed to build HTTP client: {}", e)))?;

    let zp_req = ZaloPayCreateOrderRequest {
        app_id: cfg.app_id,
        app_user: user.username.clone(),
        app_time,
        amount,
        app_trans_id: app_trans_id.clone(),
        embed_data,
        item,
        description,
        bank_code: "".into(),
        callback_url: cfg.callback_url.clone(),
        mac,
    };

    let zp_res = client.post(&cfg.create_endpoint).form(&zp_req).send().await;

    let order_suffix = &order_id[order_id.len().saturating_sub(8)..];
    let transfer_content = format!("KV FILE PRO {}", order_suffix);

    // Standardized VietQR image URL (scannable by all Vietnamese banking apps + ZaloPay + MoMo)
    let vietqr_url = reqwest::Url::parse_with_params(
        &format!("https://img.vietqr.io/image/{}-{}-compact2.png", cfg.bank_bin, cfg.account_no),
        &[
            ("amount", &amount.to_string()),
            ("addInfo", &transfer_content),
            ("accountName", &cfg.merchant_name),
        ],
    )
    .map(|u| u.to_string())
    .unwrap_or_else(|_| cfg.qr_image_url.clone());

    match zp_res {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                if let Ok(data) = resp.json::<ZaloPayCreateOrderResponse>().await {
                    if data.return_code == 1 {
                        let pay_url = data.order_url.unwrap_or_default();
                        // For banking apps and VietQR compatibility, prioritize standard VietQR or pre-rendered QR
                        let qr_code_url = if let Some(ref q) = data.qr_code {
                            if q.starts_with("http") || q.starts_with("data:") {
                                Some(q.clone())
                            } else if q.starts_with("000201") {
                                // EMVCo VietQR string from gateway
                                reqwest::Url::parse_with_params(
                                    "https://api.qrserver.com/v1/create-qr-code/",
                                    &[("size", "300x300"), ("data", q)],
                                )
                                .map(|u| u.to_string())
                                .ok()
                                .or_else(|| Some(vietqr_url.clone()))
                            } else {
                                Some(vietqr_url.clone())
                            }
                        } else if amount == crate::models::PRO_BUNDLE_PRICE && !cfg.qr_image_url.is_empty() {
                            Some(cfg.qr_image_url.clone())
                        } else {
                            Some(vietqr_url.clone())
                        };

                        return Ok(Json(CreatePaymentResponse {
                            order_id: order_id.clone(),
                            app_trans_id,
                            extension_id: extension_id.to_string(),
                            amount,
                            pay_url,
                            qr_code_url,
                            deeplink: None,
                            status: "PENDING".into(),
                            is_mock: false,
                            is_test_mode: cfg.is_sandbox,
                            bank_name: Some(cfg.bank_name.clone()),
                            bank_account: Some(cfg.account_no.clone()),
                            account_name: Some(cfg.merchant_name.clone()),
                            merchant_code: Some(cfg.merchant_code.clone()),
                            store_id: Some(cfg.store_id.clone()),
                            transfer_content: Some(transfer_content),
                        }));
                    } else {
                        let err_msg = format!(
                            "ZaloPay (return_code {}): {}",
                            data.return_code, data.return_message
                        );
                        tracing::warn!("ZaloPay Create Order response: {}", err_msg);
                    }
                }
            }
        }
        Err(e) => {
            tracing::warn!("Network error dispatching to ZaloPay Gateway: {}", e);
        }
    }

    // In production mode with ZaloPay POS Merchant VietQR:
    if !cfg.is_sandbox {
        let qr_code_url = if amount == crate::models::PRO_BUNDLE_PRICE && !cfg.qr_image_url.is_empty() {
            cfg.qr_image_url.clone()
        } else {
            vietqr_url.clone()
        };

        return Ok(Json(CreatePaymentResponse {
            order_id: order_id.clone(),
            app_trans_id,
            extension_id: extension_id.to_string(),
            amount,
            pay_url: qr_code_url.clone(),
            qr_code_url: Some(qr_code_url),
            deeplink: None,
            status: "PENDING".into(),
            is_mock: false,
            is_test_mode: false,
            bank_name: Some(cfg.bank_name.clone()),
            bank_account: Some(cfg.account_no.clone()),
            account_name: Some(cfg.merchant_name.clone()),
            merchant_code: Some(cfg.merchant_code.clone()),
            store_id: Some(cfg.store_id.clone()),
            transfer_content: Some(transfer_content),
        }));
    }

    // Fallback sandbox test session if remote sandbox unreachable
    let fallback_pay_url = format!("https://sb-openapi.zalopay.vn/v2/pay?app_trans_id={}", app_trans_id);
    let qr_code_url = if amount == crate::models::PRO_BUNDLE_PRICE && !cfg.qr_image_url.is_empty() {
        Some(cfg.qr_image_url.clone())
    } else {
        Some(vietqr_url)
    };

    Ok(Json(CreatePaymentResponse {
        order_id: order_id.clone(),
        app_trans_id,
        extension_id: extension_id.to_string(),
        amount,
        pay_url: fallback_pay_url,
        qr_code_url,
        deeplink: None,
        status: "PENDING".into(),
        is_mock: true,
        is_test_mode: cfg.is_sandbox,
        bank_name: Some(cfg.bank_name),
        bank_account: Some(cfg.account_no),
        account_name: Some(cfg.merchant_name),
        merchant_code: Some(cfg.merchant_code),
        store_id: Some(cfg.store_id),
        transfer_content: Some(transfer_content),
    }))
}

/// ZaloPay Server-to-Server Callback Webhook
/// Receives POST JSON: { "data": "...", "mac": "...", "type": 1 }
/// Authenticated via HMAC-SHA256(key2, data)
pub async fn zalopay_callback_webhook(
    State(state): State<AppState>,
    Json(payload): Json<ZaloPayCallbackRequest>,
) -> Json<ZaloPayCallbackResponse> {
    let cfg = get_zalopay_config();

    // 1. Verify incoming MAC using Key2
    let expected_mac = sign_zalopay_callback_mac(&payload.data, &cfg.key2);
    if !subtle_string_eq(&expected_mac, &payload.mac) {
        tracing::warn!(
            "ZaloPay callback MAC verification failed! Incoming: {}, Expected: {}",
            payload.mac,
            expected_mac
        );
        return Json(ZaloPayCallbackResponse {
            return_code: -1,
            return_message: "mac not equal".into(),
        });
    }

    // 2. Parse callback data JSON string
    let data: ZaloPayCallbackData = match serde_json::from_str(&payload.data) {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("Failed to parse ZaloPay callback data JSON: {}", e);
            return Json(ZaloPayCallbackResponse {
                return_code: 0,
                return_message: format!("json parse error: {}", e),
            });
        }
    };

    // 3. Find the pending order by app_trans_id
    let order_opt = match state.db.get_extension_order(&data.app_trans_id).await {
        Ok(opt) => opt,
        Err(e) => {
            tracing::error!("DB error looking up order by trans_id {}: {}", data.app_trans_id, e);
            return Json(ZaloPayCallbackResponse {
                return_code: 0,
                return_message: "database error".into(),
            });
        }
    };

    let order = match order_opt {
        Some(o) => o,
        None => {
            tracing::warn!("ZaloPay callback: order not found for trans_id {}", data.app_trans_id);
            return Json(ZaloPayCallbackResponse {
                return_code: 0,
                return_message: "order not found".into(),
            });
        }
    };

    // 4. Verify amount strictly
    if data.amount != order.amount {
        tracing::warn!(
            "ZaloPay callback amount mismatch for order {}: received {}, expected {}",
            order.id, data.amount, order.amount
        );
        return Json(ZaloPayCallbackResponse {
            return_code: 0,
            return_message: "amount mismatch".into(),
        });
    }

    // 5. Idempotency guard: if already PAID, return success immediately
    if order.status == "PAID" {
        return Json(ZaloPayCallbackResponse {
            return_code: 1,
            return_message: "success".into(),
        });
    }

    // 6. Mark order as PAID and issue cryptographic license
    let zp_trans_id_str = data
        .zp_trans_id
        .map(|t| t.to_string())
        .unwrap_or_else(|| data.app_trans_id.clone());

    let _ = state
        .db
        .update_order_status(&order.id, "PAID", Some(&zp_trans_id_str))
        .await;

    let signing_secret = state
        .db
        .get_or_create_license_signing_secret()
        .await
        .unwrap_or_else(|_| cfg.key1.clone());
    let license_key = generate_signed_license_key(&order.extension_id, &signing_secret);

    let license = ExtensionLicense {
        id: format!("LIC-{}", Uuid::new_v4()),
        user_id: order.user_id.clone(),
        extension_id: order.extension_id.clone(),
        order_id: order.id.clone(),
        license_key,
        purchased_at: chrono::Utc::now().to_rfc3339(),
    };

    if let Err(e) = state.db.grant_extension_license(&license).await {
        tracing::error!("Failed to grant license for ZaloPay order {}: {}", order.id, e);
    } else {
        tracing::info!(
            "ZaloPay License granted for extension '{}' to user '{}' (ZP Trans: {})",
            order.extension_id,
            order.user_id,
            zp_trans_id_str
        );
        // Real-time broadcast to all connected WebSocket clients
        let _ = state.tx.send(FsEvent {
            event_type: "extension_licensed".into(),
            root_name: order.extension_id.clone(),
            path: order.user_id.clone(),
            is_dir: false,
        });
    }

    Json(ZaloPayCallbackResponse {
        return_code: 1,
        return_message: "success".into(),
    })
}

/// Retrieve all purchased extension licenses for the current authenticated user
pub async fn get_user_licenses(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
) -> Result<Json<Vec<ExtensionLicense>>> {
    let licenses = state.db.get_user_extension_licenses(&user.id).await?;
    Ok(Json(licenses))
}

/// Query transaction status from ZaloPay v2 (/v2/query)
pub async fn query_zalopay_order_status(app_trans_id: &str) -> Option<ZaloPayQueryOrderResponse> {
    let cfg = get_zalopay_config();
    let mac = sign_zalopay_query_mac(cfg.app_id, app_trans_id, &cfg.key1);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .ok()?;

    let query_req = ZaloPayQueryOrderRequest {
        app_id: cfg.app_id,
        app_trans_id: app_trans_id.to_string(),
        mac,
    };

    let resp = client.post(&cfg.query_endpoint).form(&query_req).send().await.ok()?;
    if resp.status().is_success() {
        resp.json::<ZaloPayQueryOrderResponse>().await.ok()
    } else {
        None
    }
}

/// Poll status of a specific order with automatic ZaloPay Gateway real-time query
pub async fn check_order_status(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Path(order_id): Path<String>,
) -> Result<Json<OrderStatusResponse>> {
    let mut order = state
        .db
        .get_extension_order(&order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".into()))?;

    if order.user_id != user.id && user.role != "admin" {
        return Err(AppError::Forbidden("You do not have permission to view this order".into()));
    }

    // If order is PENDING, query ZaloPay in real-time to check if payment was completed
    if order.status == "PENDING" {
        if let Some(trans_id) = order.gateway_trans_id.as_deref() {
            if let Some(query_resp) = query_zalopay_order_status(trans_id).await {
                if query_resp.return_code == 1 {
                    // ZaloPay confirmed successful payment!
                    let zp_trans_str = query_resp
                        .zp_trans_id
                        .map(|t| t.to_string())
                        .unwrap_or_else(|| format!("ZP-VERIFIED-{}", chrono::Utc::now().timestamp_millis()));

                    let _ = state
                        .db
                        .update_order_status(&order.id, "PAID", Some(&zp_trans_str))
                        .await;

                    let signing_secret = state
                        .db
                        .get_or_create_license_signing_secret()
                        .await
                        .unwrap_or_else(|_| DEFAULT_LICENSE_SECRET.to_string());
                    let license_key = generate_signed_license_key(&order.extension_id, &signing_secret);

                    let license = ExtensionLicense {
                        id: format!("LIC-{}", Uuid::new_v4()),
                        user_id: order.user_id.clone(),
                        extension_id: order.extension_id.clone(),
                        order_id: order.id.clone(),
                        license_key: license_key.clone(),
                        purchased_at: chrono::Utc::now().to_rfc3339(),
                    };

                    if let Err(e) = state.db.grant_extension_license(&license).await {
                        tracing::error!("Failed to grant license for order {}: {}", order.id, e);
                    } else {
                        tracing::info!(
                            "License granted via ZaloPay query verification for extension '{}' to user '{}'",
                            order.extension_id,
                            order.user_id
                        );
                        let _ = state.tx.send(FsEvent {
                            event_type: "extension_licensed".into(),
                            root_name: order.extension_id.clone(),
                            path: order.user_id.clone(),
                            is_dir: false,
                        });
                    }

                    if let Ok(Some(refreshed)) = state.db.get_extension_order(&order_id).await {
                        order = refreshed;
                    }
                } else if query_resp.return_code == 2 {
                    // Transaction failed
                    let _ = state.db.update_order_status(&order.id, "FAILED", None).await;
                    if let Ok(Some(refreshed)) = state.db.get_extension_order(&order_id).await {
                        order = refreshed;
                    }
                }
            }
        }
    }

    let license_key = if order.status == "PAID" {
        state
            .db
            .get_license_by_order_id(&order_id)
            .await?
            .map(|l| l.license_key)
    } else {
        None
    };

    Ok(Json(OrderStatusResponse {
        order,
        license_key,
    }))
}

/// Submit buyer's proof of manual / personal transfer (transitions status to AWAITING_VERIFICATION)
pub async fn submit_transfer_details(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Path(order_id): Path<String>,
    Json(payload): Json<SubmitTransferRequest>,
) -> Result<Json<OrderStatusResponse>> {
    let order = state
        .db
        .get_extension_order(&order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".into()))?;

    if order.user_id != user.id && user.role != "admin" {
        return Err(AppError::Forbidden("Order does not belong to user".into()));
    }

    if order.status == "PAID" {
        let license_key = state
            .db
            .get_license_by_order_id(&order_id)
            .await?
            .map(|l| l.license_key);
        return Ok(Json(OrderStatusResponse {
            order,
            license_key,
        }));
    }

    if order.status != "PENDING" && order.status != "AWAITING_VERIFICATION" {
        return Err(AppError::BadRequest(format!(
            "Cannot submit transfer for order in '{}' status",
            order.status
        )));
    }

    state
        .db
        .update_order_awaiting_verification(
            &order.id,
            payload.note.as_deref(),
            payload.trans_id.as_deref(),
        )
        .await?;

    let updated = state
        .db
        .get_extension_order(&order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".into()))?;

    tracing::info!(
        "Order '{}' transitioned to AWAITING_VERIFICATION by user '{}'",
        order_id,
        user.id
    );

    Ok(Json(OrderStatusResponse {
        order: updated,
        license_key: None,
    }))
}

/// Cancel an order if pending or awaiting verification
pub async fn cancel_order(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Path(order_id): Path<String>,
) -> Result<Json<OrderStatusResponse>> {
    let order = state
        .db
        .get_extension_order(&order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".into()))?;

    if order.user_id != user.id && user.role != "admin" {
        return Err(AppError::Forbidden("You do not have permission to cancel this order".into()));
    }

    if order.status == "PAID" {
        return Err(AppError::BadRequest("Cannot cancel an already completed and paid order".into()));
    }

    state.db.update_order_status(&order.id, "CANCELLED", None).await?;

    let updated = state
        .db
        .get_extension_order(&order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".into()))?;

    Ok(Json(OrderStatusResponse {
        order: updated,
        license_key: None,
    }))
}

/// Admin endpoint: List all orders with filtering and pagination
pub async fn admin_list_orders(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Query(query): Query<AdminOrdersQuery>,
) -> Result<Json<AdminOrdersListResponse>> {
    if user.role != "admin" {
        return Err(AppError::Forbidden("Admin authorization required".into()));
    }

    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0);
    let (orders, total) = state
        .db
        .list_extension_orders(query.status.as_deref(), limit, offset)
        .await?;

    Ok(Json(AdminOrdersListResponse { orders, total }))
}

/// Admin endpoint: Approve a manual transfer order, mark as PAID, and issue signed license
pub async fn admin_approve_order(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Path(order_id): Path<String>,
    Json(payload): Json<AdminOrderActionRequest>,
) -> Result<Json<OrderStatusResponse>> {
    if user.role != "admin" {
        return Err(AppError::Forbidden("Admin authorization required".into()));
    }

    let order = state
        .db
        .get_extension_order(&order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".into()))?;

    if order.status == "PAID" {
        let license_key = state
            .db
            .get_license_by_order_id(&order_id)
            .await?
            .map(|l| l.license_key);
        return Ok(Json(OrderStatusResponse {
            order,
            license_key,
        }));
    }

    let trans_id = format!("ADMIN-CONFIRM-{}", chrono::Utc::now().timestamp_millis());
    let gateway_trans_id = order.gateway_trans_id.as_deref().unwrap_or(&trans_id);

    state
        .db
        .update_order_status(&order.id, "PAID", Some(gateway_trans_id))
        .await?;

    let signing_secret = state
        .db
        .get_or_create_license_signing_secret()
        .await
        .unwrap_or_else(|_| DEFAULT_LICENSE_SECRET.to_string());
    let license_key = generate_signed_license_key(&order.extension_id, &signing_secret);

    let license = ExtensionLicense {
        id: format!("LIC-{}", Uuid::new_v4()),
        user_id: order.user_id.clone(),
        extension_id: order.extension_id.clone(),
        order_id: order.id.clone(),
        license_key: license_key.clone(),
        purchased_at: chrono::Utc::now().to_rfc3339(),
    };

    state.db.grant_extension_license(&license).await?;

    tracing::info!(
        "Admin '{}' approved order '{}' for extension '{}' (user: '{}', note: {:?})",
        user.username,
        order.id,
        order.extension_id,
        order.user_id,
        payload.note
    );

    // Broadcast event via WebSocket to immediately notify buyer in real-time
    let _ = state.tx.send(FsEvent {
        event_type: "extension_licensed".into(),
        root_name: order.extension_id.clone(),
        path: order.user_id.clone(),
        is_dir: false,
    });

    let updated = state
        .db
        .get_extension_order(&order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".into()))?;

    Ok(Json(OrderStatusResponse {
        order: updated,
        license_key: Some(license_key),
    }))
}

/// Admin endpoint: Reject a manual transfer order
pub async fn admin_reject_order(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Path(order_id): Path<String>,
    Json(payload): Json<AdminOrderActionRequest>,
) -> Result<Json<OrderStatusResponse>> {
    if user.role != "admin" {
        return Err(AppError::Forbidden("Admin authorization required".into()));
    }

    let order = state
        .db
        .get_extension_order(&order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".into()))?;

    if order.status == "PAID" {
        return Err(AppError::BadRequest("Cannot reject an already paid order".into()));
    }

    state.db.update_order_status(&order.id, "FAILED", None).await?;

    tracing::info!(
        "Admin '{}' rejected order '{}' (note: {:?})",
        user.username,
        order.id,
        payload.note
    );

    let updated = state
        .db
        .get_extension_order(&order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".into()))?;

    Ok(Json(OrderStatusResponse {
        order: updated,
        license_key: None,
    }))
}

/// Development simulator: Instantly complete a pending order for testing.
pub async fn dev_simulate_payment(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Path(order_id): Path<String>,
) -> Result<Json<OrderStatusResponse>> {
    let cfg = get_zalopay_config();
    let dev_enabled = std::env::var("KV_ENABLE_DEV_PAYMENT")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);
    let order = state
        .db
        .get_extension_order(&order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".into()))?;

    let is_test_order = cfg.is_sandbox
        || order
            .payment_method
            .as_deref()
            .map(|m| m.contains("SANDBOX") || m.ends_with("_TEST"))
            .unwrap_or(false);

    if !is_test_order && !dev_enabled {
        return Err(AppError::Forbidden(
            "Payment simulation is strictly disabled for live production orders.".into(),
        ));
    }

    let is_debug = cfg!(debug_assertions);
    if user.role != "admin" && !dev_enabled && !is_debug && !is_test_order {
        return Err(AppError::Forbidden(
            "Developer payment simulator requires admin permissions, sandbox mode, or KV_ENABLE_DEV_PAYMENT=true.".into(),
        ));
    }

    if order.status == "PAID" {
        let license_key = state
            .db
            .get_license_by_order_id(&order_id)
            .await?
            .map(|l| l.license_key);
        return Ok(Json(OrderStatusResponse {
            order,
            license_key,
        }));
    }

    let fake_trans_id = format!("SIM-ZP-{}", chrono::Utc::now().timestamp_millis());
    state
        .db
        .update_order_status(&order.id, "PAID", Some(&fake_trans_id))
        .await?;

    let signing_secret = state
        .db
        .get_or_create_license_signing_secret()
        .await
        .unwrap_or_else(|_| DEFAULT_LICENSE_SECRET.to_string());
    let license_key = generate_signed_license_key(&order.extension_id, &signing_secret);

    let license = ExtensionLicense {
        id: format!("LIC-{}", Uuid::new_v4()),
        user_id: user.id.clone(),
        extension_id: order.extension_id.clone(),
        order_id: order.id.clone(),
        license_key: license_key.clone(),
        purchased_at: chrono::Utc::now().to_rfc3339(),
    };

    state.db.grant_extension_license(&license).await?;

    // Broadcast event via WebSocket
    let _ = state.tx.send(FsEvent {
        event_type: "extension_licensed".into(),
        root_name: order.extension_id.clone(),
        path: user.id.clone(),
        is_dir: false,
    });

    let updated = state
        .db
        .get_extension_order(&order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".into()))?;

    Ok(Json(OrderStatusResponse {
        order: updated,
        license_key: Some(license_key),
    }))
}

/// Activate lifetime license using a code (Signed key, ZaloPay transId, or Order ID)
pub async fn activate_license_code(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Json(payload): Json<ActivateLicenseRequest>,
) -> Result<Json<ActivateLicenseResponse>> {
    let license = state
        .db
        .activate_extension_license_for_user(&user.id, &payload.code)
        .await?;

    // Broadcast event via WebSocket
    let _ = state.tx.send(FsEvent {
        event_type: "extension_licensed".into(),
        root_name: license.extension_id.clone(),
        path: user.id.clone(),
        is_dir: false,
    });

    Ok(Json(ActivateLicenseResponse {
        success: true,
        extension_id: license.extension_id,
        license_key: license.license_key,
        message: "Lifetime extension license activated successfully!".into(),
    }))
}
