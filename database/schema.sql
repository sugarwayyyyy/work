-- 社團活動資訊統整平台 資料庫設計
-- 建立資料庫
CREATE DATABASE IF NOT EXISTS club_platform;
USE club_platform;

-- ============ 用戶相關表 ============

-- 用戶表
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    student_id VARCHAR(20) UNIQUE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('student', 'club_admin', 'platform_admin') DEFAULT 'student',
    profile_image VARCHAR(255),
    avatar_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============ 社團相關表 ============

-- 社團分類表
CREATE TABLE club_categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(255)
);

-- 社團表
CREATE TABLE clubs (
    club_id INT PRIMARY KEY AUTO_INCREMENT,
    club_code VARCHAR(50) NOT NULL UNIQUE,
    club_name VARCHAR(100) NOT NULL UNIQUE,
    category_id INT,
    description TEXT,
    founding_year INT,
    club_fee INT DEFAULT 0,
    meeting_day VARCHAR(50),
    meeting_time VARCHAR(50),
    meeting_location VARCHAR(100),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    activity_status ENUM('active', 'inactive', 'suspended', 'pending') DEFAULT 'active',
    last_activity_date DATETIME,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_posts INT DEFAULT 0,
    recent_activity_count INT DEFAULT 0,
    activity_badge ENUM('high_active', 'normal_active', 'no_recent_activity', 'ghost_club') DEFAULT 'normal_active',
    logo_path VARCHAR(255),
    deleted_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES club_categories(category_id)
);

-- 社團標籤關聯表
CREATE TABLE club_tags (
    tag_id INT PRIMARY KEY AUTO_INCREMENT,
    tag_name VARCHAR(50) NOT NULL UNIQUE,
    tag_type ENUM('experience', 'fee', 'time', 'other') DEFAULT 'other',
    description TEXT
);

-- 社團與標籤的關聯表
CREATE TABLE club_tag_relations (
    club_id INT,
    tag_id INT,
    PRIMARY KEY (club_id, tag_id),
    FOREIGN KEY (club_id) REFERENCES clubs(club_id),
    FOREIGN KEY (tag_id) REFERENCES club_tags(tag_id)
);

