use crate::error::{AppError, Result};
use crate::state::AppState;
use axum::{
    extract::{Multipart, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Deserialize;
use serde_json::json;
use tokio::io::AsyncWriteExt;

#[derive(Deserialize, Default)]
pub struct UploadParams {
    pub root: Option<String>,
    pub path: Option<String>,
}

pub async fn upload_file(
    State(state): State<AppState>,
    Query(params): Query<UploadParams>,
    mut multipart: Multipart,
) -> Result<Response> {
    let mut root_name = params
        .root
        .filter(|r| !r.trim().is_empty())
        .unwrap_or_else(|| state.roots.get_first_root_name());
    let mut dest_path = params.path.unwrap_or_default();
    let mut uploaded_files = Vec::new();

    while let Some(mut field) = multipart
        .next_field()
        .await
        .map_err(|e| {
            tracing::error!("Multipart parse error: {}", e);
            AppError::BadRequest(format!("Multipart parse error: {}", e))
        })?
    {
        let name = field.name().unwrap_or("").to_string();

        if name == "root" {
            if let Ok(text) = field.text().await {
                if !text.trim().is_empty() {
                    root_name = text.trim().to_string();
                }
            }
        } else if name == "path" {
            if let Ok(text) = field.text().await {
                dest_path = text.trim().to_string();
            }
        } else if name == "file" || field.file_name().is_some() {
            let file_name = field
                .file_name()
                .map(|f| f.to_string())
                .unwrap_or_else(|| format!("upload_{}", uuid::Uuid::new_v4()));

            // Sanitize filename to prevent path injection
            let clean_name = std::path::Path::new(&file_name)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unnamed_file");

            let target_rel = if dest_path.is_empty() {
                clean_name.to_string()
            } else {
                format!("{}/{}", dest_path.trim_matches('/'), clean_name)
            };

            let abs_path = state.roots.resolve_safe(&root_name, &target_rel)?;

            // Ensure parent directory exists
            if let Some(parent) = abs_path.parent() {
                if !parent.exists() {
                    tokio::fs::create_dir_all(parent).await?;
                }
            }

            let mut out_file = tokio::fs::File::create(&abs_path).await?;
            let mut total_bytes = 0u64;
            let mut write_err = None;

            loop {
                let chunk_res = field.chunk().await;
                match chunk_res {
                    Ok(Some(chunk)) => {
                        if let Err(e) = out_file.write_all(&chunk).await {
                            tracing::error!("Failed writing file chunk to '{}': {}", abs_path.display(), e);
                            write_err = Some(AppError::Io(e));
                            break;
                        }
                        total_bytes += chunk.len() as u64;
                    }
                    Ok(None) => break,
                    Err(e) => {
                        tracing::error!("Failed reading multipart file chunk for '{}': {}", clean_name, e);
                        write_err = Some(AppError::Internal(format!("Failed reading file chunk: {}", e)));
                        break;
                    }
                }
            }

            if let Some(err) = write_err {
                drop(out_file);
                let _ = tokio::fs::remove_file(&abs_path).await;
                return Err(err);
            }

            if let Err(e) = out_file.flush().await {
                drop(out_file);
                let _ = tokio::fs::remove_file(&abs_path).await;
                return Err(AppError::Io(e));
            }

            tracing::info!("Successfully uploaded '{}' ({} bytes)", target_rel, total_bytes);

            uploaded_files.push(json!({
                "name": clean_name,
                "path": target_rel,
                "size": total_bytes
            }));
        }
    }

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "success": true,
            "message": "File(s) uploaded successfully",
            "files": uploaded_files
        })),
    )
        .into_response())
}
