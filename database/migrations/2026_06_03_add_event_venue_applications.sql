-- 活動場地申請與行政審核
-- 幹部建立活動時可「申請場地」，活動存為 draft，審核通過後才發布

CREATE TABLE IF NOT EXISTS event_venue_applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    club_id INT NOT NULL,
    applicant_id INT NOT NULL,
    status ENUM('pending', 'approved', 'needs_supplement', 'rejected') DEFAULT 'pending',
    review_comment TEXT,
    reviewer_id INT DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(club_id),
    FOREIGN KEY (applicant_id) REFERENCES users(user_id),
    FOREIGN KEY (reviewer_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_venue_app_status ON event_venue_applications(status);
CREATE INDEX idx_venue_app_event ON event_venue_applications(event_id);

-- 申請附件（PDF / Word，每筆申請最多 5 件）
CREATE TABLE IF NOT EXISTS event_venue_application_files (
    file_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES event_venue_applications(application_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
