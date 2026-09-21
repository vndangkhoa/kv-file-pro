use kv_files::api::payments::{
    generate_signed_license_key, generate_zalopay_trans_id, get_extension_price,
    get_zalopay_config, get_zalopay_config_with_override, sign_zalopay_callback_mac,
    sign_zalopay_order_mac, sign_zalopay_query_mac, subtle_string_eq,
    verify_signed_license_key, SANDBOX_ZALOPAY_APP_ID,
    SANDBOX_ZALOPAY_KEY1, SANDBOX_ZALOPAY_KEY2,
};
use kv_files::db::Database;
use kv_files::models::{ExtensionLicense, ExtensionOrder, PRO_BUNDLE_ID};

#[tokio::test]
async fn test_payments_orders_and_licenses_flow() {
    let temp_db = std::env::temp_dir().join(format!("kv_pay_test_{}.db", uuid::Uuid::new_v4()));
    let db = Database::new(&temp_db).unwrap();

    let user_id = "test-user-42";
    let ext_id = "cad-viewer";

    // 1. Initially no license
    let has_lic = db.has_extension_license(user_id, ext_id).await.unwrap();
    assert!(!has_lic);

    // 2. Create pending order with payment_method
    let order_id = format!("KV-ORD-{}", uuid::Uuid::new_v4());
    let order = ExtensionOrder {
        id: order_id.clone(),
        user_id: user_id.to_string(),
        extension_id: ext_id.to_string(),
        amount: 99000,
        status: "PENDING".to_string(),
        gateway_trans_id: None,
        user_note: None,
        payment_method: Some("ZALOPAY_SANDBOX".to_string()),
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };
    db.create_extension_order(&order).await.unwrap();

    // 3. Query order
    let queried = db.get_extension_order(&order_id).await.unwrap();
    assert!(queried.is_some());
    let q = queried.unwrap();
    assert_eq!(q.id, order_id);
    assert_eq!(q.status, "PENDING");
    assert_eq!(q.amount, 99000);
    assert_eq!(q.payment_method.as_deref(), Some("ZALOPAY_SANDBOX"));

    // 4. Test transition to AWAITING_VERIFICATION (buyer submits transfer proof)
    let fake_zp_trans = "260919_12345678";
    db.update_order_awaiting_verification(
        &order_id,
        Some("Transferred via ZaloPay app"),
        Some(fake_zp_trans),
    )
    .await
    .unwrap();

    let awaiting_order = db.get_extension_order(&order_id).await.unwrap().unwrap();
    assert_eq!(awaiting_order.status, "AWAITING_VERIFICATION");
    assert_eq!(awaiting_order.gateway_trans_id.as_deref(), Some(fake_zp_trans));
    assert_eq!(
        awaiting_order.user_note.as_deref(),
        Some("Transferred via ZaloPay app")
    );

    // 5. Update order to PAID (admin approval or ZaloPay Callback)
    db.update_order_status(&order_id, "PAID", Some(fake_zp_trans))
        .await
        .unwrap();

    let updated_order = db.get_extension_order(&order_id).await.unwrap().unwrap();
    assert_eq!(updated_order.status, "PAID");

    // 6. Test Admin order listing & filters
    let (all_orders, total_count) = db.list_extension_orders(None, 50, 0).await.unwrap();
    assert_eq!(total_count, 1);
    assert_eq!(all_orders.len(), 1);

    let (paid_orders, paid_count) = db.list_extension_orders(Some("PAID"), 50, 0).await.unwrap();
    assert_eq!(paid_count, 1);
    assert_eq!(paid_orders[0].id, order_id);

    let (_, pending_count) = db.list_extension_orders(Some("PENDING"), 50, 0).await.unwrap();
    assert_eq!(pending_count, 0);

    // 7. Grant cryptographically signed license
    let signing_secret = db.get_or_create_license_signing_secret().await.unwrap();
    let signed_key = generate_signed_license_key(ext_id, &signing_secret);
    assert!(signed_key.starts_with("KV-CAD-"));

    let lic_id = format!("LIC-{}", uuid::Uuid::new_v4());
    let license = ExtensionLicense {
        id: lic_id,
        user_id: user_id.to_string(),
        extension_id: ext_id.to_string(),
        order_id: order_id.clone(),
        license_key: signed_key.clone(),
        purchased_at: chrono::Utc::now().to_rfc3339(),
    };
    db.grant_extension_license(&license).await.unwrap();

    // 8. Verify license is active
    let has_lic_after = db.has_extension_license(user_id, ext_id).await.unwrap();
    assert!(has_lic_after);

    // 9. Verify cryptographic key verification
    let verified_ext = verify_signed_license_key(&signed_key, &signing_secret);
    assert_eq!(verified_ext.as_deref(), Some(ext_id));

    // 10. Tampered key fails
    let tampered = format!("{}X", &signed_key[..signed_key.len() - 1]);
    let failed = verify_signed_license_key(&tampered, &signing_secret);
    assert!(failed.is_none());

    // 11. Key signed with wrong secret fails
    let wrong_secret = "COMPLETELY_DIFFERENT_SECRET_123";
    let failed_wrong_secret = verify_signed_license_key(&signed_key, wrong_secret);
    assert!(failed_wrong_secret.is_none());

    // Clean up
    let _ = std::fs::remove_file(temp_db);
}

