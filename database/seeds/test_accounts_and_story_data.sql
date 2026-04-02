-- 測試帳號與驗收資料
USE club_platform;

-- 固定測試密碼：Test123456，首次登入後會依系統流程升級
SET @pwd_hash = 'Test123456';

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'admin@univ.edu', @pwd_hash, 'A000001', '平台管理員', 'platform_admin', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@univ.edu');

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'clubadmin@univ.edu', @pwd_hash, 'C000001', '社團幹部測試員', 'club_admin', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'clubadmin@univ.edu');

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'student@univ.edu', @pwd_hash, 'S000001', '一般學生測試員', 'student', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student@univ.edu');


INSERT INTO clubs (club_code, club_name, category_id, description, founding_year, club_fee, meeting_day, meeting_time, meeting_location, contact_email, contact_phone, activity_status)
SELECT 'SPT001', '羽球社', 1, '歡迎零基礎與進階同學一起運動', 2015, 500, '週二', '18:30-20:30', '體育館 A 場', 'badminton.club@univ.edu', '0922333444', 'active'
WHERE NOT EXISTS (SELECT 1 FROM clubs WHERE club_code = 'SPT001');

SET @club_admin_id = (SELECT user_id FROM users WHERE email = 'clubadmin@univ.edu' LIMIT 1);
SET @student_id = (SELECT user_id FROM users WHERE email = 'student@univ.edu' LIMIT 1);
SET @club1 = (SELECT club_id FROM clubs WHERE club_code = 'CSC001' LIMIT 1);
SET @club2 = (SELECT club_id FROM clubs WHERE club_code = 'SPT001' LIMIT 1);

INSERT INTO club_members (club_id, user_id, role)
SELECT @club1, @club_admin_id, 'president'
WHERE NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = @club1 AND user_id = @club_admin_id);

INSERT INTO club_members (club_id, user_id, role)
SELECT @club2, @club_admin_id, 'director'
WHERE NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = @club2 AND user_id = @club_admin_id);

INSERT INTO club_members (club_id, user_id, role)
SELECT @club1, @student_id, 'member'
WHERE NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = @club1 AND user_id = @student_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT @club1, @student_id, TRUE
WHERE NOT EXISTS (SELECT 1 FROM club_followers WHERE club_id = @club1 AND user_id = @student_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT @club2, @student_id, TRUE
WHERE NOT EXISTS (SELECT 1 FROM club_followers WHERE club_id = @club2 AND user_id = @student_id);

INSERT INTO events (club_id, event_name, description, event_date, location, capacity, fee, registration_deadline, event_status, is_registration_open, published_at)
SELECT @club1, '程式社期初說明會', '介紹本學期課程與專題方向', DATE_ADD(NOW(), INTERVAL 7 DAY), '資工館 R201', 80, 0, DATE_ADD(NOW(), INTERVAL 6 DAY), 'published', TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM events WHERE club_id = @club1 AND event_name = '程式社期初說明會');

INSERT INTO events (club_id, event_name, description, event_date, location, capacity, fee, registration_deadline, event_status, is_registration_open, published_at)
SELECT @club1, '演算法工作坊', '手把手練習演算法題型', DATE_ADD(NOW(), INTERVAL 20 DAY), '資工館 R301', 40, 100, DATE_ADD(NOW(), INTERVAL 19 DAY), 'published', TRUE, DATE_SUB(NOW(), INTERVAL 1 DAY)
WHERE NOT EXISTS (SELECT 1 FROM events WHERE club_id = @club1 AND event_name = '演算法工作坊');

INSERT INTO events (club_id, event_name, description, event_date, location, capacity, fee, registration_deadline, event_status, is_registration_open, published_at)
SELECT @club2, '羽球新生體驗日', '零基礎友善體驗課', DATE_ADD(NOW(), INTERVAL 5 DAY), '體育館 A 場', 30, 50, DATE_ADD(NOW(), INTERVAL 4 DAY), 'published', TRUE, DATE_SUB(NOW(), INTERVAL 2 DAY)
WHERE NOT EXISTS (SELECT 1 FROM events WHERE club_id = @club2 AND event_name = '羽球新生體驗日');

INSERT INTO events (club_id, event_name, description, event_date, location, capacity, fee, registration_deadline, event_status, is_registration_open, published_at)
SELECT @club2, '上學期舊活動（過期）', '用於驗收過期活動隱藏', DATE_SUB(NOW(), INTERVAL 30 DAY), '體育館 B 場', 20, 0, DATE_SUB(NOW(), INTERVAL 31 DAY), 'published', FALSE, DATE_SUB(NOW(), INTERVAL 40 DAY)
WHERE NOT EXISTS (SELECT 1 FROM events WHERE club_id = @club2 AND event_name = '上學期舊活動（過期）');

SET @admin_id = (SELECT user_id FROM users WHERE email = 'admin@univ.edu' LIMIT 1);
INSERT INTO system_announcements (title, content, announcement_type, is_pinned, display_priority, created_by, start_date)
SELECT '社團博覽會公告', '本週六 10:00-16:00 於活動中心舉辦社團博覽會。', 'event', TRUE, 100, @admin_id, NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_announcements WHERE title = '社團博覽會公告');

INSERT INTO system_announcements (title, content, announcement_type, is_pinned, display_priority, created_by, start_date)
SELECT '平台維護通知', '本週日凌晨進行例行維護。', 'maintenance', FALSE, 10, @admin_id, NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_announcements WHERE title = '平台維護通知');
