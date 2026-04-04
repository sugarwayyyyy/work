-- 提問緊急程度欄位（可重複執行）
SET @column_exists := (
		SELECT COUNT(*)
		FROM information_schema.COLUMNS
		WHERE TABLE_SCHEMA = DATABASE()
			AND TABLE_NAME = 'q_and_a'
			AND COLUMN_NAME = 'urgency_level'
);
SET @sql := IF(@column_exists = 0,
		'ALTER TABLE q_and_a ADD COLUMN urgency_level ENUM(\'normal\', \'important\', \'urgent\') DEFAULT \'normal\' AFTER question_content',
		'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE q_and_a
SET urgency_level = 'normal'
WHERE urgency_level IS NULL;