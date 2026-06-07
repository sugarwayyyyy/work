-- Add reply_to_id to private_messages for threading

SET @private_messages_reply_to_id_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'private_messages'
      AND COLUMN_NAME = 'reply_to_id'
);
SET @sql := IF(
    @private_messages_reply_to_id_exists = 0,
    'ALTER TABLE private_messages ADD COLUMN reply_to_id INT NULL AFTER is_recalled',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_pm_reply_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'private_messages'
      AND CONSTRAINT_NAME = 'fk_pm_reply'
);
SET @sql := IF(
    @fk_pm_reply_exists = 0,
    'ALTER TABLE private_messages ADD CONSTRAINT fk_pm_reply FOREIGN KEY (reply_to_id) REFERENCES private_messages(message_id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
