-- 用戶意見回饋表
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    feedback_type ENUM('suggestion','bug','other') NOT NULL DEFAULT 'other',
    content       TEXT NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_feedback_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
