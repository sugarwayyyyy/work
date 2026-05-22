-- 社團單堂費欄位（2026-05-22）
-- 可重複執行。
SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'clubs'
      AND COLUMN_NAME = 'club_fee_per_session'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE clubs ADD COLUMN club_fee_per_session INT NULL DEFAULT NULL AFTER club_fee_semester',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
