use kv_files::api::payments::{
    generate_signed_license_key, get_extension_price, sign_momo_payload, subtle_string_eq,
    verify_signed_license_key, DEFAULT_LICENSE_SECRET,
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
        momo_trans_id: None,
        user_note: None,
        payment_method: Some("MOMO_P2P".to_string()),
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
    assert_eq!(q.payment_method.as_deref(), Some("MOMO_P2P"));

    // 4. Test transition to AWAITING_VERIFICATION (buyer submits transfer proof)
    let fake_momo_trans = "29481058204";
    db.update_order_awaiting_verification(
        &order_id,
        Some("Transferred from phone 0987654321"),
        Some(fake_momo_trans),
    )
    .await
    .unwrap();

    let awaiting_order = db.get_extension_order(&order_id).await.unwrap().unwrap();
    assert_eq!(awaiting_order.status, "AWAITING_VERIFICATION");
    assert_eq!(awaiting_order.momo_trans_id.as_deref(), Some(fake_momo_trans));
    assert_eq!(
        awaiting_order.user_note.as_deref(),
        Some("Transferred from phone 0987654321")
    );

    // 5. Update order to PAID (admin approval or MoMo IPN)
    db.update_order_status(&order_id, "PAID", Some(fake_momo_trans))
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

    let licenses = db.get_user_extension_licenses(user_id).await.unwrap();
    assert_eq!(licenses.len(), 1);
    assert_eq!(licenses[0].extension_id, ext_id);
    assert_eq!(licenses[0].order_id, order_id);

    // 9. Test MoMo HMAC-SHA256 signature and timing-safe equality
    let secret = "K951B6PE1wa8ngfBWja1mi1jWbvZ0eeq";
    let raw = "accessKey=F8BBA842ECF85&amount=99000&orderId=TEST123";
    let sig = sign_momo_payload(raw, secret);
    assert_eq!(sig.len(), 64);
    assert!(subtle_string_eq(&sig, &sign_momo_payload(raw, secret)));
    assert!(!subtle_string_eq(&sig, "INVALID_SIGNATURE_HERE"));

    // 10. Test get_license_by_order_id
    let by_order = db.get_license_by_order_id(&order_id).await.unwrap();
    assert!(by_order.is_some());
    let lic_found = by_order.unwrap();
    assert_eq!(lic_found.license_key, signed_key);

    // 11. Test activating license for user 2 using existing issued license_key
    let user_2 = "test-user-2";
    let activated_2 = db
        .activate_extension_license_for_user(user_2, &lic_found.license_key)
        .await
        .unwrap();
    assert_eq!(activated_2.extension_id, ext_id);
    assert!(db.has_extension_license(user_2, ext_id).await.unwrap());

    // 12. Test activating license for user 3 using MoMo transaction code directly from paid order
    let user_3 = "test-user-3";
    let activated_3 = db
        .activate_extension_license_for_user(user_3, fake_momo_trans)
        .await
        .unwrap();
    assert_eq!(activated_3.extension_id, ext_id);
    assert!(db.has_extension_license(user_3, ext_id).await.unwrap());

    // 13. Test activating license for user 4 using order_id directly
    let user_4 = "test-user-4";
    let activated_4 = db
        .activate_extension_license_for_user(user_4, &order_id)
        .await
        .unwrap();
    assert_eq!(activated_4.extension_id, ext_id);
    assert!(db.has_extension_license(user_4, ext_id).await.unwrap());

    // 14. SECURITY TEST: Trivial/fake code bypasses MUST be rejected!
    let fake_bypass_1 = db.activate_extension_license_for_user("hacker-1", "KV-PRO-FAKE").await;
    assert!(fake_bypass_1.is_err(), "Unsigned 'KV-PRO-FAKE' must be rejected");

    let fake_bypass_2 = db.activate_extension_license_for_user("hacker-2", "PRO-123456").await;
    assert!(fake_bypass_2.is_err(), "Unsigned 'PRO-123456' must be rejected");

    let fake_bypass_3 = db.activate_extension_license_for_user("hacker-3", "KV-PRO-98A7BC12-BADSIG00").await;
    assert!(fake_bypass_3.is_err(), "Invalid signature key must be rejected");

    let empty_res = db.activate_extension_license_for_user("hacker-4", "   ").await;
    assert!(empty_res.is_err(), "Empty key must be rejected");

    // 15. Test Cryptographically Signed Pro Bundle Key:
    // Generate valid Pro key signed with master key
    let pro_user = "test-user-pro";
    let valid_pro_key = generate_signed_license_key(PRO_BUNDLE_ID, DEFAULT_LICENSE_SECRET);
    assert!(verify_signed_license_key(&valid_pro_key, DEFAULT_LICENSE_SECRET).is_some());

    let pro_activated = db
        .activate_extension_license_for_user(pro_user, &valid_pro_key)
        .await
        .unwrap();
    assert_eq!(pro_activated.extension_id, "kv-files-pro-all");
    assert_eq!(pro_activated.license_key, valid_pro_key);

    // Verify all individual extensions are now considered licensed for pro_user
    assert!(db.has_extension_license(pro_user, "cad-viewer").await.unwrap());
    assert!(db.has_extension_license(pro_user, "archive-inspector").await.unwrap());
    assert!(db.has_extension_license(pro_user, "adobe-suite-viewer").await.unwrap());

    // 16. Verify persistent license.key file was generated
    let key_file = temp_db.parent().unwrap().join("license.key");
    assert!(key_file.exists());
    let saved_key = std::fs::read_to_string(&key_file).unwrap();
    assert_eq!(saved_key.trim(), valid_pro_key);

    // 17. Test sync_license_from_file_or_env with environment key
    let synced_user = db.create_user("synced_admin", "hash123", "admin").await.unwrap();
    let env_pro_key = generate_signed_license_key(PRO_BUNDLE_ID, DEFAULT_LICENSE_SECRET);
    db.sync_license_from_file_or_env(Some(&env_pro_key)).await.unwrap();
    assert!(db.has_extension_license(&synced_user.id, "cad-viewer").await.unwrap());

    // Cleanup
    let _ = std::fs::remove_file(&temp_db);
    let _ = std::fs::remove_file(&key_file);
}

#[test]
fn test_all_extensions_are_paid() {
    let catalog = vec![
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