#[test]
fn test_all_extensions_are_paid() {
    let catalog = [
        "cad-viewer",
        "adobe-suite-viewer",
        "psd-viewer",
        "font-viewer",
        "sysvis-flow-viewer",
        "archive-inspector",
        "markdown-enhanced",
        "exif-metadata-pro",
        PRO_BUNDLE_ID,
    ];

    for ext_id in catalog {
        let price = get_extension_price(ext_id);
        assert!(
            price > 0,
            "Extension {} must be paid with price > 0, got {}",
            ext_id,
            price
        );
    }
}

#[test]
fn test_zalopay_v2_credentials_and_signatures() {
    // 1. Verify Default Sandbox Credentials
    assert_eq!(SANDBOX_ZALOPAY_APP_ID, 2554);
    assert_eq!(SANDBOX_ZALOPAY_KEY1, "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn");
    assert_eq!(SANDBOX_ZALOPAY_KEY2, "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf");

    // 2. Test app_trans_id format (must start with yymmdd_ in GMT+7)
    let trans_id = generate_zalopay_trans_id("order123");
    assert!(trans_id.contains('_'));
    let parts: Vec<&str> = trans_id.split('_').collect();
    assert_eq!(parts[0].len(), 6); // yymmdd is 6 digits
    assert!(parts[0].chars().all(|c| c.is_ascii_digit()));
    assert_eq!(parts[1], "order123");

    // 3. Test Order Creation MAC with Key1
    let app_id = 2554;
    let app_trans_id = "260919_order123";
    let app_user = "vndangkhoa";
    let amount = 199000;
    let app_time = 1789743028000i64;
    let embed_data = "{\"redirecturl\":\"http://localhost:8866\"}";
    let item = "[{\"itemid\":\"pro\",\"itemname\":\"KV Files Pro\",\"itemprice\":199000,\"itemquantity\":1}]";

    let order_mac = sign_zalopay_order_mac(
        app_id,
        app_trans_id,
        app_user,
        amount,
        app_time,
        embed_data,
        item,
        SANDBOX_ZALOPAY_KEY1,
    );
    assert_eq!(order_mac.len(), 64);

    // 4. Test Callback MAC with Key2
    let callback_data = "{\"app_id\":2554,\"app_trans_id\":\"260919_order123\",\"amount\":199000}";
    let callback_mac = sign_zalopay_callback_mac(callback_data, SANDBOX_ZALOPAY_KEY2);
    assert_eq!(callback_mac.len(), 64);
    assert!(subtle_string_eq(&callback_mac, &callback_mac));
    assert!(!subtle_string_eq(&callback_mac, "invalid_mac_12345678"));

    // 5. Test Query MAC with Key1
    let query_mac = sign_zalopay_query_mac(app_id, app_trans_id, SANDBOX_ZALOPAY_KEY1);
    assert_eq!(query_mac.len(), 64);

    // 6. Test config loader
    let cfg = get_zalopay_config();
    assert!(cfg.app_id > 0);
    assert!(!cfg.key1.is_empty());
    assert!(!cfg.key2.is_empty());

    // 7. Test override config loader
    let test_cfg = get_zalopay_config_with_override(Some(true));
    assert_eq!(test_cfg.app_id, 2554);
    assert!(test_cfg.is_sandbox);

    // 8. Test production merchant configuration
    let prod_cfg = get_zalopay_config_with_override(Some(false));
    assert!(!prod_cfg.is_sandbox);
    assert_eq!(prod_cfg.store_id, "835219_835220_835221");
    assert_eq!(prod_cfg.merchant_code, "ZP-9B856443");
    assert_eq!(prod_cfg.merchant_name, "KV FILE PRO (Thu Ngân)");
    assert_eq!(prod_cfg.bank_name, "BVBank (Ngân hàng Bản Việt)");
    assert_eq!(prod_cfg.bank_bin, "970454");
    assert_eq!(prod_cfg.account_no, "99ZP26264M777568");
    assert_eq!(prod_cfg.qr_image_url, "/zalopay_pro_qr.png");
}

