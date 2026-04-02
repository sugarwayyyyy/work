-- 帳戶轉讓改為申請審核流程（2026-04-03）
-- 可重複執行。

USE club_platform;

CREATE TABLE IF NOT EXISTS account_transfer_requests (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT NOT NULL,
    requester_user_id INT NOT NULL,
    target_user_id INT NOT NULL,
    reason TEXT NOT NULL,
    handover_note TEXT,
    request_status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    reviewed_by INT,
    review_note TEXT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (club_id) REFERENCES clubs(club_id),
    FOREIGN KEY (requester_user_id) REFERENCES users(user_id),
    FOREIGN KEY (target_user_id) REFERENCES users(user_id),
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id)
);

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'account_transfer_requests'
      AND INDEX_NAME = 'idx_transfer_requests_status_time'
);
SET @sql := IF(@idx_exists = 0,
    'CREATE INDEX idx_transfer_requests_status_time ON account_transfer_requests(request_status, requested_at)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- account_transfers 的 club_id 在舊環境可能仍是 NOT NULL，這裡確保允許 NULL
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
