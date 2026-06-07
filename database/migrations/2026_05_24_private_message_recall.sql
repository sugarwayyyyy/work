-- Add recall flag to private_messages

SET @private_messages_is_recalled_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'private_messages'
      AND COLUMN_NAME = 'is_recalled'
);
SET @sql := IF(
    @private_messages_is_recalled_exists = 0,
    'ALTER TABLE private_messages ADD COLUMN is_recalled TINYINT(1) NOT NULL DEFAULT 0 AFTER is_read',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
