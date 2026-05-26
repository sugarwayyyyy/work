-- 測試帳號與驗收資料
USE club_platform;

-- 固定測試密碼：Test123456，首次登入後會依系統流程升級
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
SELECT 'student_ff@univ.edu', @pwd_hash, 'S000002', 'Firefox學生測試員', 'student', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student_ff@univ.edu');

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'student_wk@univ.edu', @pwd_hash, 'S000003', 'WebKit學生測試員', 'student', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student_wk@univ.edu');

-- 強制還原角色，防止前次測試（或外部工具）遺留錯誤的 role 值
UPDATE users SET role = 'platform_admin', is_active = TRUE WHERE email = 'admin@univ.edu';
UPDATE users SET role = 'student',         is_active = TRUE WHERE email = 'clubadmin@univ.edu';
UPDATE users SET role = 'student',         is_active = TRUE WHERE email = 'student@univ.edu';
UPDATE users SET role = 'student',         is_active = TRUE WHERE email = 'student_ff@univ.edu';
UPDATE users SET role = 'student',         is_active = TRUE WHERE email = 'student_wk@univ.edu';


INSERT INTO clubs (club_code, club_name, category_id, description, founding_year, club_fee, meeting_day, meeting_time, meeting_location, contact_email, contact_phone, activity_status)
SELECT 'CSC001', '程式社', 2, '介紹本學期課程與專題方向', 2010, 0, '週三', '18:00-20:00', '資工館 R201', 'csc.club@univ.edu', '0911111111', 'active'
WHERE NOT EXISTS (SELECT 1 FROM clubs WHERE club_code = 'CSC001');

INSERT INTO clubs (club_code, club_name, category_id, description, founding_year, club_fee, meeting_day, meeting_time, meeting_location, contact_email, contact_phone, activity_status)
SELECT '090', '羽球社', 1, '歡迎零基礎與進階同學一起運動', 2015, 500, '週二', '18:30-20:30', '體育館 A 場', 'badminton.club@univ.edu', '0922333444', 'active'
WHERE NOT EXISTS (SELECT 1 FROM clubs WHERE club_code = '090');

INSERT INTO clubs (club_code, club_name, category_id, description, founding_year, club_fee, meeting_day, meeting_time, meeting_location, contact_email, contact_phone, activity_status)
SELECT 'TST001', '測試社', 2, 'E2E 測試用社團', 2020, 0, '週四', '19:00-21:00', '測試館 T001', 'tst.club@univ.edu', '0933333333', 'active'
WHERE NOT EXISTS (SELECT 1 FROM clubs WHERE club_code = 'TST001');

-- 確保 CSC001 必填欄位有值（舊資料可能是 NULL）
UPDATE clubs SET
    meeting_time     = COALESCE(NULLIF(meeting_time, ''),     '18:00-20:00'),
    meeting_location = COALESCE(NULLIF(meeting_location, ''), '資工館 R201'),
    contact_email    = COALESCE(NULLIF(contact_email, ''),    'csc.club@univ.edu'),
    contact_phone    = COALESCE(NULLIF(contact_phone, ''),    '0911111111')
WHERE club_code = 'CSC001';

SET @club_admin_id = (SELECT user_id FROM users WHERE email = 'clubadmin@univ.edu' LIMIT 1);
SET @student_id    = (SELECT user_id FROM users WHERE email = 'student@univ.edu'    LIMIT 1);
SET @student_ff_id = (SELECT user_id FROM users WHERE email = 'student_ff@univ.edu' LIMIT 1);
SET @student_wk_id = (SELECT user_id FROM users WHERE email = 'student_wk@univ.edu' LIMIT 1);
SET @club1 = (SELECT club_id FROM clubs WHERE club_code = 'CSC001' LIMIT 1);
SET @club2 = (SELECT club_id FROM clubs WHERE club_code = '090'    LIMIT 1);
SET @club3 = (SELECT club_id FROM clubs WHERE club_code = 'TST001' LIMIT 1);

INSERT INTO club_members (club_id, user_id, role)
SELECT @club1, @club_admin_id, 'president'
WHERE NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = @club1 AND user_id = @club_admin_id);

INSERT INTO club_members (club_id, user_id, role)
SELECT @club2, @club_admin_id, 'director'
WHERE NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = @club2 AND user_id = @club_admin_id);

INSERT INTO club_members (club_id, user_id, role)
SELECT @club3, @club_admin_id, 'president'
WHERE NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = @club3 AND user_id = @club_admin_id);

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

-- AR-34 專用：提供一個 clubadmin 不管理的社團的公開活動，確保測試不依賴並行 worker 的臨時資料
SET @club_foreign = (SELECT club_id FROM clubs WHERE club_code = '049' LIMIT 1);
INSERT INTO events (club_id, event_name, description, event_date, location, capacity, fee, registration_deadline, event_status, is_registration_open, published_at)
SELECT @club_foreign, '健言社公開演講賽', '年度公開演講比賽', DATE_ADD(NOW(), INTERVAL 10 DAY), '人文館 H101', 100, 0, DATE_ADD(NOW(), INTERVAL 9 DAY), 'published', TRUE, NOW()
WHERE @club_foreign IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM events WHERE club_id = @club_foreign AND event_name = '健言社公開演講賽');

-- Ensure club_tags exist (cleanup may have wiped them; these mirror schema.sql defaults)
INSERT IGNORE INTO club_tags (tag_name) VALUES
  ('程式設計'), ('音樂'), ('運動'), ('藝術'), ('語言'),
  ('學術'), ('戶外'), ('服務'), ('電競'), ('攝影'),
  ('舞蹈'), ('棋藝');

-- Link tags to CSC001 so popular_tags API returns results (HAVING usage_count > 0).
-- Only CSC001 (not 090) because the cleanup script deletes club 090 and the FK would block it.
INSERT IGNORE INTO club_tag_relations (club_id, tag_id)
SELECT @club1, tag_id FROM club_tags WHERE tag_name = '程式設計';

INSERT IGNORE INTO club_tag_relations (club_id, tag_id)
SELECT @club1, tag_id FROM club_tags WHERE tag_name = '學術';

SET @admin_id = (SELECT user_id FROM users WHERE email = 'admin@univ.edu' LIMIT 1);
INSERT INTO system_announcements (title, content, announcement_type, is_pinned, display_priority, created_by, start_date)
SELECT '社團博覽會公告', '本週六 10:00-16:00 於活動中心舉辦社團博覽會。', 'event', TRUE, 100, @admin_id, NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_announcements WHERE title = '社團博覽會公告');

INSERT INTO system_announcements (title, content, announcement_type, is_pinned, display_priority, created_by, start_date)
SELECT '平台維護通知', '本週日凌晨進行例行維護。', 'maintenance', FALSE, 10, @admin_id, NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_announcements WHERE title = '平台維護通知');