-- 社團成員表
CREATE TABLE club_members (
    member_id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('president', 'vice_president', 'public_relations', 'treasurer', 'director', 'member', 'advisor') DEFAULT 'member',
    join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (club_id) REFERENCES clubs(club_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE KEY unique_club_user (club_id, user_id)
);

DELIMITER $$
CREATE TRIGGER trg_club_member_main_accounts_insert
BEFORE INSERT ON club_members
FOR EACH ROW
BEGIN
    DECLARE main_count INT;
    IF NEW.role IN ('president', 'public_relations') THEN
        SELECT COUNT(*) INTO main_count
        FROM club_members
        WHERE club_id = NEW.club_id
          AND is_active = 1
          AND role IN ('president', 'public_relations');

        IF main_count >= 2 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '每個社團最多兩個主要幹部帳號（社長/公關）';
        END IF;
    END IF;
END$$
DELIMITER ;

-- 學生追蹤社團表
CREATE TABLE club_followers (
    follower_id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT NOT NULL,
    user_id INT NOT NULL,
    followed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_subscribing_notifications BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (club_id) REFERENCES clubs(club_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE KEY unique_follower (club_id, user_id)
);

-- ============ 活動相關表 ============

-- 活動表
CREATE TABLE events (
    event_id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT NOT NULL,
    event_name VARCHAR(150) NOT NULL,
    description TEXT,
    event_date DATETIME NOT NULL,
    location VARCHAR(150),
    campus_location_id INT,
    capacity INT,
    fee INT DEFAULT 0,
    registration_deadline DATETIME,
    event_status ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled', 'archived') DEFAULT 'draft',
    is_registration_open BOOLEAN DEFAULT FALSE,
    is_attendance_tracking BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at DATETIME,
    FOREIGN KEY (club_id) REFERENCES clubs(club_id)
);

-- 聯合活動表
CREATE TABLE collaborative_events (
    collab_event_id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    created_by_club_id INT NOT NULL,
    participated_club_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (created_by_club_id) REFERENCES clubs(club_id),
    FOREIGN KEY (participated_club_id) REFERENCES clubs(club_id)
);

-- 活動報名表
CREATE TABLE event_registrations (
    registration_id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('approved', 'pending', 'rejected', 'cancelled') DEFAULT 'approved',
    notes TEXT,
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE KEY unique_registration (event_id, user_id)
);

-- 活動簽到表
CREATE TABLE event_attendance (
    attendance_id INT PRIMARY KEY AUTO_INCREMENT,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 校園地點表
CREATE TABLE campus_locations (
    location_id INT PRIMARY KEY AUTO_INCREMENT,
    location_name VARCHAR(100) NOT NULL,
    building_code VARCHAR(20),
    floor INT,
    coordinates_latitude DECIMAL(10, 7),
    coordinates_longitude DECIMAL(10, 7),
    description TEXT
);

-- ============ 互動與評價表 ============

-- 提問標籤表
CREATE TABLE qa_tags (
    qa_tag_id INT PRIMARY KEY AUTO_INCREMENT,
    tag_name VARCHAR(50) NOT NULL UNIQUE,
    tag_category ENUM('welcome_info', 'fees', 'time_location', 'activities', 'membership', 'other') DEFAULT 'other',
    description TEXT
);

-- 提問留言板表
CREATE TABLE q_and_a (
    qa_id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT NOT NULL,
    user_id INT NOT NULL,
    question_title VARCHAR(200) NOT NULL,
    question_content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    display_name VARCHAR(100),
    status ENUM('open', 'answered', 'closed') DEFAULT 'open',
    views_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubs(club_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 提問與標籤的關聯表
CREATE TABLE qa_tag_relations (
    qa_id INT,
    qa_tag_id INT,
    PRIMARY KEY (qa_id, qa_tag_id),
    FOREIGN KEY (qa_id) REFERENCES q_and_a(qa_id),
    FOREIGN KEY (qa_tag_id) REFERENCES qa_tags(qa_tag_id)
);

-- 提問回覆表
CREATE TABLE qa_replies (
    reply_id INT PRIMARY KEY AUTO_INCREMENT,
    qa_id INT NOT NULL,
    user_id INT NOT NULL,
    reply_content TEXT NOT NULL,
    is_official_answer BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    display_name VARCHAR(100),
    is_accepted_solution BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (qa_id) REFERENCES q_and_a(qa_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 社團評價表
CREATE TABLE reviews (
    review_id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_title VARCHAR(200),
    review_content TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    display_name VARCHAR(100),
    verified_participant BOOLEAN DEFAULT FALSE,
    event_attended_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    helpful_count INT DEFAULT 0,
    review_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    FOREIGN KEY (club_id) REFERENCES clubs(club_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (event_attended_id) REFERENCES events(event_id)
);

-- 評價標籤表
CREATE TABLE review_tags (
    review_tag_id INT PRIMARY KEY AUTO_INCREMENT,
    tag_name VARCHAR(100) NOT NULL,
    tag_category ENUM('atmosphere', 'organization', 'value', 'learning', 'social', 'other') DEFAULT 'other'
);

-- 評價與標籤的關聯表
CREATE TABLE review_tag_relations (
    review_id INT,
    review_tag_id INT,
    PRIMARY KEY (review_id, review_tag_id),
    FOREIGN KEY (review_id) REFERENCES reviews(review_id),
    FOREIGN KEY (review_tag_id) REFERENCES review_tags(review_tag_id)
);

-- ============ 管理相關表 ============

-- 檢舉表
CREATE TABLE reports (
    report_id INT PRIMARY KEY AUTO_INCREMENT,
    reported_by_user_id INT NOT NULL,
    report_type ENUM('inappropriate_content', 'spam', 'false_information', 'harassment', 'other') DEFAULT 'other',
    reported_content_type ENUM('qa_question', 'qa_reply', 'review', 'event', 'club') NOT NULL,
    reported_content_id INT,
    reason TEXT NOT NULL,
    description TEXT,
    status ENUM('pending', 'reviewing', 'resolved', 'dismissed') DEFAULT 'pending',
    admin_notes TEXT,
    action_taken VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by INT,
    FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id),
    FOREIGN KEY (resolved_by) REFERENCES users(user_id)
);

-- 系統公告表
CREATE TABLE system_announcements (
    announcement_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    announcement_type ENUM('event', 'maintenance', 'update', 'important') DEFAULT 'important',
    is_pinned BOOLEAN DEFAULT FALSE,
    display_priority INT DEFAULT 0,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    start_date DATETIME,
    end_date DATETIME,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- 通知表
CREATE TABLE notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('event', 'announcement', 'qa_reply', 'system') DEFAULT 'system',
    related_type ENUM('event', 'announcement', 'club', 'qa') DEFAULT NULL,
    related_id INT DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 帳號轉移紀錄表
CREATE TABLE account_transfers (
    transfer_id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    transferred_roles JSON,
    transferred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    transferred_by INT,
    reason TEXT,
    FOREIGN KEY (club_id) REFERENCES clubs(club_id),
    FOREIGN KEY (from_user_id) REFERENCES users(user_id),
    FOREIGN KEY (to_user_id) REFERENCES users(user_id),
    FOREIGN KEY (transferred_by) REFERENCES users(user_id)
);

-- 帳戶轉讓申請表（由社團幹部提出，待管理員審核）
CREATE TABLE account_transfer_requests (
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

-- 參與證明表
CREATE TABLE participation_certificates (
    certificate_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    club_id INT NOT NULL,
    participation_type ENUM('member', 'admin', 'organizer') DEFAULT 'member',
    start_date DATE,
    end_date DATE,
    total_events_attended INT DEFAULT 0,
    certificate_url VARCHAR(255),
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (club_id) REFERENCES clubs(club_id)
);

-- ============ 活動日誌表 ============

-- 活動日誌（用來計算社團活躍度）
CREATE TABLE activity_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT,
    activity_type ENUM('post_event', 'post_qa', 'publish_announcement', 'member_join', 'activity') DEFAULT 'activity',
    activity_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    triggered_by INT,
    description TEXT,
    FOREIGN KEY (club_id) REFERENCES clubs(club_id),
    FOREIGN KEY (triggered_by) REFERENCES users(user_id)
);

-- ============ 索引優化 ============

CREATE INDEX idx_clubs_category ON clubs(category_id);
CREATE INDEX idx_clubs_activity_status ON clubs(activity_status);
CREATE INDEX idx_clubs_activity_badge ON clubs(activity_badge);
CREATE INDEX idx_club_members_user ON club_members(user_id);
CREATE INDEX idx_club_members_club ON club_members(club_id);
CREATE INDEX idx_club_followers_user ON club_followers(user_id);
CREATE INDEX idx_events_club ON events(club_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_status ON events(event_status);
CREATE INDEX idx_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_registrations_user ON event_registrations(user_id);
CREATE INDEX idx_qa_club ON q_and_a(club_id);
CREATE INDEX idx_qa_user ON q_and_a(user_id);
CREATE INDEX idx_reviews_club ON reviews(club_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_status ON reviews(review_status);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_activity_logs_club ON activity_logs(club_id);
CREATE INDEX idx_clubs_deleted_at ON clubs(deleted_at);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at);
CREATE INDEX idx_transfer_requests_status_time ON account_transfer_requests(request_status, requested_at);

-- ============ 初始化基本分類與標籤 ============

INSERT INTO club_categories (category_name, description) VALUES
('體育性', '運動、競賽相關社團'),
('學術性', '學術研究、技能進修相關社團'),
('藝文性', '文化、藝術、音樂相關社團'),
('服務性', '社會服務、志願服務相關社團'),
('休閒性', '娛樂、休閒活動相關社團'),
('宗教性', '宗教信仰相關社團'),
('綜合性', '其他綜合性社團');

INSERT INTO club_tags (tag_name, tag_type, description) VALUES
('無經驗可', 'experience', '不需要先前經驗'),
('需基礎', 'experience', '需要基礎知識或技能'),
('社費500內', 'fee', '社團費用在500元以內'),
('社費500-1000', 'fee', '社團費用在500-1000元'),
('社費1000以上', 'fee', '社團費用超過1000元'),
('無社費', 'fee', '免社團費用'),
('週一', 'time', '在週一進行社課'),
('週二', 'time', '在週二進行社課'),
('週三', 'time', '在週三進行社課'),
('週四', 'time', '在週四進行社課'),
('週五', 'time', '在週五進行社課'),
('晚上', 'time', '在晚上進行社課');

INSERT INTO qa_tags (tag_name, tag_category) VALUES
('迎新資訊', 'welcome_info'),
('器材費用', 'fees'),
('社課時間', 'time_location'),
('活動行程', 'activities'),
('入會資格', 'membership'),
('其他', 'other');

INSERT INTO review_tags (tag_name, tag_category) VALUES
('氣氛友善', 'atmosphere'),
('組織良好', 'organization'),
('物超所值', 'value'),
('收穫豐富', 'learning'),
('交友機會', 'social');

