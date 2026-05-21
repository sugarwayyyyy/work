-- Google OAuth 欄位（2026-05-21）
-- 新增 google_id（唯一索引）與 oauth_provider，可重複執行。

SET @col_google_id := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'google_id'
);
SET @sql := IF(@col_google_id = 0,
    'ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL AFTER avatar_path',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_provider := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'oauth_provider'
);
SET @sql := IF(@col_provider = 0,
    "ALTER TABLE users ADD COLUMN oauth_provider ENUM('email','google') NOT NULL DEFAULT 'email' AFTER google_id",
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND INDEX_NAME = 'uniq_google_id'
);
SET @sql := IF(@idx_exists = 0,
    'CREATE UNIQUE INDEX uniq_google_id ON users(google_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
