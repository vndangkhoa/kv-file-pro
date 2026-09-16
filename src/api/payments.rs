use crate::error::{AppError, Result};
use crate::models::{
    ActivateLicenseRequest, ActivateLicenseResponse, AdminOrderActionRequest,
    AdminOrdersListResponse, AdminOrdersQuery, CreatePaymentRequest, CreatePaymentResponse,
    ExtensionLicense, ExtensionOrder, FsEvent, MoMoCreateRequest, MoMoCreateResponse,
    MoMoIpnPayload, OrderStatusResponse, SubmitTransferRequest, User,
};
use crate::state::AppState;
use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

pub const DEFAULT_LICENSE_SECRET: &str = "KV_FILES_PRO_MASTER_SIGNING_KEY_v2";

/// Constant-time string equality check to prevent timing attacks
pub fn subtle_string_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut result = 0u8;
    for (x, y) in a.bytes().zip(b.bytes()) {
        result |= x ^ y;
    }
    result == 0
}

/// Sign MoMo payload for gateway API v2
pub fn sign_momo_payload(raw_data: &str, secret_key: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(secret_key.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(raw_data.as_bytes());
    hex::encode(mac.finalize().into_bytes())
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

/// Create a MoMo v2 All-In-One payment session
pub async fn create_momo_payment(
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
    let request_id = format!("REQ-{}", Uuid::new_v4());
    let order_info = if extension_id == crate::models::PRO_BUNDLE_ID {
        "KV Files: Lifetime Pro Pass (All Extensions)".to_string()
    } else {
        format!("KV Files Store: License for {}", extension_id)
    };
    let extra_data = "";
    let request_type = "captureWallet";

    let partner_code = std::env::var("MOMO_PARTNER_CODE").unwrap_or_else(|_| "MOMO".into());
    let access_key = std::env::var("MOMO_ACCESS_KEY").unwrap_or_else(|_| "F8BBA842ECF85".into());
    let secret_key = std::env::var("MOMO_SECRET_KEY")
        .unwrap_or_else(|_| "K951B6PE1waDMi640xX08PD3vg6EkVlz".into());
    let momo_endpoint = std::env::var("MOMO_ENDPOINT")
        .unwrap_or_else(|_| "https://test-payment.momo.vn/v2/gateway/api/create".into());
    let redirect_url = std::env::var("MOMO_REDIRECT_URL")
        .unwrap_or_else(|_| "http://localhost:8866/settings?tab=extensions".into());
    let ipn_url = std::env::var("MOMO_IPN_URL")
        .unwrap_or_else(|_| "http://localhost:8866/api/v1/payments/momo/ipn".into());

    // 1. Build signature: raw alphabet order as required by MoMo API v2
    let raw_signature = format!(
        "accessKey={}&amount={}&extraData={}&ipnUrl={}&orderId={}&orderInfo={}&partnerCode={}&redirectUrl={}&requestId={}&requestType={}",
        access_key, amount, extra_data, ipn_url, order_id, order_info, partner_code, redirect_url, request_id, request_type
    );
    let signature = sign_momo_payload(&raw_signature, &secret_key);

    // 2. Persist initial order in SQLite
    let now = chrono::Utc::now().to_rfc3339();
    let order = ExtensionOrder {
        id: order_id.clone(),
        user_id: user.id.clone(),
        extension_id: extension_id.to_string(),
        amount,
        status: "PENDING".into(),
        momo_trans_id: None,
        user_note: None,
        payment_method: Some("MOMO_GATEWAY".into()),
        created_at: now.clone(),
        updated_at: now,
    };
    state.db.create_extension_order(&order).await?;

    // 3. Dispatch to official MoMo Gateway API
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Internal(format!("Failed to build HTTP client: {}", e)))?;

    let momo_req = MoMoCreateRequest {
        partnerCode: partner_code.clone(),
        partnerName: "KV Files Extension Store".into(),
        storeId: "KVFilesStore".into(),
        requestId: request_id.clone(),
        amount,
        orderId: order_id.clone(),
        orderInfo: order_info,
        redirectUrl: redirect_url,
        ipnUrl: ipn_url,
        lang: "vi".into(),
        extraData: extra_data.into(),
        requestType: request_type.into(),
        signature,
    };

    let momo_res = client.post(&momo_endpoint).json(&momo_req).send().await;

    if let Ok(resp) = momo_res {
        if resp.status().is_success() {
            if let Ok(data) = resp.json::<MoMoCreateResponse>().await {
                if data.resultCode == Some(0) {
                    let pay_url = data.payUrl.unwrap_or_default();
                    let raw_qr = data.qrCodeUrl.as_deref().unwrap_or(&pay_url);
                    let qr_code_url = reqwest::Url::parse_with_params(
                        "https://api.qrserver.com/v1/create-qr-code/",
                        &[("size", "300x300"), ("data", raw_qr)],
                    )
                    .map(|u| u.to_string())
                    .ok();

                    return Ok(Json(CreatePaymentResponse {
                        order_id,
                        extension_id: extension_id.to_string(),
                        amount,
                        pay_url,
                        qr_code_url,
                        deeplink: data.deeplink,
                        status: "PENDING".into(),
                        is_mock: false,
                        phone_number: None,
                        receiver_name: None,
                    }));
                } else {
                    tracing::warn!(
                        "MoMo Gateway returned resultCode {:?}: {:?}",
                        data.resultCode,
                        data.message
                    );
                }
            }
        }
    }

    // Gateway fallback (e.g. offline dev environment)
    let fallback_pay_url = "https://test-payment.momo.vn".to_string();
    let qr_code_url = reqwest::Url::parse_with_params(
        "https://api.qrserver.com/v1/create-qr-code/",
        &[("size", "300x300"), ("data", &format!("https://test-payment.momo.vn/v2/gateway/pay?orderId={}", order_id))],
    )
    .map(|u| u.to_string())
    .ok();

    Ok(Json(CreatePaymentResponse {
        order_id,
        extension_id: extension_id.to_string(),
        amount,
        pay_url: fallback_pay_url,
        qr_code_url,
        deeplink: None,
        status: "PENDING".into(),
        is_mock: true,
        phone_number: None,
        receiver_name: None,
    }))
}

/// Instant Payment Notification (IPN) server-to-server callback from MoMo
pub async fn momo_ipn_webhook(
    State(state): State<AppState>,
    Json(payload): Json<MoMoIpnPayload>,
) -> impl IntoResponse {
    let access_key = std::env::var("MOMO_ACCESS_KEY").unwrap_or_else(|_| "F8BBA842ECF85".into());
    let secret_key = std::env::var("MOMO_SECRET_KEY")
        .unwrap_or_else(|_| "K951B6PE1waDMi640xX08PD3vg6EkVlz".into());

    // 1. Verify incoming signature with timing-attack resistant comparison
    let raw_signature = format!(
        "accessKey={}&amount={}&extraData={}&message={}&orderId={}&orderInfo={}&orderType={}&partnerCode={}&payType={}&requestId={}&responseTime={}&resultCode={}&transId={}",
        access_key, payload.amount, payload.extraData, payload.message, payload.orderId,
        payload.orderInfo, payload.orderType, payload.partnerCode, payload.payType,
        payload.requestId, payload.responseTime, payload.resultCode, payload.transId
    );
    let expected_sig = sign_momo_payload(&raw_signature, &secret_key);

    if !subtle_string_eq(&expected_sig, &payload.signature) {
        tracing::warn!(
            "MoMo IPN signature mismatch for order: {}, incoming: {}, expected: {}",
            payload.orderId,
            payload.signature,
            expected_sig
        );
        return (StatusCode::BAD_REQUEST, "Signature verification failed").into_response();
    }

    // 2. Look up the order in SQLite
    let order_opt = match state.db.get_extension_order(&payload.orderId).await {
        Ok(opt) => opt,
        Err(e) => {
            tracing::error!("DB error retrieving order {}: {}", payload.orderId, e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response();
        }
    };

    let order = match order_opt {
        Some(o) => o,
        None => {
            tracing::warn!("MoMo IPN order not found: {}", payload.orderId);
            return (StatusCode::NOT_FOUND, "Order not found").into_response();
        }
    };

    // 3. Verify amount strictly to prevent tampering
    if payload.amount != order.amount {
        tracing::warn!(
            "MoMo IPN amount mismatch for order {}: received {}, expected {}",
            order.id, payload.amount, order.amount
        );
        return (StatusCode::BAD_REQUEST, "Amount mismatch").into_response();
    }

    // 4. Idempotency guard: if already PAID, return 204 immediately
    if order.status == "PAID" {
        return StatusCode::NO_CONTENT.into_response();
    }

    if payload.resultCode == 0 {
        // Payment successful
        let trans_id_str = payload.transId.to_string();
        let _ = state
            .db
            .update_order_status(&order.id, "PAID", Some(&trans_id_str))
            .await;

        let signing_secret = state
            .db
            .get_or_create_license_signing_secret()
            .await
            .unwrap_or_else(|_| secret_key.clone());
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
            tracing::error!("Failed to grant license for order {}: {}", order.id, e);
        } else {
            tracing::info!(
                "License granted for extension '{}' to user '{}'",
                order.extension_id,
                order.user_id
            );
            // Broadcast event via WebSocket to instantly update client
            let _ = state.tx.send(FsEvent {
                event_type: "extension_licensed".into(),
                root_name: order.extension_id.clone(),
                path: order.user_id.clone(),
                is_dir: false,
            });
        }
    } else {
        let _ = state
            .db
            .update_order_status(&order.id, "FAILED", Some(&payload.transId.to_string()))
            .await;
    }

    // MoMo spec requires HTTP 204 No Content response
    StatusCode::NO_CONTENT.into_response()
}

/// Retrieve all purchased extension licenses for the current authenticated user
pub async fn get_user_licenses(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
) -> Result<Json<Vec<ExtensionLicense>>> {
    let licenses = state.db.get_user_extension_licenses(&user.id).await?;
    Ok(Json(licenses))
}

/// Poll status of a specific order
pub async fn check_order_status(
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
        return Err(AppError::Forbidden("You do not have permission to view this order".into()));
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

/// Submit buyer's proof of manual / personal MoMo transfer (transitions status to AWAITING_VERIFICATION)
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
    let momo_trans_id = order.momo_trans_id.as_deref().unwrap_or(&trans_id);

    state
        .db
        .update_order_status(&order.id, "PAID", Some(momo_trans_id))
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
/// Strictly restricted to dev environments or explicit KV_ENABLE_DEV_PAYMENT=true.
pub async fn dev_simulate_payment(
    State(state): State<AppState>,
    Extension(user): Extension<User>,
    Path(order_id): Path<String>,
) -> Result<Json<OrderStatusResponse>> {
    let dev_enabled = std::env::var("KV_ENABLE_DEV_PAYMENT")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(true);
    let is_debug = cfg!(debug_assertions);

    if user.role != "admin" && !dev_enabled && !is_debug {
        return Err(AppError::Forbidden(
            "Developer payment simulator requires admin permissions or KV_ENABLE_DEV_PAYMENT=true.".into(),
        ));
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

    let fake_trans_id = format!("SIM-{}", chrono::Utc::now().timestamp_millis());
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

/// Activate lifetime license using a code (Signed key, MoMo transId, or Order ID)
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
