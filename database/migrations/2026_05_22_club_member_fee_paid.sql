-- fee_paid 欄位，若已存在則略過。

SET @fee_paid_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'club_members'
      AND COLUMN_NAME = 'fee_paid'
);
SET @sql := IF(
    @fee_paid_exists = 0,
    'ALTER TABLE club_members ADD COLUMN fee_paid TINYINT(1) NOT NULL DEFAULT 0 AFTER fee_type',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
