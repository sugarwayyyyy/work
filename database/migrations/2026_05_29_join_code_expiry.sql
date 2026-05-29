-- 驗證碼 30 分鐘到期欄位
ALTER TABLE club_join_applications
    ADD COLUMN code_expires_at DATETIME NULL AFTER verification_code;
