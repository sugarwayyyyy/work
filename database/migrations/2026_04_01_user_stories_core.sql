-- User Story 核心遷移（2026-04-01）
-- 目標：4.1, 2.1, 2.2, 1.1, 1.5, 1.3
-- 設計原則：可重複執行（idempotent）

USE club_platform;

-- 1) users: 補齊 avatar_path（避免前後端欄位不一致）
SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_path'
);
SET @sql := IF(@exists = 0,
    'ALTER TABLE users ADD COLUMN avatar_path VARCHAR(255) NULL AFTER profile_image',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) clubs: 補齊社團代碼、soft delete 與 logo_path；擴充狀態列舉
SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clubs' AND COLUMN_NAME = 'club_code'
);
SET @sql := IF(@exists = 0,
    'ALTER TABLE clubs ADD COLUMN club_code VARCHAR(50) NULL AFTER club_id',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clubs' AND COLUMN_NAME = 'logo_path'
);
SET @sql := IF(@exists = 0,
    'ALTER TABLE clubs ADD COLUMN logo_path VARCHAR(255) NULL AFTER activity_badge',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clubs' AND COLUMN_NAME = 'deleted_at'
);
SET @sql := IF(@exists = 0,
    'ALTER TABLE clubs ADD COLUMN deleted_at DATETIME NULL AFTER logo_path',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 先填充既有資料的 club_code（確保後續可設 NOT NULL）
UPDATE clubs
SET club_code = CONCAT('CLB', LPAD(club_id, 4, '0'))
WHERE club_code IS NULL OR club_code = '';

ALTER TABLE clubs
    MODIFY COLUMN club_code VARCHAR(50) NOT NULL;

SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clubs' AND INDEX_NAME = 'uk_clubs_club_code'
);
SET @sql := IF(@exists = 0,
    'ALTER TABLE clubs ADD UNIQUE KEY uk_clubs_club_code (club_code)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 若舊環境仍是三態 activity_status，擴成四態
ALTER TABLE clubs
    MODIFY COLUMN activity_status ENUM('active', 'inactive', 'suspended', 'pending') DEFAULT 'active';

SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clubs' AND INDEX_NAME = 'idx_clubs_deleted_at'
);
SET @sql := IF(@exists = 0,
    'CREATE INDEX idx_clubs_deleted_at ON clubs(deleted_at)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.1 / 4.1 擴充社團主要幹部角色（公關）
ALTER TABLE club_members
    MODIFY COLUMN role ENUM('president', 'vice_president', 'public_relations', 'treasurer', 'director', 'member', 'advisor') DEFAULT 'member';

DROP TRIGGER IF EXISTS trg_club_member_main_accounts_insert;
DELIMITER $$
CREATE TRIGGER trg_club_member_main_accounts_insert
BEFORE INSERT ON club_members
FOR EACH ROW
BEGIN
    DECLARE main_count INT;
    IF NEW.role IN ('president', 'public_relations') THEN
        SELECT COUNT(*) INTO main_count
        FROM club_members
        WHERE club_id = NEW.club_id
          AND is_active = 1
          AND role IN ('president', 'public_relations');

        IF main_count >= 2 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '每個社團最多兩個主要幹部帳號（社長/公關）';
        END IF;
    END IF;
END$$
DELIMITER ;

-- 3) events: 補發佈時間（供動態牆排序）
SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'published_at'
);
SET @sql := IF(@exists = 0,
    'ALTER TABLE events ADD COLUMN published_at DATETIME NULL AFTER updated_at',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE events
SET published_at = COALESCE(published_at, created_at)
WHERE event_status = 'published';

-- 4) system_announcements: 強化置頂排序
ALTER TABLE system_announcements
    MODIFY COLUMN is_pinned BOOLEAN DEFAULT FALSE,
    MODIFY COLUMN display_priority INT DEFAULT 0;

SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_announcements' AND INDEX_NAME = 'idx_announcement_pin_priority'
);
SET @sql := IF(@exists = 0,
    'CREATE INDEX idx_announcement_pin_priority ON system_announcements(is_pinned, display_priority, created_at)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5) notifications: 補齊通知表
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('event', 'announcement', 'qa_reply', 'system') DEFAULT 'system',
    related_type ENUM('event', 'announcement', 'club', 'qa') DEFAULT NULL,
    related_id INT DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'idx_notifications_user_created'
);
SET @sql := IF(@exists = 0,
    'CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6) account_transfers: 允許平台層級轉讓沒有特定 club_id
SET @tbl_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'account_transfers'
);
SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'account_transfers' AND COLUMN_NAME = 'club_id'
);
SET @sql := IF(@tbl_exists = 1 AND @col_exists = 1,
    'ALTER TABLE account_transfers MODIFY COLUMN club_id INT NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
