-- Personal notepad chat messages (one row per message)
-- Replaces the single-blob user_notes approach with individual message rows.

CREATE TABLE IF NOT EXISTS note_messages (
    note_id    INT PRIMARY KEY AUTO_INCREMENT,
    user_id    INT NOT NULL,
    content    TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_note_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
