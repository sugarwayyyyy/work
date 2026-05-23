-- Emoji reactions on private messages
CREATE TABLE IF NOT EXISTS message_reactions (
    reaction_id  INT PRIMARY KEY AUTO_INCREMENT,
    message_id   INT NOT NULL,
    user_id      INT NOT NULL,
    emoji        VARCHAR(10) NOT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_msg_user_emoji (message_id, user_id, emoji),
    INDEX idx_message_id (message_id),
    FOREIGN KEY (message_id) REFERENCES private_messages(message_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
