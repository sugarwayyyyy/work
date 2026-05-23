-- Club join applications table
-- Users apply to join a club; officers review and either approve or reject

CREATE TABLE IF NOT EXISTS club_join_applications (
    application_id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT NOT NULL,
    user_id INT NOT NULL,
    fee_type ENUM('semester','annual','free') NOT NULL DEFAULT 'semester',
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    verification_code VARCHAR(8) NULL,
    code_used TINYINT(1) NOT NULL DEFAULT 0,
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_active_app (club_id, user_id, status),
    FOREIGN KEY (club_id) REFERENCES clubs(club_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_club_pending (club_id, status),
    INDEX idx_user_apps (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
