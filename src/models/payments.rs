use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionOrder {
    pub id: String,
    pub user_id: String,
    pub extension_id: String,
    pub amount: i64,
    pub status: String,
    #[serde(alias = "momo_trans_id", alias = "zp_trans_id")]
    pub gateway_trans_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_note: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payment_method: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl ExtensionOrder {
    #[allow(dead_code)]
    pub fn trans_id(&self) -> Option<&str> {
        self.gateway_trans_id.as_deref()
    }
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
    #[serde(default)]
    pub test_mode: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreatePaymentResponse {
    pub order_id: String,
    pub app_trans_id: String,
    pub extension_id: String,
    pub amount: i64,
    pub pay_url: String,
    pub qr_code_url: Option<String>,
    pub deeplink: Option<String>,
    pub status: String,
    pub is_mock: bool,
    #[serde(default)]
    pub is_test_mode: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bank_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bank_account: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub merchant_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub store_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transfer_content: Option<String>,
}

// -----------------------------------------------------------------------------
// ZaloPay API v2 DTOs (https://developers.zalopay.vn/v2/)
// -----------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZaloPayCreateOrderRequest {
    pub app_id: u32,
    pub app_user: String,
    pub app_time: i64,
    pub amount: i64,
    pub app_trans_id: String,
    pub embed_data: String,
    pub item: String,
    pub description: String,
    pub bank_code: String,
    pub callback_url: String,
    pub mac: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZaloPayCreateOrderResponse {
    pub return_code: i32,
    pub return_message: String,
    pub sub_return_code: Option<i32>,
    pub sub_return_message: Option<String>,
    pub order_url: Option<String>,
    pub zp_trans_token: Option<String>,
    pub order_token: Option<String>,
    pub qr_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZaloPayCallbackRequest {
    pub data: String,
    pub mac: String,
    #[serde(rename = "type")]
    pub callback_type: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZaloPayCallbackData {
    pub app_id: Option<u32>,
    pub app_trans_id: String,
    pub app_time: Option<i64>,
    pub app_user: Option<String>,
    pub amount: i64,
    pub embed_data: Option<String>,
    pub item: Option<String>,
    pub zp_trans_id: Option<i64>,
    pub server_time: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZaloPayCallbackResponse {
    pub return_code: i32,
    pub return_message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZaloPayQueryOrderRequest {
    pub app_id: u32,
    pub app_trans_id: String,
    pub mac: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZaloPayQueryOrderResponse {
    pub return_code: i32,
    pub return_message: String,
    pub sub_return_code: Option<i32>,
    pub sub_return_message: Option<String>,
    pub is_processing: Option<bool>,
    pub amount: Option<i64>,
    pub zp_trans_id: Option<i64>,
    pub server_time: Option<i64>,
}

// -----------------------------------------------------------------------------
// Common License & Order Administration DTOs
// -----------------------------------------------------------------------------

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


