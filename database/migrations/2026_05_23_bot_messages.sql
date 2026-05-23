-- Bot messages table
-- System-generated messages delivered to users from the platform bot (user_id = 0)

CREATE TABLE IF NOT EXISTS bot_messages (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    message_type VARCHAR(40) NOT NULL DEFAULT 'info',
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    meta JSON NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
