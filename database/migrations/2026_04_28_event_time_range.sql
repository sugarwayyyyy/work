-- event_end_date 與 registration_start
-- 使用 information_schema 檢查欄位是否已存在，避免 migration 重跑時失敗。

SET @event_end_date_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'events'
      AND COLUMN_NAME = 'event_end_date'
);
SET @sql := IF(
    @event_end_date_exists = 0,
    'ALTER TABLE events ADD COLUMN event_end_date DATETIME NULL AFTER event_date',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @registration_start_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'events'
      AND COLUMN_NAME = 'registration_start'
);
SET @sql := IF(
    @registration_start_exists = 0,
    'ALTER TABLE events ADD COLUMN registration_start DATETIME NULL AFTER event_end_date',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
