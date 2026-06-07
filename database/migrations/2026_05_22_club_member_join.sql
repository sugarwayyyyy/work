-- fee_type 欄位，若已存在則略過。

SET @fee_type_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'club_members'
      AND COLUMN_NAME = 'fee_type'
);
SET @sql := IF(
    @fee_type_exists = 0,
    "ALTER TABLE club_members ADD COLUMN fee_type ENUM('none','onetime','semester','session') NOT NULL DEFAULT 'none' AFTER is_active",
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