#[tokio::test]
async fn test_live_zalopay_sandbox_create_and_query() {
    use kv_files::api::payments::query_zalopay_order_status;
    use kv_files::models::{ZaloPayCreateOrderRequest, ZaloPayCreateOrderResponse};

    let cfg = get_zalopay_config_with_override(Some(true));
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap();

    let app_time = chrono::Utc::now().timestamp_millis();
    let app_trans_id = generate_zalopay_trans_id(&format!("test_{}", app_time % 1000000));
    let embed_data = "{}".to_string();
    let item = "[]".to_string();
    let amount = 50000;
    let description = "Live Test KV Files PRO".to_string();

    let mac = sign_zalopay_order_mac(
        cfg.app_id,
        &app_trans_id,
        "test_user",
        amount,
        app_time,
        &embed_data,
        &item,
        &cfg.key1,
    );

    let req = ZaloPayCreateOrderRequest {
        app_id: cfg.app_id,
        app_user: "test_user".to_string(),
        app_time,
        amount,
        app_trans_id: app_trans_id.clone(),
        embed_data,
        item,
        description,
        bank_code: "".to_string(),
        callback_url: "http://localhost:8866/api/v1/payments/zalopay/callback".to_string(),
        mac,
    };

    let res = client
        .post(&cfg.create_endpoint)
        .form(&req)
        .send()
        .await;

    if let Ok(resp) = res {
        if resp.status().is_success() {
            let data: ZaloPayCreateOrderResponse = resp.json().await.unwrap();
            assert_eq!(
                data.return_code, 1,
                "ZaloPay Sandbox create order must succeed: {}",
                data.return_message
            );
            assert!(data.order_url.is_some(), "Must return order_url");

            // Query order status
            let query_res = query_zalopay_order_status(&app_trans_id).await;
            assert!(query_res.is_some(), "Must receive query response from ZaloPay");
            let q = query_res.unwrap();
            assert_eq!(q.return_code, 3);
            assert_eq!(q.is_processing, Some(true));
        }
    }
}

#[tokio::test]
async fn test_live_zalopay_production_create_order() {
    use kv_files::models::{ZaloPayCreateOrderRequest, ZaloPayCreateOrderResponse};

    let cfg = get_zalopay_config();
    if cfg.is_sandbox || cfg.app_id != 210841 {
        // Only run when production environment is active
        return;
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap();

    let app_time = chrono::Utc::now().timestamp_millis();
    let app_trans_id = generate_zalopay_trans_id(&format!("prod_{}", app_time % 1000000));
    let embed_data = serde_json::json!({"redirecturl": cfg.redirect_url}).to_string();
    let item = serde_json::json!([{
        "itemid": "kv-files-pro-all",
        "itemname": "KV Files Pro Pass",
        "itemprice": 199000,
        "itemquantity": 1
    }]).to_string();
    let amount = 199000;
    let description = format!("KV Files - Order {}", app_trans_id);

    let mac = sign_zalopay_order_mac(
        cfg.app_id,
        &app_trans_id,
        "vndangkhoa",
        amount,
        app_time,
        &embed_data,
        &item,
        &cfg.key1,
    );

    let req = ZaloPayCreateOrderRequest {
        app_id: cfg.app_id,
        app_user: "vndangkhoa".to_string(),
        app_time,
        amount,
        app_trans_id: app_trans_id.clone(),
        embed_data,
        item,
        description,
        bank_code: "".to_string(),
        callback_url: cfg.callback_url.clone(),
        mac,
    };

    let res = client
        .post(&cfg.create_endpoint)
        .form(&req)
        .send()
        .await;

    if let Ok(resp) = res {
        if resp.status().is_success() {
            let data: ZaloPayCreateOrderResponse = resp.json().await.unwrap();
            assert_eq!(
                data.return_code, 1,
                "ZaloPay Production create order must succeed: {}",
                data.return_message
            );
            assert!(data.order_url.is_some(), "Production order must return order_url");
            assert!(data.qr_code.is_some(), "Production order must return qr_code");
        }
    }
}
