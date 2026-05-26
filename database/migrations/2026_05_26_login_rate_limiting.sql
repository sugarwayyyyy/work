-- Track failed login attempts for rate limiting (10 failures per 5-minute rolling window)
USE club_platform;

CREATE TABLE IF NOT EXISTS login_attempts (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    email        VARCHAR(100) NOT NULL,
    attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_email_time (email, attempted_at)
);
