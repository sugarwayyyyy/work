-- club_fee_semester NULL 表示未設定學期費，整數表示每學期金額
-- 若欄位已存在則略過，避免 migration 重跑失敗。

SET @club_fee_semester_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'clubs'
      AND COLUMN_NAME = 'club_fee_semester'
);
SET @sql := IF(
    @club_fee_semester_exists = 0,
    'ALTER TABLE clubs ADD COLUMN club_fee_semester INT DEFAULT NULL AFTER club_fee',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
