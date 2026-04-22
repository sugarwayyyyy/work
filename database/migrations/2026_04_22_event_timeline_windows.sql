-- 2026-04-22: 活動時間區間升級（報名開始、活動結束）
SET @registration_start_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'events'
      AND COLUMN_NAME = 'registration_start'
);

SET @registration_start_ddl := IF(
    @registration_start_exists = 0,
    'ALTER TABLE events ADD COLUMN registration_start DATETIME NULL AFTER fee',
    'SELECT ''events.registration_start already exists'''
);

PREPARE stmt FROM @registration_start_ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @event_end_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'events'
      AND COLUMN_NAME = 'event_end_date'
);

SET @event_end_ddl := IF(
    @event_end_exists = 0,
    'ALTER TABLE events ADD COLUMN event_end_date DATETIME NULL AFTER event_date',
    'SELECT ''events.event_end_date already exists'''
);

PREPARE stmt FROM @event_end_ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 既有資料回填：
-- registration_start 預設以 published_at，其次 created_at。
UPDATE events
SET registration_start = COALESCE(registration_start, published_at, created_at)
WHERE registration_start IS NULL;

-- event_end_date 預設等於 event_date（單點時間活動）。
UPDATE events
SET event_end_date = COALESCE(event_end_date, event_date)
WHERE event_end_date IS NULL;
