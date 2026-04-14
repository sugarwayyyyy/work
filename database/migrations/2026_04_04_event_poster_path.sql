-- 新增活動海報欄位（供 upload_event_poster / 活動詳情顯示）
SET @col_exists := (
	SELECT COUNT(*)
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE()
	  AND TABLE_NAME = 'events'
	  AND COLUMN_NAME = 'poster_path'
);

SET @ddl := IF(
	@col_exists = 0,
	'ALTER TABLE events ADD COLUMN poster_path VARCHAR(255) NULL AFTER location',
	'SELECT ''events.poster_path already exists'''
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
