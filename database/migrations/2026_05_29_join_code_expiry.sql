-- join applications code expiry

SET @club_join_applications_code_expires_at_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'club_join_applications'
      AND COLUMN_NAME = 'code_expires_at'
);
SET @sql := IF(
    @club_join_applications_code_expires_at_exists = 0,
    'ALTER TABLE club_join_applications ADD COLUMN code_expires_at DATETIME NULL AFTER verification_code',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
