use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionOrder {
    pub id: String,
    pub user_id: String,
    pub extension_id: String,
    pub amount: i64,
    pub status: String,
    pub momo_trans_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_note: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payment_method: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionLicense {
    pub id: String,
    pub user_id: String,
    pub extension_id: String,
    pub order_id: String,
    pub license_key: String,
    pub purchased_at: String,
}

pub const PRO_BUNDLE_ID: &str = "kv-files-pro-all";
pub const PRO_BUNDLE_PRICE: i64 = 199_000;

fn default_bundle_id() -> String {
    PRO_BUNDLE_ID.to_string()
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePaymentRequest {
    #[serde(default = "default_bundle_id")]
    pub extension_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreatePaymentResponse {
    pub order_id: String,
    pub extension_id: String,
    pub amount: i64,
    pub pay_url: String,
    pub qr_code_url: Option<String>,
    pub deeplink: Option<String>,
    pub status: String,
    pub is_mock: bool,
    pub phone_number: Option<String>,
    pub receiver_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct MoMoCreateRequest {
    pub partnerCode: String,
    pub partnerName: String,
    pub storeId: String,
    pub requestId: String,
    pub amount: i64,
    pub orderId: String,
    pub orderInfo: String,
    pub redirectUrl: String,
    pub ipnUrl: String,
    pub lang: String,
    pub extraData: String,
    pub requestType: String,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct MoMoCreateResponse {
    pub partnerCode: Option<String>,
    pub orderId: Option<String>,
    pub requestId: Option<String>,
    pub amount: Option<i64>,
    pub responseTime: Option<i64>,
    pub message: Option<String>,
    pub resultCode: Option<i32>,
    pub payUrl: Option<String>,
    pub deeplink: Option<String>,
    pub qrCodeUrl: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct MoMoIpnPayload {
    pub partnerCode: String,
    pub orderId: String,
    pub requestId: String,
    pub amount: i64,
    pub orderInfo: String,
    pub orderType: String,
    pub transId: i64,
    pub resultCode: i32,
    pub message: String,
    pub payType: String,
    pub responseTime: i64,
    pub extraData: String,
    pub signature: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ActivateLicenseRequest {
    pub code: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ActivateLicenseResponse {
    pub success: bool,
    pub extension_id: String,
    pub license_key: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct OrderStatusResponse {
    #[serde(flatten)]
    pub order: ExtensionOrder,
    pub license_key: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SubmitTransferRequest {
    pub trans_id: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminOrderActionRequest {
    pub note: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdminOrdersQuery {
    pub status: Option<String>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AdminOrdersListResponse {
    pub orders: Vec<ExtensionOrder>,
    pub total: usize,
}


