use crate::error::{AppError, Result};
use crate::models::{ExtensionLicense, ExtensionOrder, ShareItem, TrashItem, User, format_human_size};
use rusqlite::{params, Connection};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
    data_dir: PathBuf,
}

impl Database {
    pub fn new(db_path: &Path) -> Result<Self> {
        let data_dir = db_path
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .to_path_buf();
        std::fs::create_dir_all(&data_dir)?;

        let conn = Connection::open(db_path)
            .map_err(|e| AppError::Db(format!("Failed to open SQLite database: {}", e)))?;

        // Enable SQLite WAL mode & performance tuning
        conn.pragma_update(None, "journal_mode", "WAL")
            .map_err(|e| AppError::Db(format!("Failed to set journal_mode: {}", e)))?;
        conn.pragma_update(None, "busy_timeout", 5000)
            .map_err(|e| AppError::Db(format!("Failed to set busy_timeout: {}", e)))?;
        conn.pragma_update(None, "synchronous", "NORMAL")
            .map_err(|e| AppError::Db(format!("Failed to set synchronous: {}", e)))?;

        Self::init_tables(&conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            data_dir,
        })
    }

    fn init_tables(conn: &Connection) -> Result<()> {
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'admin',
                created_at TEXT NOT NULL,
                is_totp_enabled INTEGER NOT NULL DEFAULT 0,
                totp_secret TEXT,
                backup_codes TEXT
            );

            CREATE TABLE IF NOT EXISTS shares (
                id TEXT PRIMARY KEY,
                token TEXT UNIQUE NOT NULL,
                root_name TEXT NOT NULL,
                path TEXT NOT NULL,
                is_dir INTEGER NOT NULL DEFAULT 0,
                password_hash TEXT,
                expires_at TEXT,
                view_count INTEGER NOT NULL DEFAULT 0,
                allow_download INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                items_json TEXT
            );

            CREATE TABLE IF NOT EXISTS trash (
                id TEXT PRIMARY KEY,
                root_name TEXT NOT NULL,
                original_path TEXT NOT NULL,
                trash_name TEXT NOT NULL,
                size INTEGER NOT NULL DEFAULT 0,
                is_dir INTEGER NOT NULL DEFAULT 0,
                deleted_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS extension_orders (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                extension_id TEXT NOT NULL,
                amount INTEGER NOT NULL,
                status TEXT NOT NULL,
                momo_trans_id TEXT,
                user_note TEXT,
                payment_method TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS extension_licenses (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                extension_id TEXT NOT NULL,
                order_id TEXT NOT NULL,
                license_key TEXT NOT NULL,
                purchased_at TEXT NOT NULL,
                UNIQUE(user_id, extension_id)
            );
            ",
        )
        .map_err(|e| AppError::Db(format!("Failed to initialize database schema: {}", e)))?;

        Self::migrate_schema(conn)?;

        Ok(())
    }

    fn migrate_schema(conn: &Connection) -> Result<()> {
        let mut stmt = conn
            .prepare("PRAGMA table_info(users)")
            .map_err(|e| AppError::Db(e.to_string()))?;
        let columns: Vec<String> = stmt
            .query_map([], |row| row.get(1))
            .map_err(|e| AppError::Db(e.to_string()))?
            .filter_map(|r| r.ok())
            .collect();

        if !columns.contains(&"is_totp_enabled".to_string()) {
            conn.execute(
                "ALTER TABLE users ADD COLUMN is_totp_enabled INTEGER NOT NULL DEFAULT 0",
                [],
            )
            .map_err(|e| AppError::Db(e.to_string()))?;
        }
        if !columns.contains(&"totp_secret".to_string()) {
            conn.execute("ALTER TABLE users ADD COLUMN totp_secret TEXT", [])
                .map_err(|e| AppError::Db(e.to_string()))?;
        }
        if !columns.contains(&"backup_codes".to_string()) {
            conn.execute("ALTER TABLE users ADD COLUMN backup_codes TEXT", [])
                .map_err(|e| AppError::Db(e.to_string()))?;
        }

        let mut stmt_shares = conn
            .prepare("PRAGMA table_info(shares)")
            .map_err(|e| AppError::Db(e.to_string()))?;
        let share_columns: Vec<String> = stmt_shares
            .query_map([], |row| row.get(1))
            .map_err(|e| AppError::Db(e.to_string()))?
            .filter_map(|r| r.ok())
            .collect();

        if !share_columns.contains(&"items_json".to_string()) {
            conn.execute("ALTER TABLE shares ADD COLUMN items_json TEXT", [])
                .map_err(|e| AppError::Db(e.to_string()))?;
        }

        let mut stmt_orders = conn
            .prepare("PRAGMA table_info(extension_orders)")
            .map_err(|e| AppError::Db(e.to_string()))?;
        let order_columns: Vec<String> = stmt_orders
            .query_map([], |row| row.get(1))
            .map_err(|e| AppError::Db(e.to_string()))?
            .filter_map(|r| r.ok())
            .collect();

        if !order_columns.contains(&"user_note".to_string()) {
            conn.execute("ALTER TABLE extension_orders ADD COLUMN user_note TEXT", [])
                .map_err(|e| AppError::Db(e.to_string()))?;
        }
        if !order_columns.contains(&"payment_method".to_string()) {
            conn.execute("ALTER TABLE extension_orders ADD COLUMN payment_method TEXT", [])
                .map_err(|e| AppError::Db(e.to_string()))?;
        }

        // Production-grade indexes for high-concurrency order lookup & licensing
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_orders_user_id ON extension_orders(user_id)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_orders_status ON extension_orders(status)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON extension_licenses(user_id)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_licenses_key ON extension_licenses(license_key)", []);

        Ok(())
    }

    // --- Users ---
    pub async fn has_users(&self) -> Result<bool> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT COUNT(*) FROM users")
            .map_err(|e| AppError::Db(e.to_string()))?;
        let count: i64 = stmt
            .query_row([], |r| r.get(0))
            .map_err(|e| AppError::Db(e.to_string()))?;
        Ok(count > 0)
    }

    pub async fn create_user(&self, username: &str, password_hash: &str, role: &str) -> Result<User> {
        let id = Uuid::new_v4().to_string();
        let created_at = chrono::Utc::now().to_rfc3339();

        let conn = self.conn.lock().await;
        conn.execute(
            "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, username, password_hash, role, created_at],
        )
        .map_err(|e| AppError::Db(format!("Failed to create user: {}", e)))?;

        // Auto-assign pro license if global pro license exists in settings
        let lic_key_opt: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'pro_license_key'",
                [],
                |row| row.get(0),
            )
            .ok();

        if let Some(lic_key) = lic_key_opt {
            let lic_id = format!("LIC-{}", Uuid::new_v4());
            let _ = conn.execute(
                "INSERT INTO extension_licenses (id, user_id, extension_id, order_id, license_key, purchased_at)
                 VALUES (?1, ?2, 'kv-files-pro-all', 'ORD-GLOBAL', ?3, ?4)
                 ON CONFLICT(user_id, extension_id) DO NOTHING",
                params![lic_id, id, lic_key, created_at],
            );
        }

        Ok(User {
            id,
            username: username.to_string(),
            role: role.to_string(),
            created_at,
            is_totp_enabled: false,
        })
    }

    pub async fn get_user_by_username(&self, username: &str) -> Result<Option<(User, String)>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT id, username, password_hash, role, created_at, is_totp_enabled FROM users WHERE username = ?1")
            .map_err(|e| AppError::Db(e.to_string()))?;

        let user_opt = stmt
            .query_row(params![username], |row| {
                let is_totp: i32 = row.get(5).unwrap_or(0);
                let user = User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    role: row.get(3)?,
                    created_at: row.get(4)?,
                    is_totp_enabled: is_totp != 0,
                };
                let hash: String = row.get(2)?;
                Ok((user, hash))
            })
            .ok();

        Ok(user_opt)
    }

    #[allow(dead_code)]
    pub async fn get_user_by_id(&self, id: &str) -> Result<Option<User>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT id, username, role, created_at, is_totp_enabled FROM users WHERE id = ?1")
            .map_err(|e| AppError::Db(e.to_string()))?;

        let user_opt = stmt
            .query_row(params![id], |row| {
                let is_totp: i32 = row.get(4).unwrap_or(0);
                Ok(User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    role: row.get(2)?,
                    created_at: row.get(3)?,
                    is_totp_enabled: is_totp != 0,
                })
            })
            .ok();

        Ok(user_opt)
    }

    pub async fn get_user_with_hash_by_id(&self, id: &str) -> Result<Option<(User, String)>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT id, username, password_hash, role, created_at, is_totp_enabled FROM users WHERE id = ?1")
            .map_err(|e| AppError::Db(e.to_string()))?;

        let user_opt = stmt
            .query_row(params![id], |row| {
                let is_totp: i32 = row.get(5).unwrap_or(0);
                let user = User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    role: row.get(3)?,
                    created_at: row.get(4)?,
                    is_totp_enabled: is_totp != 0,
                };
                let hash: String = row.get(2)?;
                Ok((user, hash))
            })
            .ok();

        Ok(user_opt)
    }

    pub async fn list_users(&self) -> Result<Vec<User>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT id, username, role, created_at, is_totp_enabled FROM users ORDER BY created_at ASC")
            .map_err(|e| AppError::Db(e.to_string()))?;

        let rows = stmt
            .query_map([], |row| {
                let is_totp: i32 = row.get(4).unwrap_or(0);
                Ok(User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    role: row.get(2)?,
                    created_at: row.get(3)?,
                    is_totp_enabled: is_totp != 0,
                })
            })
            .map_err(|e| AppError::Db(e.to_string()))?;

        let mut users = Vec::new();
        for r in rows {
            if let Ok(u) = r {
                users.push(u);
            }
        }
        Ok(users)
    }

    pub async fn update_user_password(&self, id: &str, password_hash: &str) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute(
            "UPDATE users SET password_hash = ?1 WHERE id = ?2",
            params![password_hash, id],
        )
        .map_err(|e| AppError::Db(format!("Failed to update password: {}", e)))?;
        Ok(())
    }

    pub async fn save_pending_totp(&self, user_id: &str, secret: &str, backup_codes_json: &str) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute(
            "UPDATE users SET totp_secret = ?1, backup_codes = ?2 WHERE id = ?3",
            params![secret, backup_codes_json, user_id],
        )
        .map_err(|e| AppError::Db(format!("Failed to save 2FA setup: {}", e)))?;
        Ok(())
    }

    pub async fn enable_totp(&self, user_id: &str) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute(
            "UPDATE users SET is_totp_enabled = 1 WHERE id = ?1",
            params![user_id],
        )
        .map_err(|e| AppError::Db(format!("Failed to enable 2FA: {}", e)))?;
        Ok(())
    }

    pub async fn update_totp_secret(&self, user_id: &str, secret: &str) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute(
            "UPDATE users SET totp_secret = ?1 WHERE id = ?2",
            params![secret, user_id],
        )
        .map_err(|e| AppError::Db(format!("Failed to update 2FA secret: {}", e)))?;
        Ok(())
    }

    pub async fn disable_totp(&self, user_id: &str) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute(
            "UPDATE users SET is_totp_enabled = 0, totp_secret = NULL, backup_codes = NULL WHERE id = ?1",
            params![user_id],
        )
        .map_err(|e| AppError::Db(format!("Failed to disable 2FA: {}", e)))?;
        Ok(())
    }

    pub async fn get_totp_secret(&self, user_id: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT totp_secret FROM users WHERE id = ?1")
            .map_err(|e| AppError::Db(e.to_string()))?;
        let secret: Option<String> = stmt
            .query_row(params![user_id], |row| row.get(0))
            .ok();
        Ok(secret)
    }

    pub async fn validate_and_consume_backup_code(&self, user_id: &str, code: &str) -> Result<bool> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT backup_codes FROM users WHERE id = ?1")
            .map_err(|e| AppError::Db(e.to_string()))?;
        let codes_json_opt: Option<String> = stmt
            .query_row(params![user_id], |row| row.get(0))
            .ok()
            .flatten();

        let Some(json_str) = codes_json_opt else {
            return Ok(false);
        };

        let Ok(mut codes): std::result::Result<Vec<String>, _> = serde_json::from_str(&json_str) else {
            return Ok(false);
        };

        let clean_code = code.trim().to_uppercase();
        if let Some(pos) = codes.iter().position(|c| c.to_uppercase() == clean_code) {
            codes.remove(pos);
            let updated_json = serde_json::to_string(&codes)
                .map_err(|e| AppError::Internal(e.to_string()))?;
            conn.execute(
                "UPDATE users SET backup_codes = ?1 WHERE id = ?2",
                params![updated_json, user_id],
            )
            .map_err(|e| AppError::Db(format!("Failed to update backup codes: {}", e)))?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub async fn delete_user(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute("DELETE FROM users WHERE id = ?1", params![id])
            .map_err(|e| AppError::Db(format!("Failed to delete user: {}", e)))?;
        Ok(())
    }

    // --- Shares ---
    pub async fn create_share(
        &self,
        root_name: &str,
        path: &str,
        is_dir: bool,
        password_hash: Option<String>,
        expires_at: Option<String>,
        allow_download: bool,
        items_json: Option<String>,
    ) -> Result<ShareItem> {
        let id = Uuid::new_v4().to_string();
        let token = Uuid::new_v4().to_string().replace('-', "")[..12].to_string();
        let created_at = chrono::Utc::now().to_rfc3339();

        let conn = self.conn.lock().await;
        conn.execute(
            "INSERT INTO shares (id, token, root_name, path, is_dir, password_hash, expires_at, view_count, allow_download, created_at, items_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8, ?9, ?10)",
            params![
                id,
                token,
                root_name,
                path,
                is_dir as i32,
                password_hash,
                expires_at,
                allow_download as i32,
                created_at,
                items_json
            ],
        )
        .map_err(|e| AppError::Db(format!("Failed to create share: {}", e)))?;

        Ok(ShareItem {
            id,
            token,
            root_name: root_name.to_string(),
            path: path.to_string(),
            is_dir,
            has_password: password_hash.is_some(),
            expires_at,
            view_count: 0,
            allow_download,
            created_at,
            items_json,
        })
    }

    pub async fn get_share_by_token(&self, token: &str) -> Result<Option<(ShareItem, Option<String>)>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT id, token, root_name, path, is_dir, password_hash, expires_at, view_count, allow_download, created_at, items_json FROM shares WHERE token = ?1")
            .map_err(|e| AppError::Db(e.to_string()))?;

        let res = stmt
            .query_row(params![token], |row| {
                let is_dir: i32 = row.get(4)?;
                let pw_hash: Option<String> = row.get(5)?;
                let allow_dl: i32 = row.get(8)?;

                let item = ShareItem {
                    id: row.get(0)?,
                    token: row.get(1)?,
                    root_name: row.get(2)?,
                    path: row.get(3)?,
                    is_dir: is_dir != 0,
                    has_password: pw_hash.is_some(),
                    expires_at: row.get(6)?,
                    view_count: row.get(7)?,
                    allow_download: allow_dl != 0,
                    created_at: row.get(9)?,
                    items_json: row.get(10)?,
                };
                Ok((item, pw_hash))
            })
            .ok();

        Ok(res)
    }

    pub async fn increment_share_view(&self, token: &str) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute(
            "UPDATE shares SET view_count = view_count + 1 WHERE token = ?1",
            params![token],
        )
        .map_err(|e| AppError::Db(e.to_string()))?;
        Ok(())
    }

    pub async fn list_shares(&self) -> Result<Vec<ShareItem>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT id, token, root_name, path, is_dir, password_hash, expires_at, view_count, allow_download, created_at, items_json FROM shares ORDER BY created_at DESC")
            .map_err(|e| AppError::Db(e.to_string()))?;

        let rows = stmt
            .query_map([], |row| {
                let is_dir: i32 = row.get(4)?;
                let pw_hash: Option<String> = row.get(5)?;
                let allow_dl: i32 = row.get(8)?;

                Ok(ShareItem {
                    id: row.get(0)?,
                    token: row.get(1)?,
                    root_name: row.get(2)?,
                    path: row.get(3)?,
                    is_dir: is_dir != 0,
                    has_password: pw_hash.is_some(),
                    expires_at: row.get(6)?,
                    view_count: row.get(7)?,
                    allow_download: allow_dl != 0,
                    created_at: row.get(9)?,
                    items_json: row.get(10)?,
                })
            })
            .map_err(|e| AppError::Db(e.to_string()))?;

        let mut shares = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                shares.push(item);
            }
        }
        Ok(shares)
    }

    pub async fn delete_share(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute("DELETE FROM shares WHERE id = ?1", params![id])
            .map_err(|e| AppError::Db(e.to_string()))?;
        Ok(())
    }

    // --- Trash Bin ---
    pub async fn add_trash_item(
        &self,
        root_name: &str,
        original_path: &str,
        trash_name: &str,
        size: u64,
        is_dir: bool,
    ) -> Result<TrashItem> {
        let id = Uuid::new_v4().to_string();
        let deleted_at = chrono::Utc::now().to_rfc3339();

        let conn = self.conn.lock().await;
        conn.execute(
            "INSERT INTO trash (id, root_name, original_path, trash_name, size, is_dir, deleted_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                id,
                root_name,
                original_path,
                trash_name,
                size as i64,
                is_dir as i32,
                deleted_at
            ],
        )
        .map_err(|e| AppError::Db(format!("Failed to record trash item: {}", e)))?;

        Ok(TrashItem {
            id,
            root_name: root_name.to_string(),
            original_path: original_path.to_string(),
            trash_name: trash_name.to_string(),
            size,
            human_size: format_human_size(size),
            is_dir,
            deleted_at,
        })
    }

    pub async fn get_trash_item(&self, id: &str) -> Result<Option<TrashItem>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT id, root_name, original_path, trash_name, size, is_dir, deleted_at FROM trash WHERE id = ?1")
            .map_err(|e| AppError::Db(e.to_string()))?;

        let res = stmt
            .query_row(params![id], |row| {
                let size_i64: i64 = row.get(4)?;
                let is_dir: i32 = row.get(5)?;
                let size = size_i64 as u64;

                Ok(TrashItem {
                    id: row.get(0)?,
                    root_name: row.get(1)?,
                    original_path: row.get(2)?,
                    trash_name: row.get(3)?,
                    size,
                    human_size: format_human_size(size),
                    is_dir: is_dir != 0,
                    deleted_at: row.get(6)?,
                })
            })
            .ok();

        Ok(res)
    }

    pub async fn list_trash(&self) -> Result<Vec<TrashItem>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT id, root_name, original_path, trash_name, size, is_dir, deleted_at FROM trash ORDER BY deleted_at DESC")
            .map_err(|e| AppError::Db(e.to_string()))?;

        let rows = stmt
            .query_map([], |row| {
                let size_i64: i64 = row.get(4)?;
                let is_dir: i32 = row.get(5)?;
                let size = size_i64 as u64;

                Ok(TrashItem {
                    id: row.get(0)?,
                    root_name: row.get(1)?,
                    original_path: row.get(2)?,
                    trash_name: row.get(3)?,
                    size,
                    human_size: format_human_size(size),
                    is_dir: is_dir != 0,
                    deleted_at: row.get(6)?,
                })
            })
            .map_err(|e| AppError::Db(e.to_string()))?;

        let mut items = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                items.push(item);
            }
        }
        Ok(items)
    }

    pub async fn remove_trash_item(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute("DELETE FROM trash WHERE id = ?1", params![id])
            .map_err(|e| AppError::Db(e.to_string()))?;
        Ok(())
    }

    pub async fn clear_trash(&self) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute("DELETE FROM trash", [])
            .map_err(|e| AppError::Db(e.to_string()))?;
        Ok(())
    }

    // --- Settings ---
    pub async fn get_all_settings(&self) -> Result<HashMap<String, String>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT key, value FROM settings")
            .map_err(|e| AppError::Db(e.to_string()))?;

        let rows = stmt
            .query_map([], |row| {
                let k: String = row.get(0)?;
                let v: String = row.get(1)?;
                Ok((k, v))
            })
            .map_err(|e| AppError::Db(e.to_string()))?;

        let mut map = HashMap::new();
        for r in rows {
            if let Ok((k, v)) = r {
                map.insert(k, v);
            }
        }
        Ok(map)
    }

    #[allow(dead_code)]
    pub async fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key = ?1 LIMIT 1")
            .map_err(|e| AppError::Db(e.to_string()))?;
        let res = stmt.query_row(params![key], |row| row.get::<_, String>(0)).ok();
        Ok(res)
    }

    pub async fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
            params![key, value],
        )
        .map_err(|e| AppError::Db(format!("Failed to save setting '{}': {}", key, e)))?;
        Ok(())
    }

    // --- Extension Orders & Licenses (ZaloPay Payment) ---
    pub async fn create_extension_order(&self, order: &ExtensionOrder) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute(
            "INSERT INTO extension_orders (id, user_id, extension_id, amount, status, momo_trans_id, user_note, payment_method, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                order.id,
                order.user_id,
                order.extension_id,
                order.amount,
                order.status,
                order.gateway_trans_id,
                order.user_note,
                order.payment_method,
                order.created_at,
                order.updated_at,
            ],
        )
        .map_err(|e| AppError::Db(format!("Failed to create extension order: {}", e)))?;
        Ok(())
    }

    pub async fn update_order_status(
        &self,
        order_id: &str,
        status: &str,
        gateway_trans_id: Option<&str>,
    ) -> Result<()> {
        let conn = self.conn.lock().await;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE extension_orders SET status = ?1, momo_trans_id = COALESCE(?2, momo_trans_id), updated_at = ?3 WHERE id = ?4",
            params![status, gateway_trans_id, now, order_id],
        )
        .map_err(|e| AppError::Db(format!("Failed to update order status: {}", e)))?;
        Ok(())
    }

    pub async fn update_order_awaiting_verification(
        &self,
        order_id: &str,
        user_note: Option<&str>,
        trans_id: Option<&str>,
    ) -> Result<()> {
        let conn = self.conn.lock().await;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE extension_orders 
             SET status = 'AWAITING_VERIFICATION', 
                 user_note = COALESCE(?1, user_note), 
                 momo_trans_id = COALESCE(?2, momo_trans_id), 
                 updated_at = ?3 
             WHERE id = ?4",
            params![user_note, trans_id, now, order_id],
        )
        .map_err(|e| AppError::Db(format!("Failed to update order to awaiting verification: {}", e)))?;
        Ok(())
    }

    pub async fn get_extension_order(&self, order_id: &str) -> Result<Option<ExtensionOrder>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare(
                "SELECT id, user_id, extension_id, amount, status, momo_trans_id, user_note, payment_method, created_at, updated_at 
                 FROM extension_orders WHERE id = ?1",
            )
            .map_err(|e| AppError::Db(e.to_string()))?;

        let mut rows = stmt
            .query_map(params![order_id], |row| {
                Ok(ExtensionOrder {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    extension_id: row.get(2)?,
                    amount: row.get(3)?,
                    status: row.get(4)?,
                    gateway_trans_id: row.get(5)?,
                    user_note: row.get(6)?,
                    payment_method: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })
            .map_err(|e| AppError::Db(e.to_string()))?;

        if let Some(row) = rows.next() {
            Ok(Some(row.map_err(|e| AppError::Db(e.to_string()))?))
        } else {
            Ok(None)
        }
    }

    pub async fn list_extension_orders(
        &self,
        status_filter: Option<&str>,
        limit: usize,
        offset: usize,
    ) -> Result<(Vec<ExtensionOrder>, usize)> {
        let conn = self.conn.lock().await;
        let filter_param = match status_filter {
            Some(s) if !s.trim().is_empty() && !s.eq_ignore_ascii_case("ALL") => {
                Some(s.trim().to_uppercase())
            }
            _ => None,
        };

        let total: usize = if let Some(ref f) = filter_param {
            conn.query_row(
                "SELECT COUNT(*) FROM extension_orders WHERE status = ?1",
                params![f],
                |row| row.get(0),
            )
        } else {
            conn.query_row("SELECT COUNT(*) FROM extension_orders", [], |row| {
                row.get(0)
            })
        }
        .unwrap_or(0);

        let mut list = Vec::new();
        if let Some(ref f) = filter_param {
            let mut stmt = conn
                .prepare(
                    "SELECT id, user_id, extension_id, amount, status, momo_trans_id, user_note, payment_method, created_at, updated_at 
                     FROM extension_orders 
                     WHERE status = ?1 
                     ORDER BY created_at DESC 
                     LIMIT ?2 OFFSET ?3",
                )
                .map_err(|e| AppError::Db(e.to_string()))?;
            let rows = stmt
                .query_map(params![f, limit as i64, offset as i64], |row| {
                    Ok(ExtensionOrder {
                        id: row.get(0)?,
                        user_id: row.get(1)?,
                        extension_id: row.get(2)?,
                        amount: row.get(3)?,
                        status: row.get(4)?,
                        gateway_trans_id: row.get(5)?,
                        user_note: row.get(6)?,
                        payment_method: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                    })
                })
                .map_err(|e| AppError::Db(e.to_string()))?;
            for r in rows.flatten() {
                list.push(r);
            }
        } else {
            let mut stmt = conn
                .prepare(
                    "SELECT id, user_id, extension_id, amount, status, momo_trans_id, user_note, payment_method, created_at, updated_at 
                     FROM extension_orders 
                     ORDER BY created_at DESC 
                     LIMIT ?1 OFFSET ?2",
                )
                .map_err(|e| AppError::Db(e.to_string()))?;
            let rows = stmt
                .query_map(params![limit as i64, offset as i64], |row| {
                    Ok(ExtensionOrder {
                        id: row.get(0)?,
                        user_id: row.get(1)?,
                        extension_id: row.get(2)?,
                        amount: row.get(3)?,
                        status: row.get(4)?,
                        gateway_trans_id: row.get(5)?,
                        user_note: row.get(6)?,
                        payment_method: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                    })
                })
                .map_err(|e| AppError::Db(e.to_string()))?;
            for r in rows.flatten() {
                list.push(r);
            }
        }

        Ok((list, total))
    }

    pub async fn get_or_create_license_signing_secret(&self) -> Result<String> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key = 'license_signing_secret'")
            .map_err(|e| AppError::Db(e.to_string()))?;

        let existing: Option<String> = stmt.query_row([], |row| row.get(0)).ok();

        if let Some(secret) = existing {
            if !secret.trim().is_empty() {
                return Ok(secret);
            }
        }

        let new_secret = format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('license_signing_secret', ?1)
             ON CONFLICT(key) DO UPDATE SET value = ?1",
            params![new_secret],
        )
        .map_err(|e| AppError::Db(e.to_string()))?;

        Ok(new_secret)
    }

    pub async fn grant_extension_license(&self, license: &ExtensionLicense) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute(
            "INSERT INTO extension_licenses (id, user_id, extension_id, order_id, license_key, purchased_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(user_id, extension_id) DO UPDATE SET order_id = ?4, license_key = ?5, purchased_at = ?6",
            params![
                license.id,
                license.user_id,
                license.extension_id,
                license.order_id,
                license.license_key,
                license.purchased_at,
            ],
        )
        .map_err(|e| AppError::Db(format!("Failed to grant extension license: {}", e)))?;

        // If Pro Bundle license, persist to license.key and settings
        if license.extension_id == "kv-files-pro-all" {
            let _ = conn.execute(
                "INSERT INTO settings (key, value) VALUES ('pro_license_key', ?1)
                 ON CONFLICT(key) DO UPDATE SET value = ?1",
                params![license.license_key],
            );
            let _ = std::fs::write(self.data_dir.join("license.key"), &license.license_key);
        }

        Ok(())
    }

    pub async fn get_user_extension_licenses(&self, user_id: &str) -> Result<Vec<ExtensionLicense>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT id, user_id, extension_id, order_id, license_key, purchased_at FROM extension_licenses WHERE user_id = ?1")
            .map_err(|e| AppError::Db(e.to_string()))?;

        let rows = stmt
            .query_map(params![user_id], |row| {
                Ok(ExtensionLicense {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    extension_id: row.get(2)?,
                    order_id: row.get(3)?,
                    license_key: row.get(4)?,
                    purchased_at: row.get(5)?,
                })
            })
            .map_err(|e| AppError::Db(e.to_string()))?;

        let mut list = Vec::new();
        for r in rows {
            if let Ok(l) = r {
                list.push(l);
            }
        }
        Ok(list)
    }

    pub async fn has_extension_license(&self, user_id: &str, extension_id: &str) -> Result<bool> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare(
                "SELECT COUNT(*) FROM extension_licenses 
                 WHERE user_id = ?1 AND (extension_id = ?2 OR extension_id = 'kv-files-pro-all')",
            )
            .map_err(|e| AppError::Db(e.to_string()))?;

        let count: i64 = stmt
            .query_row(params![user_id, extension_id], |row| row.get(0))
            .unwrap_or(0);

        Ok(count > 0)
    }

    pub async fn get_license_by_order_id(&self, order_id: &str) -> Result<Option<ExtensionLicense>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT id, user_id, extension_id, order_id, license_key, purchased_at FROM extension_licenses WHERE order_id = ?1 LIMIT 1")
            .map_err(|e| AppError::Db(e.to_string()))?;

        let mut rows = stmt
            .query_map(params![order_id], |row| {
                Ok(ExtensionLicense {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    extension_id: row.get(2)?,
                    order_id: row.get(3)?,
                    license_key: row.get(4)?,
                    purchased_at: row.get(5)?,
                })
            })
            .map_err(|e| AppError::Db(e.to_string()))?;

        if let Some(row) = rows.next() {
            Ok(Some(row.map_err(|e| AppError::Db(e.to_string()))?))
        } else {
            Ok(None)
        }
    }

    pub async fn activate_extension_license_for_user(
        &self,
        user_id: &str,
        code: &str,
    ) -> Result<ExtensionLicense> {
        let code_trimmed = code.trim();
        if code_trimmed.is_empty() {
            return Err(AppError::BadRequest("Activation code cannot be empty".into()));
        }

        let conn = self.conn.lock().await;

        // 1. Look for existing license by license_key or order_id
        let mut lic_stmt = conn
            .prepare(
                "SELECT extension_id, order_id, license_key, purchased_at 
                 FROM extension_licenses 
                 WHERE license_key = ?1 OR order_id = ?1 
                 LIMIT 1",
            )
            .map_err(|e| AppError::Db(e.to_string()))?;

        let found_license = lic_stmt
            .query_row(params![code_trimmed], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                ))
            })
            .ok();

        let (extension_id, order_id, license_key, purchased_at) = match found_license {
            Some(data) => data,
            None => {
                // 2. Look for confirmed/paid order by order id or ZaloPay trans_id
                let mut order_stmt = conn
                    .prepare(
                        "SELECT id, extension_id, momo_trans_id, updated_at 
                         FROM extension_orders 
                         WHERE (id = ?1 OR momo_trans_id = ?1) AND status = 'PAID' 
                         LIMIT 1",
                    )
                    .map_err(|e| AppError::Db(e.to_string()))?;

                let found_order = order_stmt
                    .query_row(params![code_trimmed], |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, Option<String>>(2)?,
                            row.get::<_, String>(3)?,
                        ))
                    })
                    .ok();

                if let Some((ord_id, ext_id, trans_id_opt, p_at)) = found_order {
                    let trans_id = trans_id_opt.unwrap_or_else(|| "TRANS".into());
                    let suffix = if ord_id.len() >= 6 {
                        &ord_id[ord_id.len() - 6..]
                    } else {
                        &ord_id
                    };
                    let key = if ext_id == "kv-files-pro-all" {
                        format!("KV-PRO-{}", suffix)
                    } else {
                        format!("ZP-{}-{}", trans_id, suffix)
                    };
                    (ext_id, ord_id, key, p_at)
                } else if let Ok(payload) = crate::licensing::verify_pro_license(code_trimmed, None) {
                    let now = chrono::Utc::now().to_rfc3339();
                    (
                        payload.tier,
                        payload.id,
                        code_trimmed.to_string(),
                        now,
                    )
                } else {
                    let instance_secret = {
                        let mut stmt = conn
                            .prepare("SELECT value FROM settings WHERE key = 'license_signing_secret'")
                            .map_err(|e| AppError::Db(e.to_string()))?;
                        stmt.query_row([], |row| row.get::<_, String>(0)).ok()
                    };
                    let zalopay_key = std::env::var("ZALOPAY_KEY1")
                        .unwrap_or_else(|_| "sdngKKJmqEMzvhQgsvDQIUybtEcngMpl".into());
                    let mut candidate_secrets = vec![crate::api::payments::DEFAULT_LICENSE_SECRET, &zalopay_key];
                    if let Some(ref is) = instance_secret {
                        candidate_secrets.push(is);
                    }

                    if let Some(ext_id) = crate::api::payments::verify_license_against_secrets(code_trimmed, &candidate_secrets) {
                        let now = chrono::Utc::now().to_rfc3339();
                        (
                            ext_id,
                            format!("ORD-KEY-{}", Uuid::new_v4()),
                            code_trimmed.to_uppercase(),
                            now,
                        )
                    } else {
                        // Check if an order exists with this ID or gateway trans ID that is not yet approved
                        if let Ok(mut check_stmt) = conn.prepare(
                            "SELECT id, status FROM extension_orders 
                             WHERE id = ?1 OR momo_trans_id = ?1 
                             LIMIT 1",
                        ) {
                            let pending_order = check_stmt
                                .query_row(params![code_trimmed], |row| {
                                    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                                })
                                .ok();

                            if let Some((ord_id, status)) = pending_order {
                                return Err(AppError::BadRequest(format!(
                                    "Đơn hàng '{}' đang ở trạng thái '{}'. Vui lòng đợi quản trị viên duyệt đơn để kích hoạt bản quyền PRO.",
                                    ord_id, status
                                )));
                            }
                        }

                        return Err(AppError::NotFound(
                            "Mã kích hoạt không hợp lệ hoặc chưa được thanh toán/duyệt. Vui lòng nhập mã bản quyền (dạng KV-PRO-...) do quản trị viên cấp.".into(),
                        ));
                    }
                }
            }
        };

        // 3. Grant/bind license to current user
        let new_id = format!("LIC-{}", Uuid::new_v4());
        conn.execute(
            "INSERT INTO extension_licenses (id, user_id, extension_id, order_id, license_key, purchased_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(user_id, extension_id) DO UPDATE SET order_id = ?4, license_key = ?5, purchased_at = ?6",
            params![
                new_id,
                user_id,
                extension_id,
                order_id,
                license_key,
                purchased_at,
            ],
        )
        .map_err(|e| AppError::Db(format!("Failed to activate extension license: {}", e)))?;

        // 4. Save to persistent license.key file and settings if Pro
        if extension_id == "kv-files-pro-all" {
            let _ = conn.execute(
                "INSERT INTO settings (key, value) VALUES ('pro_license_key', ?1)
                 ON CONFLICT(key) DO UPDATE SET value = ?1",
                params![license_key],
            );
            let _ = std::fs::write(self.data_dir.join("license.key"), &license_key);
        }

        Ok(ExtensionLicense {
            id: new_id,
            user_id: user_id.to_string(),
            extension_id,
            order_id,
            license_key,
            purchased_at,
        })
    }

    pub async fn sync_license_from_file_or_env(&self, env_key: Option<&str>) -> Result<()> {
        let key_to_apply = if let Some(k) = env_key {
            let trimmed = k.trim();
            if !trimmed.is_empty() {
                Some(trimmed.to_string())
            } else {
                None
            }
        } else {
            None
        };

        let key = match key_to_apply {
            Some(k) => {
                let _ = std::fs::write(self.data_dir.join("license.key"), &k);
                k
            }
            None => {
                let file_path = self.data_dir.join("license.key");
                if file_path.exists() {
                    match std::fs::read_to_string(&file_path) {
                        Ok(content) => {
                            let trimmed = content.trim().to_string();
                            if !trimmed.is_empty() {
                                trimmed
                            } else {
                                return Ok(());
                            }
                        }
                        Err(_) => return Ok(()),
                    }
                } else {
                    return Ok(());
                }
            }
        };

        let conn = self.conn.lock().await;

        // Verify cryptographic validity before injecting
        let instance_secret = {
            let mut stmt = conn
                .prepare("SELECT value FROM settings WHERE key = 'license_signing_secret'")
                .map_err(|e| AppError::Db(e.to_string()))?;
            stmt.query_row([], |row| row.get::<_, String>(0)).ok()
        };
        let zalopay_key = std::env::var("ZALOPAY_KEY1")
            .unwrap_or_else(|_| "sdngKKJmqEMzvhQgsvDQIUybtEcngMpl".into());
        let mut candidate_secrets = vec![crate::api::payments::DEFAULT_LICENSE_SECRET, &zalopay_key];
        if let Some(ref is) = instance_secret {
            candidate_secrets.push(is);
        }
        let is_valid_ed25519 = crate::licensing::verify_pro_license(&key, None).is_ok();
        let is_valid_hmac = if !is_valid_ed25519 {
            crate::api::payments::verify_license_against_secrets(&key, &candidate_secrets).is_some()
        } else {
            false
        };

        if !is_valid_ed25519 && !is_valid_hmac {
            tracing::warn!("Ignoring invalid or unsigned license key in license.key: {}", key);
            return Ok(());
        }

        let _ = conn.execute(
            "INSERT INTO settings (key, value) VALUES ('pro_license_key', ?1)
             ON CONFLICT(key) DO UPDATE SET value = ?1",
            params![key],
        );

        let mut stmt = conn
            .prepare("SELECT id FROM users")
            .map_err(|e| AppError::Db(e.to_string()))?;
        let user_ids: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| AppError::Db(e.to_string()))?
            .filter_map(|r| r.ok())
            .collect();

        let now = chrono::Utc::now().to_rfc3339();
        for uid in user_ids {
            let lic_id = format!("LIC-{}", Uuid::new_v4());
            let _ = conn.execute(
                "INSERT INTO extension_licenses (id, user_id, extension_id, order_id, license_key, purchased_at)
                 VALUES (?1, ?2, 'kv-files-pro-all', 'ORD-AUTO-SYNC', ?3, ?4)
                 ON CONFLICT(user_id, extension_id) DO UPDATE SET license_key = ?3",
                params![lic_id, uid, key, now],
            );
        }

        Ok(())
    }

    pub async fn get_system_pro_license(&self) -> Result<Option<crate::licensing::LicensePayload>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key = 'pro_license_key'")
            .map_err(|e| AppError::Db(e.to_string()))?;
        let key_opt: Option<String> = stmt.query_row([], |row| row.get(0)).ok();
        drop(stmt);
        drop(conn);

        if let Some(key) = key_opt {
            if let Ok(payload) = crate::licensing::verify_pro_license(&key, None) {
                return Ok(Some(payload));
            }
            let trimmed = key.trim();
            if !trimmed.is_empty() && (trimmed.starts_with("KV-") || trimmed.starts_with("ZP-") || trimmed.starts_with("MOMO-")) {
                return Ok(Some(crate::licensing::LicensePayload {
                    id: "LEGACY-LIC".into(),
                    user: "admin".into(),
                    tier: "kv-files-pro-all".into(),
                    customer_email: None,
                    issued_at: chrono::Utc::now().timestamp(),
                    expires_at: None,
                    features: vec!["all".into()],
                }));
            }
        }
        Ok(None)
    }
}
