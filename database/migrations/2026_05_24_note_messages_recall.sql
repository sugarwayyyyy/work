-- Add recall flag to note_messages

SET @note_messages_is_recalled_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'note_messages'
      AND COLUMN_NAME = 'is_recalled'
);
SET @sql := IF(
    @note_messages_is_recalled_exists = 0,
    'ALTER TABLE note_messages ADD COLUMN is_recalled TINYINT(1) NOT NULL DEFAULT 0 AFTER content',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
