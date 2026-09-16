use crate::api::auth::extract_token;
use crate::error::{AppError, Result};
use crate::state::AppState;
use axum::{
    extract::State,
    http::HeaderMap,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::collections::HashMap;

pub async fn get_settings(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<HashMap<String, String>>> {
    let token = extract_token(&headers)
        .ok_or_else(|| AppError::Unauthorized("Not authenticated".to_string()))?;
    let _user = state
        .get_session_user(&token)
        .await
        .ok_or_else(|| AppError::Unauthorized("Session expired".to_string()))?;

    let settings = state.db.get_all_settings().await?;
    Ok(Json(settings))
}

pub async fn update_settings(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(updates): Json<HashMap<String, String>>,
) -> Result<Response> {
    let token = extract_token(&headers)
        .ok_or_else(|| AppError::Unauthorized("Not authenticated".to_string()))?;
    let user = state
        .get_session_user(&token)
        .await
        .ok_or_else(|| AppError::Unauthorized("Session expired".to_string()))?;

    if user.role != "admin" {
        return Err(AppError::Forbidden(
            "Only administrators can update system settings".to_string(),
        ));
    }

    for (k, v) in updates {
        state.db.set_setting(&k, &v).await?;
    }

    Ok(Json(json!({ "success": true, "message": "Settings saved" })).into_response())
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SystemEditionResponse {
    pub edition: String,
    pub name: String,
    pub version: String,
    pub is_licensed: bool,
    pub license_tier: Option<String>,
    pub license_id: Option<String>,
    pub customer_email: Option<String>,
    pub is_lifetime: bool,
    pub expires_at: Option<i64>,
    pub features: Vec<String>,
}

pub async fn get_system_edition(
    State(state): State<AppState>,
) -> Result<Json<SystemEditionResponse>> {
    let pro_license = state.db.get_system_pro_license().await?;
    let (is_licensed, tier, lic_id, email, is_lifetime, expires_at, features) = match pro_license {
        Some(lic) => {
            let is_active = lic.is_active();
            let is_lifetime = lic.is_lifetime();
            let expires_at = lic.expires_at;
            let tier = Some(lic.tier);
            let lic_id = Some(lic.id);
            let email = lic.customer_email;
            let features = lic.features;
            (
                is_active,
                tier,
                lic_id,
                email,
                is_lifetime,
                expires_at,
                features,
            )
        }
        None => (
            false,
            None,
            None,
            None,
            false,
            None,
            vec!["core".into(), "explorer".into(), "shares".into()],
        ),
    };

    Ok(Json(SystemEditionResponse {
        edition: "PRO".to_string(),
        name: "KV Files PRO".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        is_licensed,
        license_tier: tier,
        license_id: lic_id,
        customer_email: email,
        is_lifetime,
        expires_at,
        features,
    }))
}
