-- 私訊功能：建立 private_messages 資料表（2026-05-23）
-- 可重複執行。

CREATE TABLE IF NOT EXISTS private_messages (
    message_id  INT PRIMARY KEY AUTO_INCREMENT,
    sender_id   INT NOT NULL,
    receiver_id INT NOT NULL,
    content     TEXT NOT NULL,
    is_read     TINYINT(1) NOT NULL DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)   REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_conv  (sender_id, receiver_id),
    INDEX idx_inbox (receiver_id, is_read),
    INDEX idx_time  (created_at)
);
