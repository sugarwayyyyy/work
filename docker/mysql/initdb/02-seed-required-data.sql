SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
USE club_platform;

SET @pwd_hash = 'Test123456';

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'admin@univ.edu', @pwd_hash, 'A000001', '平台管理員', 'platform_admin', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@univ.edu');

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'clubadmin@univ.edu', @pwd_hash, 'C000001', '社團幹部測試員', 'student', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'clubadmin@univ.edu');

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'student@univ.edu', @pwd_hash, 'S000001', '一般學生測試員', 'student', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student@univ.edu');

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'student_ff@univ.edu', @pwd_hash, 'S000002', 'Firefox測試員', 'student', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student_ff@univ.edu');

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'student_wk@univ.edu', @pwd_hash, 'S000003', 'WebKit測試員', 'student', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student_wk@univ.edu');

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'caassist@univ.edu', @pwd_hash, 'S000004', '分類助理測試員', 'student', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'caassist@univ.edu');

INSERT INTO clubs (
    club_code, club_name, category_id, description, founding_year, club_fee, club_fee_semester,
    meeting_day, meeting_time, meeting_location, contact_email, contact_phone, activity_status, activity_badge
)
SELECT
    'CSC001', '資訊研究社',
    (SELECT category_id FROM club_categories WHERE category_name = '學術' LIMIT 1),
    '提供程式設計、資料分析與專題實作交流的社團。',
    2010, 0, 0, '星期三', '18:00-20:00', '理工大樓 R201',
    'csc.club@univ.edu', '0911111111', 'active', 'high_active'
WHERE NOT EXISTS (SELECT 1 FROM clubs WHERE club_code = 'CSC001');

INSERT INTO clubs (
    club_code, club_name, category_id, description, founding_year, club_fee, club_fee_semester,
    meeting_day, meeting_time, meeting_location, contact_email, contact_phone, activity_status, activity_badge
)
SELECT
    '090', '羽球社',
    (SELECT category_id FROM club_categories WHERE category_name = '運動' LIMIT 1),
    '以初學與進階混合練習為主的運動型社團。',
    2015, 500, 300, '星期四', '18:30-20:30', '體育館 A 場',
    'badminton.club@univ.edu', '0922333444', 'active', 'normal_active'
WHERE NOT EXISTS (SELECT 1 FROM clubs WHERE club_code = '090');

INSERT INTO clubs (
    club_code, club_name, category_id, description, founding_year, club_fee, club_fee_semester,
    meeting_day, meeting_time, meeting_location, contact_email, contact_phone, activity_status, activity_badge
)
SELECT
    'TST001', '測試社',
    (SELECT category_id FROM club_categories WHERE category_name = '學術' LIMIT 1),
    '提供 E2E 與功能驗證使用的測試社團。',
    2020, 0, 0, '星期五', '19:00-21:00', '測試教室 T001',
    'tst.club@univ.edu', '0933333333', 'active', 'normal_active'
WHERE NOT EXISTS (SELECT 1 FROM clubs WHERE club_code = 'TST001');

SET @club_admin_id = (SELECT user_id FROM users WHERE email = 'clubadmin@univ.edu' LIMIT 1);
SET @student_id = (SELECT user_id FROM users WHERE email = 'student@univ.edu' LIMIT 1);
SET @club1 = (SELECT club_id FROM clubs WHERE club_code = 'CSC001' LIMIT 1);
SET @club2 = (SELECT club_id FROM clubs WHERE club_code = '090' LIMIT 1);
SET @club3 = (SELECT club_id FROM clubs WHERE club_code = 'TST001' LIMIT 1);
SET @admin_id = (SELECT user_id FROM users WHERE email = 'admin@univ.edu' LIMIT 1);

INSERT INTO club_members (club_id, user_id, role)
SELECT @club1, @club_admin_id, 'president'
WHERE @club1 IS NOT NULL AND @club_admin_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = @club1 AND user_id = @club_admin_id);

INSERT INTO club_members (club_id, user_id, role)
SELECT @club2, @club_admin_id, 'director'
WHERE @club2 IS NOT NULL AND @club_admin_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = @club2 AND user_id = @club_admin_id);

INSERT INTO club_members (club_id, user_id, role)
SELECT @club3, @club_admin_id, 'president'
WHERE @club3 IS NOT NULL AND @club_admin_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = @club3 AND user_id = @club_admin_id);

INSERT INTO club_members (club_id, user_id, role)
SELECT @club1, @student_id, 'member'
WHERE @club1 IS NOT NULL AND @student_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = @club1 AND user_id = @student_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT @club1, @student_id, TRUE
WHERE @club1 IS NOT NULL AND @student_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM club_followers WHERE club_id = @club1 AND user_id = @student_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT @club2, @student_id, TRUE
WHERE @club2 IS NOT NULL AND @student_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM club_followers WHERE club_id = @club2 AND user_id = @student_id);

INSERT INTO events (
    club_id, event_name, description, event_date, location, capacity, fee,
    registration_deadline, event_status, is_registration_open, published_at
)
SELECT
    @club1, '資訊社新生說明會', '介紹本學期活動與加入方式。',
    DATE_ADD(NOW(), INTERVAL 7 DAY), '理工大樓 R201', 80, 0,
    DATE_ADD(NOW(), INTERVAL 6 DAY), 'published', TRUE, NOW()
WHERE @club1 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM events WHERE club_id = @club1 AND event_name = '資訊社新生說明會');

INSERT INTO events (
    club_id, event_name, description, event_date, location, capacity, fee,
    registration_deadline, event_status, is_registration_open, published_at
)
SELECT
    @club2, '羽球社體驗日', '適合初學者的輕量體驗活動。',
    DATE_ADD(NOW(), INTERVAL 5 DAY), '體育館 A 場', 30, 50,
    DATE_ADD(NOW(), INTERVAL 4 DAY), 'published', TRUE, DATE_SUB(NOW(), INTERVAL 1 DAY)
WHERE @club2 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM events WHERE club_id = @club2 AND event_name = '羽球社體驗日');

INSERT INTO system_announcements (
    title, content, announcement_type, is_pinned, display_priority, created_by, start_date
)
SELECT
    '社團博覽會公告', '本週六 10:00-16:00 於中庭舉辦社團博覽會，歡迎到場參與。',
    'event', TRUE, 100, @admin_id, NOW()
WHERE @admin_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM system_announcements WHERE title = '社團博覽會公告');

INSERT INTO system_announcements (
    title, content, announcement_type, is_pinned, display_priority, created_by, start_date
)
SELECT
    '平台維護通知', '系統將於本週日凌晨進行維護，期間部分功能可能短暫不可用。',
    'maintenance', FALSE, 10, @admin_id, NOW()
WHERE @admin_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM system_announcements WHERE title = '平台維護通知');
