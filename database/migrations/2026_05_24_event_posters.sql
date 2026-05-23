-- 新增 event_posters 資料表
CREATE TABLE IF NOT EXISTS event_posters (
    poster_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
