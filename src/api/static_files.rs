use axum::{
    body::Body,
    http::{header, StatusCode, Uri},
    response::IntoResponse,
};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "web/dist/"]
struct Assets;

pub async fn static_handler(uri: Uri) -> impl IntoResponse {
    let raw_path = uri.path().trim_start_matches('/');
    // Normalize consecutive slashes e.g. wasm//libredwg-web.wasm -> wasm/libredwg-web.wasm
    let normalized_path: String = raw_path
        .split('/')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("/");

    let target_path = match normalized_path.as_str() {
        "landing" => "landing.html",
        "docs" | "docs/" => "docs/index.html",
        _ => normalized_path.as_str(),
    };

    // Check if the requested file exists on disk in web/dist/ (allows live frontend updates without binary recompilation)
    let disk_file = std::path::Path::new("web/dist").join(target_path);
    if disk_file.is_file() {
        if let Ok(bytes) = tokio::fs::read(&disk_file).await {
            let mime = mime_guess::from_path(&disk_file).first_or_octet_stream();
            return (
                StatusCode::OK,
                [(header::CONTENT_TYPE, mime.as_ref())],
                Body::from(bytes),
            )
                .into_response();
        }
    }

    // Check if the requested file exists in embedded assets
    if let Some(content) = Assets::get(target_path) {
        let mime = mime_guess::from_path(target_path).first_or_octet_stream();
        return (
            StatusCode::OK,
            [(header::CONTENT_TYPE, mime.as_ref())],
            Body::from(content.data),
        )
            .into_response();
    }

    // Directory index fallback (e.g. /docs/docs/api -> /docs/docs/api/index.html)
    let dir_index = format!("{}/index.html", target_path.trim_end_matches('/'));
    let disk_dir_index = std::path::Path::new("web/dist").join(&dir_index);
    if disk_dir_index.is_file() {
        if let Ok(bytes) = tokio::fs::read(&disk_dir_index).await {
            return (
                StatusCode::OK,
                [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
                Body::from(bytes),
            )
                .into_response();
        }
    }
    if let Some(content) = Assets::get(&dir_index) {
        return (
            StatusCode::OK,
            [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
            Body::from(content.data),
        )
            .into_response();
    }

    // SPA fallback: Return index.html for client-side routing
    let disk_spa_index = std::path::Path::new("web/dist/index.html");
    if disk_spa_index.is_file() {
        if let Ok(bytes) = tokio::fs::read(disk_spa_index).await {
            return (
                StatusCode::OK,
                [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
                Body::from(bytes),
            )
                .into_response();
        }
    }
    if let Some(index) = Assets::get("index.html") {
        return (
            StatusCode::OK,
            [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
            Body::from(index.data),
        )
            .into_response();
    }

    // If web/dist is not built yet (in early dev)
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        Body::from(
            "<!DOCTYPE html><html><head><title>KV Files</title></head><body><h1>KV Files Backend is Running</h1><p>Run <code>cd web && npm run build</code> to compile the frontend assets.</p></body></html>",
        ),
    )
        .into_response()
}
