-- 活動標籤系統 (2026-04-03)
-- 建立 event_tag_relations 表，用於關聯活動與社團標籤
-- 可重複執行

USE club_platform;

-- ============ 活動標籤關聯表 ============
-- 複用 club_tags 表的標籤，在活動和標籤間建立多對多關係
SET @tbl_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_tag_relations'
);
SET @sql := IF(@tbl_exists = 0,
    'CREATE TABLE event_tag_relations (
        event_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (event_id, tag_id),
        FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES club_tags(tag_id) ON DELETE CASCADE
    )',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 創建索引以加速標籤查詢
SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'event_tag_relations'
      AND INDEX_NAME = 'idx_event_tag_relations_tag_id'
);
SET @sql := IF(@idx_exists = 0,
    'CREATE INDEX idx_event_tag_relations_tag_id ON event_tag_relations(tag_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
