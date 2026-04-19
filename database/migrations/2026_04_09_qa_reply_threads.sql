SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'qa_replies'
      AND COLUMN_NAME = 'parent_reply_id'
);

SET @sql := IF(
    @column_exists = 0,
    'ALTER TABLE qa_replies ADD COLUMN parent_reply_id INT DEFAULT NULL AFTER qa_id',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'qa_replies'
      AND CONSTRAINT_NAME = 'fk_qa_replies_parent_reply'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql := IF(
    @fk_exists = 0,
    'ALTER TABLE qa_replies ADD CONSTRAINT fk_qa_replies_parent_reply FOREIGN KEY (parent_reply_id) REFERENCES qa_replies(reply_id) ON DELETE CASCADE',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;