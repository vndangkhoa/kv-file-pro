use axum::{
    body::Body,
    http::{header, Request, StatusCode},
};
use kv_files::api::create_router;
use kv_files::db::Database;
use kv_files::fs::sandbox::RootManager;
use kv_files::models::User;
use kv_files::state::AppState;
use tokio::sync::broadcast;
use tower::ServiceExt;

#[tokio::test]
async fn test_large_file_upload() {
    let temp_dir = std::env::temp_dir().join(format!("ola_upload_test_{}", uuid::Uuid::new_v4()));
    let storage_dir = temp_dir.join("storage");
    let db_path = temp_dir.join("test.db");

    std::fs::create_dir_all(&storage_dir).unwrap();
    let db = Database::new(&db_path).unwrap();
    let root_manager = RootManager::new(vec![("storage".to_string(), storage_dir.clone())]).unwrap();
    let (tx, _) = broadcast::channel(100);
    let state = AppState::new(db, root_manager, tx);

    // Create session token for test user
    let user = User {
        id: "test-user".to_string(),
        username: "testuser".to_string(),
        role: "admin".to_string(),
        is_totp_enabled: false,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    let token = state.create_session(user).await;

    let app = create_router(state);

    // Prepare a 5MB payload (exceeds default 2MB body limit)
    let file_size = 5 * 1024 * 1024; // 5 MB
    let boundary = "---------------------------974767299852498929531610575";
    let body_prefix = format!(
        "--{}\r\nContent-Disposition: form-data; name=\"root\"\r\n\r\nstorage\r\n--{}\r\nContent-Disposition: form-data; name=\"path\"\r\n\r\nprojects\r\n--{}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"large_test.psd\"\r\nContent-Type: application/octet-stream\r\n\r\n",
        boundary, boundary, boundary
    );
    let body_suffix = format!("\r\n--{}--\r\n", boundary);

    let mut body_bytes = Vec::new();
    body_bytes.extend_from_slice(body_prefix.as_bytes());
    body_bytes.resize(body_bytes.len() + file_size, b'A');
    body_bytes.extend_from_slice(body_suffix.as_bytes());

    let req = Request::builder()
        .method("POST")
        .uri("/api/v1/fs/upload")
        .header(
            header::CONTENT_TYPE,
            format!("multipart/form-data; boundary={}", boundary),
        )
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::from(body_bytes))
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::CREATED);

    let uploaded_file_path = storage_dir.join("projects").join("large_test.psd");
    assert!(uploaded_file_path.exists());
    let metadata = std::fs::metadata(&uploaded_file_path).unwrap();
    assert_eq!(metadata.len(), file_size as u64);

    let _ = std::fs::remove_dir_all(&temp_dir);
}

#[tokio::test]
async fn test_upload_with_query_params() {
    let temp_dir = std::env::temp_dir().join(format!("ola_upload_test_{}", uuid::Uuid::new_v4()));
    let storage_dir = temp_dir.join("storage");
    let db_path = temp_dir.join("test.db");

    std::fs::create_dir_all(&storage_dir).unwrap();
    let db = Database::new(&db_path).unwrap();
    let root_manager = RootManager::new(vec![("storage".to_string(), storage_dir.clone())]).unwrap();
    let (tx, _) = broadcast::channel(100);
    let state = AppState::new(db, root_manager, tx);

    let user = User {
        id: "test-user-2".to_string(),
        username: "testuser2".to_string(),
        role: "admin".to_string(),
        is_totp_enabled: false,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    let token = state.create_session(user).await;
    let app = create_router(state);

    let file_size = 10 * 1024 * 1024; // 10 MB
    let boundary = "---------------------------12345678901234567890";
    let body_prefix = format!(
        "--{}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"large_query_test.bin\"\r\nContent-Type: application/octet-stream\r\n\r\n",
        boundary
    );
    let body_suffix = format!("\r\n--{}--\r\n", boundary);

    let mut body_bytes = Vec::new();
    body_bytes.extend_from_slice(body_prefix.as_bytes());
    body_bytes.resize(body_bytes.len() + file_size, b'B');
    body_bytes.extend_from_slice(body_suffix.as_bytes());

    let req = Request::builder()
        .method("POST")
        .uri("/api/v1/fs/upload?root=storage&path=projects/subfolder")
        .header(
            header::CONTENT_TYPE,
            format!("multipart/form-data; boundary={}", boundary),
        )
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::from(body_bytes))
        .unwrap();

    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::CREATED);

    let uploaded_file_path = storage_dir.join("projects").join("subfolder").join("large_query_test.bin");
    assert!(uploaded_file_path.exists());
    let metadata = std::fs::metadata(&uploaded_file_path).unwrap();
    assert_eq!(metadata.len(), file_size as u64);

    let _ = std::fs::remove_dir_all(&temp_dir);
}
