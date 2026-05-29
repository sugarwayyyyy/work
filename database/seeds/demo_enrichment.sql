-- Demo 展示資料：填充社團詳情、活動、公告、評價、Q&A
-- 設計為可重複執行（冪等性）：使用 WHERE NOT EXISTS / INSERT IGNORE / 冪等 UPDATE
-- 編碼：UTF-8（無 BOM）
USE club_platform;

-- =============================================================
-- Section 1. 更新 20 個社團詳細資訊
-- =============================================================

-- 熱舞社（067）
UPDATE clubs SET
    description      = '熱舞社成立於 2005 年，以 K-POP、HipHop、Street Dance 等流行舞蹈風格為主軸。不限舞蹈基礎，所有對舞蹈有熱情的同學皆歡迎加入。每週三晚間在人文館 A305 舞蹈排練室集訓，期末舉辦年度公演，歡迎踴躍報名。',
    meeting_day      = '週三',
    meeting_time     = '18:00-21:00',
    meeting_location = '人文館 A305 舞蹈排練室',
    contact_email    = 'dance.club@univ.edu',
    contact_phone    = '0912-345-001',
    club_fee         = 300,
    activity_badge   = 'high_active',
    last_activity_date = NOW(),
    last_updated     = NOW()
WHERE club_code = '067';

-- 攝影社（066）
UPDATE clubs SET
    description      = '攝影社致力推廣攝影藝術，涵蓋人像、風景、街拍、黑白膠片等多元風格。定期舉辦主題外拍、後製教學（Lightroom / Photoshop）及作品展覽。社內備有借用設備，手機攝影同樣歡迎，入社無須自備相機。',
    meeting_day      = '週四',
    meeting_time     = '19:00-21:00',
    meeting_location = '視聽館 3F 影像製作實驗室',
    contact_email    = 'photo.club@univ.edu',
    contact_phone    = '0912-345-002',
    club_fee         = 200,
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 2 DAY),
    last_updated     = NOW()
WHERE club_code = '066';

-- 國樂社（061）
UPDATE clubs SET
    description      = '國樂社傳承中華音樂文化，指導演奏二胡、琵琶、笛子、揚琴等傳統樂器。無論初學或有基礎，皆可加入學習。每學期舉辦聯合音樂會，並積極參與校外藝文展演，讓傳統音樂在校園中延續生命力。',
    meeting_day      = '週六',
    meeting_time     = '14:00-17:00',
    meeting_location = '藝術館 B1 音樂排練室',
    contact_email    = 'music.club@univ.edu',
    contact_phone    = '0912-345-003',
    club_fee         = 500,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 5 DAY),
    last_updated     = NOW()
WHERE club_code = '061';

-- 書法社（064）
UPDATE clubs SET
    description      = '書法社推廣中國書法美學，從楷書入門，進而學習行書、草書及各家書風。備有完善教學資源，定期邀請書法名師蒞校指導。不論基礎深淺，歡迎對文字藝術有興趣的同學共同體驗筆墨世界。',
    meeting_day      = '週二',
    meeting_time     = '19:00-21:00',
    meeting_location = '人文館 H301 書法教室',
    contact_email    = 'calligraphy.club@univ.edu',
    contact_phone    = '0912-345-004',
    club_fee         = 200,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 10 DAY),
    last_updated     = NOW()
WHERE club_code = '064';

-- 鋼琴社（123）
UPDATE clubs SET
    description      = '鋼琴社提供個別指導與合奏訓練，適合入門至進階各程度的演奏者。社內設有練習琴房，社員可預約使用。每學期舉辦成果發表會，並不定期邀請音樂系學生分享演奏技巧與心得體驗。',
    meeting_day      = '週五',
    meeting_time     = '19:00-21:00',
    meeting_location = '藝術館 B1 琴房',
    contact_email    = 'piano.club@univ.edu',
    contact_phone    = '0912-345-005',
    club_fee         = 300,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 7 DAY),
    last_updated     = NOW()
WHERE club_code = '123';

-- 登山社（075）
UPDATE clubs SET
    description      = '登山社每月定期舉辦郊山與中級山健行，以培養體能、親近自然為宗旨。活動設計注重安全教育，備有急救基本訓練。新生無須特殊體能，帶著好奇心與活力即可出發探索台灣山林！',
    meeting_day      = '週日',
    meeting_time     = '07:00-17:00',
    meeting_location = '校門口集合（活動日）',
    contact_email    = 'hiking.club@univ.edu',
    contact_phone    = '0912-345-006',
    club_fee         = 100,
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 3 DAY),
    last_updated     = NOW()
WHERE club_code = '075';

-- 國術社（084）
UPDATE clubs SET
    description      = '國術社傳承中華武術精髓，課程涵蓋太極拳、長拳、散打基本功等。強調強身健體與武德並重，適合各年齡層同學學習。定期參加校際武術競賽，亦歡迎純粹以興趣加入的社員。',
    meeting_day      = '週二',
    meeting_time     = '18:00-20:00',
    meeting_location = '綜合體育館 武術練習室',
    contact_email    = 'martialarts.club@univ.edu',
    contact_phone    = '0912-345-007',
    club_fee         = 200,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 4 DAY),
    last_updated     = NOW()
WHERE club_code = '084';

-- 棋藝社（082）
UPDATE clubs SET
    description      = '棋藝社涵蓋圍棋、象棋、西洋棋三大棋種，設有入門至進階分組教學。備有定期對弈賽與讀書會，並參加全國大學棋藝聯賽。無論棋力強弱，皆歡迎來棋藝社切磋、交流。',
    meeting_day      = '週四',
    meeting_time     = '18:00-21:00',
    meeting_location = '社團活動中心 206 室',
    contact_email    = 'chess.club@univ.edu',
    contact_phone    = '0912-345-008',
    club_fee         = 150,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 8 DAY),
    last_updated     = NOW()
WHERE club_code = '082';

-- 網球社（092）
UPDATE clubs SET
    description      = '網球社歡迎零基礎到有經驗的球員加入，提供教練指導與社員互打練習。定期舉辦校內友誼賽，並組隊參加大學網球聯賽。費用含球場租借，球拍可向社辦借用，不必自備。',
    meeting_day      = '週三',
    meeting_time     = '17:00-19:00',
    meeting_location = '校內網球場',
    contact_email    = 'tennis.club@univ.edu',
    contact_phone    = '0912-345-009',
    club_fee         = 300,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 6 DAY),
    last_updated     = NOW()
WHERE club_code = '092';

-- 羽球社（090）
UPDATE clubs SET
    description      = '羽球社是校內最活躍的球類社團之一，提供教練指導與社員自由練習時間。每週兩次訓練，分初學與進階班。定期舉辦校內盃及校際邀請賽，並提供選訓機會給有意參賽的社員。',
    meeting_day      = '週一、週四',
    meeting_time     = '18:00-21:00',
    meeting_location = '綜合體育館 羽球場',
    contact_email    = 'badminton.club@univ.edu',
    contact_phone    = '0912-345-010',
    club_fee         = 250,
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 1 DAY),
    last_updated     = NOW()
WHERE club_code = '090';

-- 健言社（049）
UPDATE clubs SET
    description      = '健言社致力培養同學的演講、即席問答與辯論能力。每週社課透過主題討論、模擬比賽強化口語表達。每年定期舉辦校際即席演講賽，鼓勵社員積極參加校外語言競賽，拓展視野與競爭力。',
    meeting_day      = '週五',
    meeting_time     = '18:30-21:00',
    meeting_location = '人文館 H101 演講廳',
    contact_email    = 'speech.club@univ.edu',
    contact_phone    = '0912-345-011',
    club_fee         = 100,
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 2 DAY),
    last_updated     = NOW()
WHERE club_code = '049';

-- 創新創業社（192）
UPDATE clubs SET
    description      = '創新創業社連結有理想的創業者與各領域專才，提供商業計畫書撰寫、簡報製作及業師輔導等資源。定期舉辦創業工作坊、與校外新創公司交流，並籌辦年度 Startup Weekend 挑戰賽。',
    meeting_day      = '週三',
    meeting_time     = '19:00-21:00',
    meeting_location = '創新育成中心 302 會議室',
    contact_email    = 'startup.club@univ.edu',
    contact_phone    = '0912-345-012',
    club_fee         = 200,
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 3 DAY),
    last_updated     = NOW()
WHERE club_code = '192';

-- 天文社（051）
UPDATE clubs SET
    description      = '天文社以探索星空為使命，定期辦理觀星活動、天象講座及太空科學工作坊。設有望遠鏡借用服務，並與校方合作在天文觀測台舉辦夜間觀測活動。歡迎對宇宙充滿好奇的同學一起仰望星空。',
    meeting_day      = '週五',
    meeting_time     = '19:30-21:30',
    meeting_location = '理工館 R502 天文觀測台',
    contact_email    = 'astro.club@univ.edu',
    contact_phone    = '0912-345-013',
    club_fee         = 150,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 9 DAY),
    last_updated     = NOW()
WHERE club_code = '051';

-- 金融投資研究社（401）
UPDATE clubs SET
    description      = '金融投資研究社聚焦股票分析、ETF 投資、總體經濟研判等主題，定期舉辦讀書會與模擬操盤競賽。邀請業界人士分享實戰經驗，協助社員建立系統化的投資思維框架，為未來職涯做準備。',
    meeting_day      = '週四',
    meeting_time     = '18:00-20:00',
    meeting_location = '管理學院 M302 討論室',
    contact_email    = 'finance.club@univ.edu',
    contact_phone    = '0912-345-014',
    club_fee         = 200,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 6 DAY),
    last_updated     = NOW()
WHERE club_code = '401';

-- 急救康輔社（100）
UPDATE clubs SET
    description      = '急救康輔社提供 CPR、AED 操作、緊急包紮等急救技能認證課程，同時結合康輔知識推廣心理健康教育。每年服務逾 500 位同學取得急救證照，是校園安全教育的重要力量。',
    meeting_day      = '週二',
    meeting_time     = '18:00-20:30',
    meeting_location = '衛生保健組 急救訓練教室',
    contact_email    = 'firstaid.club@univ.edu',
    contact_phone    = '0912-345-015',
    club_fee         = 100,
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 1 DAY),
    last_updated     = NOW()
WHERE club_code = '100';

-- 同舟共濟服務社（097）
UPDATE clubs SET
    description      = '同舟共濟服務社以社區服務、弱勢關懷為核心，定期前往偏鄉國小課輔、陪伴獨居老人等志工活動。強調服務學習精神，讓每位社員在付出中成長，累積有意義的社會實踐經歷。',
    meeting_day      = '週六',
    meeting_time     = '09:00-12:00',
    meeting_location = '學生事務處 志工服務中心',
    contact_email    = 'service.club@univ.edu',
    contact_phone    = '0912-345-016',
    club_fee         = 0,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 7 DAY),
    last_updated     = NOW()
WHERE club_code = '097';

-- 慈濟青年社（126）
UPDATE clubs SET
    description      = '慈濟青年社秉持慈悲喜捨精神，推廣環保、素食與人文教育。定期參與慈善義賣、路邊環保回收及社區關懷活動，以行動落實人文理念，培養大學生的社會責任感與感恩心。',
    meeting_day      = '週日',
    meeting_time     = '10:00-12:00',
    meeting_location = '慈濟人文志業 校園辦公室',
    contact_email    = 'tzu.chi@univ.edu',
    contact_phone    = '0912-345-017',
    club_fee         = 0,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 14 DAY),
    last_updated     = NOW()
WHERE club_code = '126';

-- 桌上遊戲社（168）
UPDATE clubs SET
    description      = '桌上遊戲社擁有超過 300 款桌遊，涵蓋策略、推理、派對等多種類型。社費含無限次遊玩，每週活動歡迎攜友入場。定期舉辦主題桌遊馬拉松、新遊體驗日，打造輕鬆多元的交流空間。',
    meeting_day      = '週六',
    meeting_time     = '13:00-18:00',
    meeting_location = '社團活動中心 桌遊室',
    contact_email    = 'boardgame.club@univ.edu',
    contact_phone    = '0912-345-018',
    club_fee         = 200,
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 2 DAY),
    last_updated     = NOW()
WHERE club_code = '168';

-- 電子競技社（184）
UPDATE clubs SET
    description      = '電子競技社整合 FPS、MOBA、格鬥等主流電競項目，提供高規格訓練環境與教練指導。定期舉辦校內邀請賽，並組隊出征大學電競聯賽。不論玩家等級，歡迎熱愛電競的同學一起競技交流。',
    meeting_day      = '週三、週五',
    meeting_time     = '19:00-22:00',
    meeting_location = '資訊館 電競訓練室',
    contact_email    = 'esports.club@univ.edu',
    contact_phone    = '0912-345-019',
    club_fee         = 300,
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 1 DAY),
    last_updated     = NOW()
WHERE club_code = '184';

-- 飲料調製社（083）
UPDATE clubs SET
    description      = '飲料調製社教授手搖飲、義式咖啡、無酒精調飲等多種飲料製作技巧。每次社課皆有實作練習，並分享各地飲料文化。不定期舉辦飲品競賽，培養對飲料調製有熱情的未來職人。',
    meeting_day      = '週四',
    meeting_time     = '17:00-19:30',
    meeting_location = '生活科學館 餐飲實習室',
    contact_email    = 'beverage.club@univ.edu',
    contact_phone    = '0912-345-020',
    club_fee         = 300,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 5 DAY),
    last_updated     = NOW()
WHERE club_code = '083';

-- =============================================================
-- Section 2. Demo 評論者帳號（5 個）
-- =============================================================

INSERT IGNORE INTO users (email, password, name, role, is_active, created_at)
VALUES
    ('demo_reviewer1@demo.edu', '$2y$10$T0JLeVGdmN6OiTGGoTbs4uDn0UJ4UjDgi2YpZ7VtDnO8Ti66ugBDK', '李小明', 'student', 1, DATE_SUB(NOW(), INTERVAL 30 DAY)),
    ('demo_reviewer2@demo.edu', '$2y$10$T0JLeVGdmN6OiTGGoTbs4uDn0UJ4UjDgi2YpZ7VtDnO8Ti66ugBDK', '陳美華', 'student', 1, DATE_SUB(NOW(), INTERVAL 29 DAY)),
    ('demo_reviewer3@demo.edu', '$2y$10$T0JLeVGdmN6OiTGGoTbs4uDn0UJ4UjDgi2YpZ7VtDnO8Ti66ugBDK', '王大偉', 'student', 1, DATE_SUB(NOW(), INTERVAL 28 DAY)),
    ('demo_reviewer4@demo.edu', '$2y$10$T0JLeVGdmN6OiTGGoTbs4uDn0UJ4UjDgi2YpZ7VtDnO8Ti66ugBDK', '張雅婷', 'student', 1, DATE_SUB(NOW(), INTERVAL 27 DAY)),
    ('demo_reviewer5@demo.edu', '$2y$10$T0JLeVGdmN6OiTGGoTbs4uDn0UJ4UjDgi2YpZ7VtDnO8Ti66ugBDK', '林志豪', 'student', 1, DATE_SUB(NOW(), INTERVAL 26 DAY));

-- =============================================================
-- Section 3. 展示活動（12 個）
-- =============================================================

-- 活動 1：熱舞社春季期末公演
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, registration_start,
    location, poster_path, capacity, fee, registration_deadline,
    event_status, is_registration_open, published_at)
SELECT c.club_id,
    '熱舞社春季期末公演',
    '一年一度的熱舞社期末大公演！本次公演匯集 K-POP、HipHop、Breaking 等多種舞風，超過 60 位社員傾力演出。歡迎闔家蒞臨，入場免費，名額有限請盡早報名！',
    DATE_ADD(NOW(), INTERVAL 21 DAY),
    DATE_ADD(NOW(), INTERVAL 21 DAY) + INTERVAL 3 HOUR,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    '輔仁大學 野聲樓 大禮堂',
    'assets/uploads/events/demo_event1.jpg',
    200, 0,
    DATE_ADD(NOW(), INTERVAL 20 DAY),
    'published', 1, NOW()
FROM clubs c WHERE c.club_code = '067'
AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '熱舞社春季期末公演' AND e.club_id = c.club_id);

-- 活動 2：熱舞社新生招募說明會
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, registration_start,
    location, poster_path, capacity, fee, registration_deadline,
    event_status, is_registration_open, published_at)
SELECT c.club_id,
    '熱舞社新生招募說明會',
    '想跳舞卻不知從哪裡開始？歡迎來熱舞社說明會！現場有學長姐示範、社團介紹及免費體驗課，報名即可參加抽獎。不分基礎，只要有熱情就來！',
    DATE_ADD(NOW(), INTERVAL 7 DAY),
    DATE_ADD(NOW(), INTERVAL 7 DAY) + INTERVAL 2 HOUR,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    '人文館 A305 舞蹈排練室',
    'assets/uploads/events/demo_event2.jpg',
    50, 0,
    DATE_ADD(NOW(), INTERVAL 6 DAY),
    'published', 1, NOW()
FROM clubs c WHERE c.club_code = '067'
AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '熱舞社新生招募說明會' AND e.club_id = c.club_id);

-- 活動 3：攝影社春季戶外外拍活動
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, registration_start,
    location, poster_path, capacity, fee, registration_deadline,
    event_status, is_registration_open, published_at)
SELECT c.club_id,
    '攝影社春季戶外外拍活動',
    '春季最適合外拍！本次活動主題為「城市光影」，前往板橋 435 藝文特區取景。備有攝影老師帶隊指導，手機相機皆可參加，費用含交通及下午茶。',
    DATE_ADD(NOW(), INTERVAL 14 DAY),
    DATE_ADD(NOW(), INTERVAL 14 DAY) + INTERVAL 5 HOUR,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    '板橋 435 藝文特區',
    'assets/uploads/events/demo_event3.jpg',
    20, 200,
    DATE_ADD(NOW(), INTERVAL 13 DAY),
    'published', 1, NOW()
FROM clubs c WHERE c.club_code = '066'
AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '攝影社春季戶外外拍活動' AND e.club_id = c.club_id);

-- 活動 4：2026 黑白攝影聯展
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, registration_start,
    location, poster_path, capacity, fee, registration_deadline,
    event_status, is_registration_open, published_at)
SELECT c.club_id,
    '2026 黑白攝影聯展',
    '攝影社年度聯展正式展出！本次主題「黑白之間」，展示 30 位社員精心拍攝的黑白影像作品，呈現都市、自然、人文等多元視角。歡迎自由入場欣賞，展期兩週。',
    DATE_ADD(NOW(), INTERVAL 30 DAY),
    DATE_ADD(NOW(), INTERVAL 44 DAY),
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    '視聽館 1F 藝廊',
    'assets/uploads/events/demo_event4.jpg',
    100, 0,
    DATE_ADD(NOW(), INTERVAL 29 DAY),
    'published', 1, NOW()
FROM clubs c WHERE c.club_code = '066'
AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '2026 黑白攝影聯展' AND e.club_id = c.club_id);

-- 活動 5：2026 春季國樂聯合音樂會
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, registration_start,
    location, poster_path, capacity, fee, registration_deadline,
    event_status, is_registration_open, published_at)
SELECT c.club_id,
    '2026 春季國樂聯合音樂會',
    '本校國樂社聯合鄰近大學共同舉辦春季音樂會，演出曲目涵蓋傳統民謠、現代國樂改編及合奏協奏等多元形式。演出票價含精緻節目冊，歡迎喜愛國樂的朋友共襄盛舉。',
    DATE_ADD(NOW(), INTERVAL 45 DAY),
    DATE_ADD(NOW(), INTERVAL 45 DAY) + INTERVAL 2 HOUR,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    '野聲樓 大禮堂',
    'assets/uploads/events/demo_event5.jpg',
    150, 100,
    DATE_ADD(NOW(), INTERVAL 44 DAY),
    'published', 1, NOW()
FROM clubs c WHERE c.club_code = '061'
AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '2026 春季國樂聯合音樂會' AND e.club_id = c.club_id);

-- 活動 6：登山社春季郊山健行：象山一日遊
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, registration_start,
    location, poster_path, capacity, fee, registration_deadline,
    event_status, is_registration_open, published_at)
SELECT c.club_id,
    '登山社春季郊山健行：象山一日遊',
    '象山步道全長約 1.8 公里，海拔 183 公尺，適合初學者入門。清晨出發，沿途欣賞台北市景，俯瞰信義區 101。費用含保險、補給品及導覽服務，請穿著運動服裝及防滑鞋。',
    DATE_ADD(NOW(), INTERVAL 10 DAY),
    DATE_ADD(NOW(), INTERVAL 10 DAY) + INTERVAL 8 HOUR,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    '台北象山步道（六巨石登山口）',
    'assets/uploads/events/demo_event6.jpg',
    30, 300,
    DATE_ADD(NOW(), INTERVAL 9 DAY),
    'published', 1, NOW()
FROM clubs c WHERE c.club_code = '075'
AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '登山社春季郊山健行：象山一日遊' AND e.club_id = c.club_id);

-- 活動 7：國術社招新體驗日
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, registration_start,
    location, poster_path, capacity, fee, registration_deadline,
    event_status, is_registration_open, published_at)
SELECT c.club_id,
    '國術社招新體驗日',
    '對武術好奇嗎？來國術社體驗日！現場有太極拳、長拳示範，以及免費入門體驗課。學長姐將帶你認識中華武術之美，解答一切入社問題。無需任何基礎，報名即可免費參加！',
    DATE_ADD(NOW(), INTERVAL 5 DAY),
    DATE_ADD(NOW(), INTERVAL 5 DAY) + INTERVAL 3 HOUR,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    '綜合體育館 武術練習室',
    'assets/uploads/events/demo_event7.jpg',
    40, 0,
    DATE_ADD(NOW(), INTERVAL 4 DAY),
    'published', 1, NOW()
FROM clubs c WHERE c.club_code = '084'
AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '國術社招新體驗日' AND e.club_id = c.club_id);

-- 活動 8：2026 校際即席演講邀請賽
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, registration_start,
    location, poster_path, capacity, fee, registration_deadline,
    event_status, is_registration_open, published_at)
SELECT c.club_id,
    '2026 校際即席演講邀請賽',
    '本校健言社主辦年度校際即席演講邀請賽，邀集全台 15 所大學參賽。選手在現場抽題後限時準備 3 分鐘，進行 5 分鐘演說。歡迎所有同學入場觀摩，現場備有評審點評，是學習演講技巧的絕佳機會。',
    DATE_ADD(NOW(), INTERVAL 28 DAY),
    DATE_ADD(NOW(), INTERVAL 28 DAY) + INTERVAL 6 HOUR,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    '人文館 H101 演講廳',
    'assets/uploads/events/demo_event8.jpg',
    80, 0,
    DATE_ADD(NOW(), INTERVAL 27 DAY),
    'published', 1, NOW()
FROM clubs c WHERE c.club_code = '049'
AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '2026 校際即席演講邀請賽' AND e.club_id = c.club_id);

-- 活動 9：CPR 急救技能認證訓練課程
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, registration_start,
    location, poster_path, capacity, fee, registration_deadline,
    event_status, is_registration_open, published_at)
SELECT c.club_id,
    'CPR 急救技能認證訓練課程',
    '本課程由急救康輔社與衛生保健組合辦，通過者可取得美國心臟協會（AHA）CPR+AED 認證證書（附費）。課程內容含成人 CPR、AED 操作、哈姆立克急救法，全程約 4 小時，名額有限，請盡早報名。',
    DATE_ADD(NOW(), INTERVAL 12 DAY),
    DATE_ADD(NOW(), INTERVAL 12 DAY) + INTERVAL 4 HOUR,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    '衛生保健組 急救訓練教室',
    'assets/uploads/events/demo_event9.jpg',
    30, 0,
    DATE_ADD(NOW(), INTERVAL 11 DAY),
    'published', 1, NOW()
FROM clubs c WHERE c.club_code = '100'
AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = 'CPR 急救技能認證訓練課程' AND e.club_id = c.club_id);

-- 活動 10：春季桌遊馬拉松 12 小時不間斷
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, registration_start,
    location, poster_path, capacity, fee, registration_deadline,
    event_status, is_registration_open, published_at)
SELECT c.club_id,
    '春季桌遊馬拉松 12 小時不間斷',
    '一年一度的桌遊馬拉松來了！300+ 款遊戲任你玩，從輕鬆派對遊戲到燒腦策略大作應有盡有。費用含全程遊玩、點心飲料及精美小禮。組隊或單人皆可報名，歡迎桌遊新手與老手一同挑戰！',
    DATE_ADD(NOW(), INTERVAL 8 DAY),
    DATE_ADD(NOW(), INTERVAL 8 DAY) + INTERVAL 12 HOUR,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    '社團活動中心 桌遊室',
    'assets/uploads/events/demo_event10.jpg',
    60, 150,
    DATE_ADD(NOW(), INTERVAL 7 DAY),
    'published', 1, NOW()
FROM clubs c WHERE c.club_code = '168'
AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '春季桌遊馬拉松 12 小時不間斷' AND e.club_id = c.club_id);

-- 活動 11：FPS 電競校內邀請賽（CS2）
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, registration_start,
    location, poster_path, capacity, fee, registration_deadline,
    event_status, is_registration_open, published_at)
SELECT c.club_id,
    'FPS 電競校內邀請賽（CS2）',
    '電競社舉辦 CS2 校內邀請賽，採 5v5 制，共 8 隊參賽。冠軍隊伍將獲得獎金及周邊大禮包，並取得代表本校出戰區域聯賽資格。現正開放組隊報名，每隊 5 人，名額有限！',
    DATE_ADD(NOW(), INTERVAL 16 DAY),
    DATE_ADD(NOW(), INTERVAL 16 DAY) + INTERVAL 8 HOUR,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    '資訊館 電競訓練室',
    'assets/uploads/events/demo_event11.jpg',
    40, 0,
    DATE_ADD(NOW(), INTERVAL 15 DAY),
    'published', 1, NOW()
FROM clubs c WHERE c.club_code = '184'
AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = 'FPS 電競校內邀請賽（CS2）' AND e.club_id = c.club_id);

-- 活動 12：Startup Weekend 創業挑戰工作坊
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, registration_start,
    location, poster_path, capacity, fee, registration_deadline,
    event_status, is_registration_open, published_at)
SELECT c.club_id,
    'Startup Weekend 創業挑戰工作坊',
    '54 小時密集創業挑戰！從組隊、發想商業模式、製作 MVP 到最終 pitch，全程由業師輔導。費用含三日餐點及場地。不限科系，歡迎對創業有熱情的同學報名參加，共同打造你的第一個創業提案。',
    DATE_ADD(NOW(), INTERVAL 25 DAY),
    DATE_ADD(NOW(), INTERVAL 27 DAY),
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    '創新育成中心 多功能廳',
    'assets/uploads/events/demo_event12.jpg',
    50, 500,
    DATE_ADD(NOW(), INTERVAL 24 DAY),
    'published', 1, NOW()
FROM clubs c WHERE c.club_code = '192'
AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = 'Startup Weekend 創業挑戰工作坊' AND e.club_id = c.club_id);

-- =============================================================
-- Section 4. 系統公告（4 條）
-- =============================================================

DELETE FROM system_announcements WHERE title IN (
    '🎪 2026 春季社團博覽會盛大登場！',
    '⚠️ 系統維護公告',
    '📬 私訊功能正式上線',
    '📋 學期社費繳納期限提醒'
);

INSERT INTO system_announcements (title, content, announcement_type, is_pinned, display_priority, created_by, start_date, end_date)
SELECT
    '🎪 2026 春季社團博覽會盛大登場！',
    '2026 春季社團博覽會將於 6 月 5 日（五）至 6 月 6 日（六）在本校廣場盛大舉行！超過 80 個社團同時設攤展示，現場備有精彩表演、互動體驗及入社優惠。歡迎同學踴躍蒞臨，探索屬於自己的社團圈。',
    'event', 1, 100, u.user_id,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    DATE_ADD(NOW(), INTERVAL 60 DAY)
FROM users u WHERE u.email = 'admin@univ.edu' LIMIT 1;

INSERT INTO system_announcements (title, content, announcement_type, is_pinned, display_priority, created_by, start_date, end_date)
SELECT
    '📋 學期社費繳納期限提醒',
    '2026 春季學期社費繳納期限為 5 月 31 日（週日）。請各社團社員確認繳費狀態，逾期未繳者將暫停社團系統相關功能。如有問題請洽學生事務處課外活動組。',
    'important', 0, 80, u.user_id,
    DATE_SUB(NOW(), INTERVAL 3 DAY),
    DATE_ADD(NOW(), INTERVAL 30 DAY)
FROM users u WHERE u.email = 'admin@univ.edu' LIMIT 1;

INSERT INTO system_announcements (title, content, announcement_type, is_pinned, display_priority, created_by, start_date, end_date)
SELECT
    '📬 私訊功能正式上線',
    '社團資訊系統全新私訊功能正式開放！同學現在可以直接透過平台私訊社團管理員或同學，並使用平台機器人的社團適配測驗找到最適合自己的社團。歡迎體驗並回饋使用心得。',
    'update', 0, 60, u.user_id,
    DATE_SUB(NOW(), INTERVAL 7 DAY),
    DATE_ADD(NOW(), INTERVAL 90 DAY)
FROM users u WHERE u.email = 'admin@univ.edu' LIMIT 1;

INSERT INTO system_announcements (title, content, announcement_type, is_pinned, display_priority, created_by, start_date, end_date)
SELECT
    '⚠️ 系統維護公告',
    '平台將於 2026 年 5 月 30 日（六）凌晨 02:00～04:00 進行例行系統維護，期間服務將暫停。請同學提前完成報名、繳費等相關操作。維護完成後系統將自動恢復，造成不便敬請見諒。',
    'maintenance', 1, 90, u.user_id,
    DATE_SUB(NOW(), INTERVAL 2 DAY),
    DATE_ADD(NOW(), INTERVAL 5 DAY)
FROM users u WHERE u.email = 'admin@univ.edu' LIMIT 1;

-- =============================================================
-- Section 5. 社團評價（10 筆）
-- =============================================================

-- 程式社（CSC001）× 5 筆
INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, is_anonymous, display_name, verified_participant, review_status, helpful_count, created_at)
SELECT c.club_id, u.user_id,
    5, '社課內容豐富，學到很多實用技術',
    '加入程式社後收穫滿滿！從 Python 基礎到演算法競賽都有系統性的課程，學長姐也很熱心。每週的 LeetCode 讀書會讓我刷題能力大幅提升，強力推薦給想精進程式能力的同學。',
    0, '李小明', 1, 'approved', 8,
    DATE_SUB(NOW(), INTERVAL 20 DAY)
FROM clubs c, users u
WHERE c.club_code = 'CSC001' AND u.email = 'demo_reviewer1@demo.edu'
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.club_id = c.club_id AND r.user_id = u.user_id);

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, is_anonymous, display_name, verified_participant, review_status, helpful_count, created_at)
SELECT c.club_id, u.user_id,
    4, '適合想轉換跑道的同學',
    '我是非資訊系的學生，加入程式社讓我從零開始學習程式設計。老師和幹部都很有耐心，課程進度也很適中。唯一建議是可以多辦一些業界分享，讓大家了解未來求職方向。',
    0, '陳美華', 1, 'approved', 5,
    DATE_SUB(NOW(), INTERVAL 15 DAY)
FROM clubs c, users u
WHERE c.club_code = 'CSC001' AND u.email = 'demo_reviewer2@demo.edu'
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.club_id = c.club_id AND r.user_id = u.user_id);

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, is_anonymous, display_name, verified_participant, review_status, helpful_count, created_at)
SELECT c.club_id, u.user_id,
    5, '參加 hackathon 拿到佳作，太感謝了',
    '在程式社的訓練下，我和隊友一起參加了校際黑客松，最終獲得佳作！社團提供的資源和學長姐的技術指導非常關鍵。這是我大學最有成就感的經歷之一。',
    0, '王大偉', 1, 'approved', 12,
    DATE_SUB(NOW(), INTERVAL 10 DAY)
FROM clubs c, users u
WHERE c.club_code = 'CSC001' AND u.email = 'demo_reviewer3@demo.edu'
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.club_id = c.club_id AND r.user_id = u.user_id);

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, is_anonymous, display_name, verified_participant, review_status, helpful_count, created_at)
SELECT c.club_id, u.user_id,
    4, '社群氛圍很好，學習動力大',
    '程式社的 Discord 群很活躍，大家會互相分享學習資源和求職心得。雖然有時課程內容偏難，但只要積極發問都會得到解答。整體來說是個很棒的學習社群。',
    1, '匿名社員', 0, 'approved', 3,
    DATE_SUB(NOW(), INTERVAL 8 DAY)
FROM clubs c, users u
WHERE c.club_code = 'CSC001' AND u.email = 'demo_reviewer4@demo.edu'
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.club_id = c.club_id AND r.user_id = u.user_id);

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, is_anonymous, display_name, verified_participant, review_status, helpful_count, created_at)
SELECT c.club_id, u.user_id,
    5, '最值得加入的技術社團',
    '加入程式社是我大學最正確的決定！不只學到技術，還認識了很多同樣有熱情的朋友，也因此找到了實習機會。社長和幹部都很認真負責，每次活動都辦得很有質感。',
    0, '林志豪', 1, 'approved', 7,
    DATE_SUB(NOW(), INTERVAL 5 DAY)
FROM clubs c, users u
WHERE c.club_code = 'CSC001' AND u.email = 'demo_reviewer5@demo.edu'
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.club_id = c.club_id AND r.user_id = u.user_id);

-- 熱舞社（067）× 5 筆
INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, is_anonymous, display_name, verified_participant, review_status, helpful_count, created_at)
SELECT c.club_id, u.user_id,
    5, '零基礎加入也能跳得很好！',
    '我完全沒有舞蹈基礎，一開始很擔心跟不上。但熱舞社的學長姐非常有耐心，從基本動作教起，三個月後我已經能上台表演了！期末公演是我大學最難忘的回憶之一。',
    0, '李小明', 1, 'approved', 15,
    DATE_SUB(NOW(), INTERVAL 18 DAY)
FROM clubs c, users u
WHERE c.club_code = '067' AND u.email = 'demo_reviewer1@demo.edu'
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.club_id = c.club_id AND r.user_id = u.user_id);

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, is_anonymous, display_name, verified_participant, review_status, helpful_count, created_at)
SELECT c.club_id, u.user_id,
    4, '舞種多元，找到自己的風格',
    '熱舞社涵蓋的舞種很多，讓我有機會嘗試不同風格。最後我選擇專攻 Locking，也在期末公演獨立編排了一段舞蹈。課程安排合理，不會佔用太多課業時間。',
    0, '陳美華', 1, 'approved', 9,
    DATE_SUB(NOW(), INTERVAL 12 DAY)
FROM clubs c, users u
WHERE c.club_code = '067' AND u.email = 'demo_reviewer2@demo.edu'
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.club_id = c.club_id AND r.user_id = u.user_id);

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, is_anonymous, display_name, verified_participant, review_status, helpful_count, created_at)
SELECT c.club_id, u.user_id,
    5, '公演超級感動，值得全力投入',
    '參加了兩年熱舞社，今年第一次當公演主要舞者。雖然密集練習很累，但站上舞台的那一刻什麼都值了！社團氣氛很棒，大家彼此支持鼓勵。',
    0, '王大偉', 1, 'approved', 20,
    DATE_SUB(NOW(), INTERVAL 6 DAY)
FROM clubs c, users u
WHERE c.club_code = '067' AND u.email = 'demo_reviewer3@demo.edu'
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.club_id = c.club_id AND r.user_id = u.user_id);

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, is_anonymous, display_name, verified_participant, review_status, helpful_count, created_at)
SELECT c.club_id, u.user_id,
    4, '體能訓練讓整個人更有活力',
    '每週的舞蹈訓練讓我體能和協調性都變好了，連平時走路姿態都改善很多。社費合理，師資也很專業。唯一就是練習室有時候人太多，空間稍嫌擁擠。',
    1, '匿名社員', 0, 'approved', 4,
    DATE_SUB(NOW(), INTERVAL 4 DAY)
FROM clubs c, users u
WHERE c.club_code = '067' AND u.email = 'demo_reviewer4@demo.edu'
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.club_id = c.club_id AND r.user_id = u.user_id);

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, is_anonymous, display_name, verified_participant, review_status, helpful_count, created_at)
SELECT c.club_id, u.user_id,
    5, '不只學跳舞，還交到一輩子的朋友',
    '熱舞社最棒的不只是舞蹈本身，而是這裡的人。大家在練習之外也會一起出去玩、慶生，建立起深厚的友誼。這裡是我大學生活最重要的歸屬感來源。',
    0, '林志豪', 1, 'approved', 11,
    DATE_SUB(NOW(), INTERVAL 2 DAY)
FROM clubs c, users u
WHERE c.club_code = '067' AND u.email = 'demo_reviewer5@demo.edu'
AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.club_id = c.club_id AND r.user_id = u.user_id);

-- =============================================================
-- Section 6. Logo 路徑清除（活動照片誤植移除）
-- =============================================================

-- 清除誤植的活動照片路徑，社團 logo 待正式圖示上傳後再設定
UPDATE clubs SET logo_path = NULL WHERE club_code IN ('067','066','061','064','075','084','100','168','184','192')
  AND logo_path LIKE 'assets/uploads/clubs/logo_%';


-- Section 7: Demo Q&A 提問、回覆、標籤、有幫助票
-- status='closed' → 前端顯示「已解決」
-- status='open'   → 前端顯示「待解決」
-- ============================================================

-- ─── Q1：CSC001 程式社 — Python 學習方向（closed，有官方回覆）────────
INSERT INTO q_and_a (club_id, user_id, question_title, question_content, urgency_level, status, views_count, created_at)
SELECT c.club_id, u.user_id,
    'Python 入門後該如何繼續進階學習？',
    '我是大一新生，剛學完 Python 基礎語法，但不知道接下來該朝哪個方向深入。社團課程有沒有推薦的學習路線？或者有什麼適合初學者的小專案可以練習？',
    'normal', 'closed', 47, NOW() - INTERVAL 5 DAY
FROM clubs c JOIN users u ON u.email = 'student@univ.edu'
WHERE c.club_code = 'CSC001'
  AND NOT EXISTS (SELECT 1 FROM q_and_a e WHERE e.club_id = c.club_id AND e.question_title = 'Python 入門後該如何繼續進階學習？');

INSERT INTO qa_replies (qa_id, user_id, reply_content, is_official_answer, is_accepted_solution, created_at)
SELECT q.qa_id, u.user_id,
    '建議從幾個方向擇一深入：\n1. Web 開發：Flask / Django，做個人 API 或網站\n2. 資料分析：Pandas、NumPy，搭配 Kaggle 新手賽\n3. 自動化腳本：爬蟲、排程任務\n\n社團下半學期有 Flask 入門課，名額有限，歡迎報名！',
    1, 1, NOW() - INTERVAL 4 DAY
FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id JOIN users u ON u.email = 'clubadmin@univ.edu'
WHERE c.club_code = 'CSC001' AND q.question_title = 'Python 入門後該如何繼續進階學習？'
  AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.qa_id = q.qa_id AND r.is_official_answer = 1);

INSERT INTO qa_replies (qa_id, user_id, reply_content, is_official_answer, is_accepted_solution, created_at)
SELECT q.qa_id, u.user_id,
    '另外推薦 LeetCode 的 Easy 題，訓練邏輯思維比只看教學更紮實。選定一個方向後再橫向擴展，不要同時學太多。',
    0, 0, NOW() - INTERVAL 3 DAY
FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id JOIN users u ON u.email = 'demo_reviewer1@demo.edu'
WHERE c.club_code = 'CSC001' AND q.question_title = 'Python 入門後該如何繼續進階學習？'
  AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.qa_id = q.qa_id AND r.user_id = u.user_id);

INSERT IGNORE INTO qa_tag_relations (qa_id, qa_tag_id)
SELECT q.qa_id, t.qa_tag_id FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id
JOIN qa_tags t ON t.tag_name IN ('入會資格', '其他')
WHERE c.club_code = 'CSC001' AND q.question_title = 'Python 入門後該如何繼續進階學習？';

INSERT INTO qa_reply_helpful (reply_id, user_id, vote_type)
SELECT r.reply_id, u.user_id, 'helpful'
FROM qa_replies r JOIN q_and_a q ON q.qa_id = r.qa_id JOIN clubs c ON c.club_id = q.club_id
JOIN users u ON u.email IN ('demo_reviewer2@demo.edu','demo_reviewer3@demo.edu','student@univ.edu')
WHERE c.club_code = 'CSC001' AND q.question_title = 'Python 入門後該如何繼續進階學習？' AND r.is_official_answer = 1
  AND NOT EXISTS (SELECT 1 FROM qa_reply_helpful h WHERE h.reply_id = r.reply_id AND h.user_id = u.user_id);

-- ─── Q2：CSC001 程式社 — 期末組隊（open，2 回覆）────────────────────
INSERT INTO q_and_a (club_id, user_id, question_title, question_content, urgency_level, status, views_count, created_at)
SELECT c.club_id, u.user_id,
    '期末專題要怎麼找到合適的隊友？',
    '聽說期末要做小組專題，想找有前端或資料庫技能的隊友，請問社團有沒有相關管道可以組隊？',
    'important', 'open', 83, NOW() - INTERVAL 12 DAY
FROM clubs c JOIN users u ON u.email = 'demo_reviewer1@demo.edu'
WHERE c.club_code = 'CSC001'
  AND NOT EXISTS (SELECT 1 FROM q_and_a e WHERE e.club_id = c.club_id AND e.question_title = '期末專題要怎麼找到合適的隊友？');

INSERT INTO qa_replies (qa_id, user_id, reply_content, is_official_answer, is_accepted_solution, created_at)
SELECT q.qa_id, u.user_id,
    '社團 LINE 群組有「組隊板」置頂訊息，可以在那裡發文說明自己的技能和需求。另外每次社課前有 5 分鐘找隊友時間，記得把握！',
    1, 0, NOW() - INTERVAL 10 DAY
FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id JOIN users u ON u.email = 'clubadmin@univ.edu'
WHERE c.club_code = 'CSC001' AND q.question_title = '期末專題要怎麼找到合適的隊友？'
  AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.qa_id = q.qa_id AND r.is_official_answer = 1);

INSERT INTO qa_replies (qa_id, user_id, reply_content, is_official_answer, is_accepted_solution, created_at)
SELECT q.qa_id, u.user_id,
    '建議在訊息裡寫清楚自己擅長的語言和希望做的題目方向，這樣比較容易吸引到互補的隊友。',
    0, 0, NOW() - INTERVAL 9 DAY
FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id JOIN users u ON u.email = 'demo_reviewer2@demo.edu'
WHERE c.club_code = 'CSC001' AND q.question_title = '期末專題要怎麼找到合適的隊友？'
  AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.qa_id = q.qa_id AND r.user_id = u.user_id);

INSERT IGNORE INTO qa_tag_relations (qa_id, qa_tag_id)
SELECT q.qa_id, t.qa_tag_id FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id
JOIN qa_tags t ON t.tag_name = '其他'
WHERE c.club_code = 'CSC001' AND q.question_title = '期末專題要怎麼找到合適的隊友？';

-- ─── Q3：067 熱舞社 — 零基礎可加入（closed，有官方回覆）───────────────
INSERT INTO q_and_a (club_id, user_id, question_title, question_content, urgency_level, status, views_count, created_at)
SELECT c.club_id, u.user_id,
    '完全沒舞蹈基礎可以加入嗎？',
    '對跳舞很有興趣，但從沒正式學過。擔心跟不上有基礎的社員，請問有適合新手的課程嗎？需要事先準備什麼？',
    'normal', 'closed', 92, NOW() - INTERVAL 8 DAY
FROM clubs c JOIN users u ON u.email = 'demo_reviewer2@demo.edu'
WHERE c.club_code = '067'
  AND NOT EXISTS (SELECT 1 FROM q_and_a e WHERE e.club_id = c.club_id AND e.question_title = '完全沒舞蹈基礎可以加入嗎？');

INSERT INTO qa_replies (qa_id, user_id, reply_content, is_official_answer, is_accepted_solution, created_at)
SELECT q.qa_id, u.user_id,
    '非常歡迎！每學期都有「零基礎班」，由幹部帶領從基本律動開始教。只需準備一雙舒適的運動鞋和換洗衣物即可 😊',
    1, 1, NOW() - INTERVAL 7 DAY
FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id JOIN users u ON u.email = 'demo_reviewer3@demo.edu'
WHERE c.club_code = '067' AND q.question_title = '完全沒舞蹈基礎可以加入嗎？'
  AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.qa_id = q.qa_id AND r.is_official_answer = 1);

INSERT INTO qa_replies (qa_id, user_id, reply_content, is_official_answer, is_accepted_solution, created_at)
SELECT q.qa_id, u.user_id,
    '我也是零基礎加入的！第一個月確實吃力，但幹部很有耐心，幾週後就開始找到感覺了，別怕！',
    0, 0, NOW() - INTERVAL 6 DAY
FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id JOIN users u ON u.email = 'student@univ.edu'
WHERE c.club_code = '067' AND q.question_title = '完全沒舞蹈基礎可以加入嗎？'
  AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.qa_id = q.qa_id AND r.user_id = u.user_id);

INSERT IGNORE INTO qa_tag_relations (qa_id, qa_tag_id)
SELECT q.qa_id, t.qa_tag_id FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id
JOIN qa_tags t ON t.tag_name IN ('迎新資訊', '入會資格')
WHERE c.club_code = '067' AND q.question_title = '完全沒舞蹈基礎可以加入嗎？';

INSERT INTO qa_reply_helpful (reply_id, user_id, vote_type)
SELECT r.reply_id, u.user_id, 'helpful'
FROM qa_replies r JOIN q_and_a q ON q.qa_id = r.qa_id JOIN clubs c ON c.club_id = q.club_id
JOIN users u ON u.email IN ('demo_reviewer4@demo.edu','demo_reviewer5@demo.edu','student@univ.edu')
WHERE c.club_code = '067' AND q.question_title = '完全沒舞蹈基礎可以加入嗎？' AND r.is_official_answer = 1
  AND NOT EXISTS (SELECT 1 FROM qa_reply_helpful h WHERE h.reply_id = r.reply_id AND h.user_id = u.user_id);

-- ─── Q4：067 熱舞社 — 練習頻率（open，1 回覆）──────────────────────
INSERT INTO q_and_a (club_id, user_id, question_title, question_content, urgency_level, status, views_count, created_at)
SELECT c.club_id, u.user_id,
    '每週需要練習幾次？對課業影響大嗎？',
    '很想加入但怕練習時間太多影響課業。請問一般社員一週要來幾次？期中考前後有沒有調整練習頻率？',
    'normal', 'open', 38, NOW() - INTERVAL 3 DAY
FROM clubs c JOIN users u ON u.email = 'student@univ.edu'
WHERE c.club_code = '067'
  AND NOT EXISTS (SELECT 1 FROM q_and_a e WHERE e.club_id = c.club_id AND e.question_title = '每週需要練習幾次？對課業影響大嗎？');

INSERT INTO qa_replies (qa_id, user_id, reply_content, is_official_answer, is_accepted_solution, created_at)
SELECT q.qa_id, u.user_id,
    '一般社課一週一次（週三晚 18:00-20:00），表演前兩週增加到兩次。期中考周通常暫停一次讓大家備考，時間管理上是 OK 的，我大二一邊修 18 學分一邊參加。',
    0, 0, NOW() - INTERVAL 2 DAY
FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id JOIN users u ON u.email = 'demo_reviewer4@demo.edu'
WHERE c.club_code = '067' AND q.question_title = '每週需要練習幾次？對課業影響大嗎？'
  AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.qa_id = q.qa_id AND r.user_id = u.user_id);

INSERT IGNORE INTO qa_tag_relations (qa_id, qa_tag_id)
SELECT q.qa_id, t.qa_tag_id FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id
JOIN qa_tags t ON t.tag_name = '社課時間'
WHERE c.club_code = '067' AND q.question_title = '每週需要練習幾次？對課業影響大嗎？';

-- ─── Q5：066 攝影社 — 相機設備（closed，有官方回覆）────────────────────
INSERT INTO q_and_a (club_id, user_id, question_title, question_content, urgency_level, status, views_count, created_at)
SELECT c.club_id, u.user_id,
    '入社需要自備相機嗎？手機可以嗎？',
    '對攝影很有興趣但還沒有相機，預算有限。請問入社一定要有單眼相機嗎？用手機參加課程和外拍可以嗎？',
    'normal', 'closed', 65, NOW() - INTERVAL 15 DAY
FROM clubs c JOIN users u ON u.email = 'demo_reviewer3@demo.edu'
WHERE c.club_code = '066'
  AND NOT EXISTS (SELECT 1 FROM q_and_a e WHERE e.club_id = c.club_id AND e.question_title = '入社需要自備相機嗎？手機可以嗎？');

INSERT INTO qa_replies (qa_id, user_id, reply_content, is_official_answer, is_accepted_solution, created_at)
SELECT q.qa_id, u.user_id,
    '完全不需要！社團備有 Canon EOS R50 和 Sony ZV-E10 各兩台可免費借用（需提前預約）。初期用手機也完全 OK，我們更注重構圖概念和後製技巧，設備是其次。',
    1, 1, NOW() - INTERVAL 14 DAY
FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id JOIN users u ON u.email = 'demo_reviewer5@demo.edu'
WHERE c.club_code = '066' AND q.question_title = '入社需要自備相機嗎？手機可以嗎？'
  AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.qa_id = q.qa_id AND r.is_official_answer = 1);

INSERT IGNORE INTO qa_tag_relations (qa_id, qa_tag_id)
SELECT q.qa_id, t.qa_tag_id FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id
JOIN qa_tags t ON t.tag_name IN ('器材費用', '入會資格')
WHERE c.club_code = '066' AND q.question_title = '入社需要自備相機嗎？手機可以嗎？';

INSERT INTO qa_reply_helpful (reply_id, user_id, vote_type)
SELECT r.reply_id, u.user_id, 'helpful'
FROM qa_replies r JOIN q_and_a q ON q.qa_id = r.qa_id JOIN clubs c ON c.club_id = q.club_id
JOIN users u ON u.email IN ('demo_reviewer1@demo.edu','demo_reviewer2@demo.edu','student@univ.edu')
WHERE c.club_code = '066' AND q.question_title = '入社需要自備相機嗎？手機可以嗎？' AND r.is_official_answer = 1
  AND NOT EXISTS (SELECT 1 FROM qa_reply_helpful h WHERE h.reply_id = r.reply_id AND h.user_id = u.user_id);

-- ─── Q6：075 登山社 — 新生體能要求（open，1 回覆）──────────────────
INSERT INTO q_and_a (club_id, user_id, question_title, question_content, urgency_level, status, views_count, created_at)
SELECT c.club_id, u.user_id,
    '新生需要什麼體能程度才能參加行程？',
    '從沒爬過山，平常只有偶爾慢跑。社團的行程對新手來說會不會太困難？有沒有入門級路線？',
    'important', 'open', 29, NOW() - INTERVAL 2 DAY
FROM clubs c JOIN users u ON u.email = 'demo_reviewer4@demo.edu'
WHERE c.club_code = '075'
  AND NOT EXISTS (SELECT 1 FROM q_and_a e WHERE e.club_id = c.club_id AND e.question_title = '新生需要什麼體能程度才能參加行程？');

INSERT INTO qa_replies (qa_id, user_id, reply_content, is_official_answer, is_accepted_solution, created_at)
SELECT q.qa_id, u.user_id,
    '社團行程分三個難度：★ 親子級（象山、碧潭）、★★ 一般級（大屯山、七星山）、★★★ 挑戰級（雪山圈谷）。新生優先安排 ★ 和 ★★，平常有慢跑習慣就完全沒問題！',
    0, 0, NOW() - INTERVAL 1 DAY
FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id JOIN users u ON u.email = 'demo_reviewer1@demo.edu'
WHERE c.club_code = '075' AND q.question_title = '新生需要什麼體能程度才能參加行程？'
  AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.qa_id = q.qa_id AND r.user_id = u.user_id);

INSERT IGNORE INTO qa_tag_relations (qa_id, qa_tag_id)
SELECT q.qa_id, t.qa_tag_id FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id
JOIN qa_tags t ON t.tag_name IN ('活動行程', '入會資格')
WHERE c.club_code = '075' AND q.question_title = '新生需要什麼體能程度才能參加行程？';

-- ─── Q7：049 健言社 — 校外比賽機會（closed，有官方回覆）──────────────
INSERT INTO q_and_a (club_id, user_id, question_title, question_content, urgency_level, status, views_count, created_at)
SELECT c.club_id, u.user_id,
    '社員有機會參加校外演講或辯論比賽嗎？',
    '我加入的主要目標是提升公開表達能力，希望有機會在校外比賽磨練。請問健言社每年參加哪些比賽？選手怎麼選拔？',
    'normal', 'closed', 55, NOW() - INTERVAL 20 DAY
FROM clubs c JOIN users u ON u.email = 'demo_reviewer5@demo.edu'
WHERE c.club_code = '049'
  AND NOT EXISTS (SELECT 1 FROM q_and_a e WHERE e.club_id = c.club_id AND e.question_title = '社員有機會參加校外演講或辯論比賽嗎？');

INSERT INTO qa_replies (qa_id, user_id, reply_content, is_official_answer, is_accepted_solution, created_at)
SELECT q.qa_id, u.user_id,
    '每學期都有！固定參加：全國大專即席演講賽、北區校際辯論邀請賽、師大盃演講大賽。選拔方式是社內先辦模擬賽，前幾名代表出賽。一般社員第一年累積社內經驗，第二年再報名選拔。',
    1, 1, NOW() - INTERVAL 18 DAY
FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id JOIN users u ON u.email = 'demo_reviewer2@demo.edu'
WHERE c.club_code = '049' AND q.question_title = '社員有機會參加校外演講或辯論比賽嗎？'
  AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.qa_id = q.qa_id AND r.is_official_answer = 1);

INSERT INTO qa_replies (qa_id, user_id, reply_content, is_official_answer, is_accepted_solution, created_at)
SELECT q.qa_id, u.user_id,
    '補充：去年有兩位社員拿到北區賽第二名。如有興趣，可先從社內「週五練功場」（自願參加的額外練習）開始磨練。',
    0, 0, NOW() - INTERVAL 17 DAY
FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id JOIN users u ON u.email = 'demo_reviewer3@demo.edu'
WHERE c.club_code = '049' AND q.question_title = '社員有機會參加校外演講或辯論比賽嗎？'
  AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.qa_id = q.qa_id AND r.user_id = u.user_id);

INSERT IGNORE INTO qa_tag_relations (qa_id, qa_tag_id)
SELECT q.qa_id, t.qa_tag_id FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id
JOIN qa_tags t ON t.tag_name = '活動行程'
WHERE c.club_code = '049' AND q.question_title = '社員有機會參加校外演講或辯論比賽嗎？';

INSERT INTO qa_reply_helpful (reply_id, user_id, vote_type)
SELECT r.reply_id, u.user_id, 'helpful'
FROM qa_replies r JOIN q_and_a q ON q.qa_id = r.qa_id JOIN clubs c ON c.club_id = q.club_id
JOIN users u ON u.email IN ('demo_reviewer1@demo.edu','demo_reviewer4@demo.edu','student@univ.edu')
WHERE c.club_code = '049' AND q.question_title = '社員有機會參加校外演講或辯論比賽嗎？' AND r.is_official_answer = 1
  AND NOT EXISTS (SELECT 1 FROM qa_reply_helpful h WHERE h.reply_id = r.reply_id AND h.user_id = u.user_id);

-- ─── Q8：168 桌上遊戲社 — 社費說明（open，1 回覆）──────────────────
INSERT INTO q_and_a (club_id, user_id, question_title, question_content, urgency_level, status, views_count, created_at)
SELECT c.club_id, u.user_id,
    '社費包含哪些費用？需要自備桌遊嗎？',
    '想加入但先了解社費用途。社費是每學期還是每年收？有沒有包含場地或桌遊費用？自己有幾套桌遊，加入後可以帶來讓大家玩嗎？',
    'normal', 'open', 42, NOW() - INTERVAL 4 DAY
FROM clubs c JOIN users u ON u.email = 'student@univ.edu'
WHERE c.club_code = '168'
  AND NOT EXISTS (SELECT 1 FROM q_and_a e WHERE e.club_id = c.club_id AND e.question_title = '社費包含哪些費用？需要自備桌遊嗎？');

INSERT INTO qa_replies (qa_id, user_id, reply_content, is_official_answer, is_accepted_solution, created_at)
SELECT q.qa_id, u.user_id,
    '社費每學期 300 元，包含：場地使用費（學生活動中心教室）、社內桌遊購置費。所有桌遊由社團統一管理，社員免費借用，完全不需要自備。\n\n自己有桌遊想帶來讓大家玩非常歡迎！每月有一次「社員帶遊」活動，可以分享自己的收藏。',
    0, 0, NOW() - INTERVAL 3 DAY
FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id JOIN users u ON u.email = 'demo_reviewer4@demo.edu'
WHERE c.club_code = '168' AND q.question_title = '社費包含哪些費用？需要自備桌遊嗎？'
  AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.qa_id = q.qa_id AND r.user_id = u.user_id);

INSERT IGNORE INTO qa_tag_relations (qa_id, qa_tag_id)
SELECT q.qa_id, t.qa_tag_id FROM q_and_a q JOIN clubs c ON c.club_id = q.club_id
JOIN qa_tags t ON t.tag_name = '器材費用'
WHERE c.club_code = '168' AND q.question_title = '社費包含哪些費用？需要自備桌遊嗎？';

-- =============================================================
-- Section 8. 活動照片（更新主海報 + 插入 event_posters）
-- =============================================================

-- 更新各活動的主海報路徑為主題照片
UPDATE events SET poster_path = 'assets/uploads/demo_dance_show_1.jpg'
WHERE event_name = '熱舞社春季期末公演';

UPDATE events SET poster_path = 'assets/uploads/demo_dance_recruit_1.jpg'
WHERE event_name = '熱舞社新生招募說明會';

UPDATE events SET poster_path = 'assets/uploads/demo_photo_outing_1.jpg'
WHERE event_name = '攝影社春季戶外外拍活動';

UPDATE events SET poster_path = 'assets/uploads/demo_photo_exhibition_1.jpg'
WHERE event_name = '2026 黑白攝影聯展';

UPDATE events SET poster_path = 'assets/uploads/demo_music_concert_1.jpg'
WHERE event_name = '2026 春季國樂聯合音樂會';

UPDATE events SET poster_path = 'assets/uploads/demo_hiking_1.jpg'
WHERE event_name = '登山社春季郊山健行：象山一日遊';

UPDATE events SET poster_path = 'assets/uploads/demo_martial_arts_1.jpg'
WHERE event_name = '國術社招新體驗日';

UPDATE events SET poster_path = 'assets/uploads/demo_speech_1.jpg'
WHERE event_name = '2026 校際即席演講邀請賽';

UPDATE events SET poster_path = 'assets/uploads/demo_firstaid_1.jpg'
WHERE event_name = 'CPR 急救技能認證訓練課程';

UPDATE events SET poster_path = 'assets/uploads/demo_boardgame_1.jpg'
WHERE event_name = '春季桌遊馬拉松 12 小時不間斷';

UPDATE events SET poster_path = 'assets/uploads/demo_esports_1.jpg'
WHERE event_name = 'FPS 電競校內邀請賽（CS2）';

UPDATE events SET poster_path = 'assets/uploads/demo_startup_1.jpg'
WHERE event_name = 'Startup Weekend 創業挑戰工作坊';

-- 插入 event_posters 多張照片（冪等：依 event_id + image_path 避免重複）
INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, p.image_path, p.sort_order
FROM events e
JOIN (
    SELECT '熱舞社春季期末公演' AS event_name, 'assets/uploads/demo_dance_show_1.jpg' AS image_path, 1 AS sort_order UNION ALL
    SELECT '熱舞社春季期末公演',               'assets/uploads/demo_dance_show_2.jpg', 2 UNION ALL
    SELECT '熱舞社春季期末公演',               'assets/uploads/demo_dance_show_3.jpg', 3 UNION ALL
    SELECT '熱舞社新生招募說明會',             'assets/uploads/demo_dance_recruit_1.jpg', 1 UNION ALL
    SELECT '熱舞社新生招募說明會',             'assets/uploads/demo_dance_recruit_2.jpg', 2 UNION ALL
    SELECT '攝影社春季戶外外拍活動',           'assets/uploads/demo_photo_outing_1.jpg',  1 UNION ALL
    SELECT '攝影社春季戶外外拍活動',           'assets/uploads/demo_photo_outing_2.jpg',  2 UNION ALL
    SELECT '2026 黑白攝影聯展',               'assets/uploads/demo_photo_exhibition_1.jpg', 1 UNION ALL
    SELECT '2026 黑白攝影聯展',               'assets/uploads/demo_photo_exhibition_2.jpg', 2 UNION ALL
    SELECT '2026 黑白攝影聯展',               'assets/uploads/demo_photo_exhibition_3.jpg', 3 UNION ALL
    SELECT '2026 春季國樂聯合音樂會',          'assets/uploads/demo_music_concert_1.jpg', 1 UNION ALL
    SELECT '2026 春季國樂聯合音樂會',          'assets/uploads/demo_music_concert_2.jpg', 2 UNION ALL
    SELECT '2026 春季國樂聯合音樂會',          'assets/uploads/demo_music_concert_3.jpg', 3 UNION ALL
    SELECT '登山社春季郊山健行：象山一日遊',   'assets/uploads/demo_hiking_1.jpg', 1 UNION ALL
    SELECT '登山社春季郊山健行：象山一日遊',   'assets/uploads/demo_hiking_2.jpg', 2 UNION ALL
    SELECT '國術社招新體驗日',                 'assets/uploads/demo_martial_arts_1.jpg', 1 UNION ALL
    SELECT '2026 校際即席演講邀請賽',          'assets/uploads/demo_speech_1.jpg', 1 UNION ALL
    SELECT 'CPR 急救技能認證訓練課程',         'assets/uploads/demo_firstaid_1.jpg', 1 UNION ALL
    SELECT '春季桌遊馬拉松 12 小時不間斷',    'assets/uploads/demo_boardgame_1.jpg', 1 UNION ALL
    SELECT '春季桌遊馬拉松 12 小時不間斷',    'assets/uploads/demo_boardgame_2.jpg', 2 UNION ALL
    SELECT 'FPS 電競校內邀請賽（CS2）',       'assets/uploads/demo_esports_1.jpg', 1 UNION ALL
    SELECT 'FPS 電競校內邀請賽（CS2）',       'assets/uploads/demo_esports_2.jpg', 2 UNION ALL
    SELECT 'Startup Weekend 創業挑戰工作坊',  'assets/uploads/demo_startup_1.jpg', 1 UNION ALL
    SELECT 'Startup Weekend 創業挑戰工作坊',  'assets/uploads/demo_startup_2.jpg', 2
) p ON p.event_name = e.event_name
WHERE NOT EXISTS (
    SELECT 1 FROM event_posters ep
    WHERE ep.event_id = e.event_id AND ep.image_path = p.image_path
);

-- =============================================================
-- Section 9. Demo 評論者社交資料（追蹤、加入社團、報名活動）
-- 讓 5 位 reviewer 帳號具備真實的社團參與歷程
-- =============================================================

-- ── reviewer1 李小明（理科/技術）────────────────────────────────

INSERT INTO club_members (club_id, user_id, role, join_date, is_active, fee_type, fee_paid)
SELECT c.club_id, u.user_id, 'member', DATE_SUB(NOW(), INTERVAL 60 DAY), 1, 'semester', 1
FROM clubs c, users u WHERE c.club_code = 'CSC001' AND u.email = 'demo_reviewer1@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_members m WHERE m.club_id = c.club_id AND m.user_id = u.user_id);

INSERT INTO club_members (club_id, user_id, role, join_date, is_active, fee_type, fee_paid)
SELECT c.club_id, u.user_id, 'member', DATE_SUB(NOW(), INTERVAL 45 DAY), 1, 'semester', 1
FROM clubs c, users u WHERE c.club_code = '067' AND u.email = 'demo_reviewer1@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_members m WHERE m.club_id = c.club_id AND m.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 1 FROM clubs c, users u
WHERE c.club_code = '066' AND u.email = 'demo_reviewer1@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 1 FROM clubs c, users u
WHERE c.club_code = '075' AND u.email = 'demo_reviewer1@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 0 FROM clubs c, users u
WHERE c.club_code = '082' AND u.email = 'demo_reviewer1@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 0 FROM clubs c, users u
WHERE c.club_code = '184' AND u.email = 'demo_reviewer1@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO event_registrations (event_id, user_id, registered_at, status)
SELECT e.event_id, u.user_id, DATE_SUB(NOW(), INTERVAL 5 DAY), 'approved'
FROM events e, users u WHERE e.event_name = '熱舞社春季期末公演' AND u.email = 'demo_reviewer1@demo.edu'
AND NOT EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.event_id AND r.user_id = u.user_id);

INSERT INTO event_registrations (event_id, user_id, registered_at, status)
SELECT e.event_id, u.user_id, DATE_SUB(NOW(), INTERVAL 3 DAY), 'approved'
FROM events e, users u WHERE e.event_name = '登山社春季郊山健行：象山一日遊' AND u.email = 'demo_reviewer1@demo.edu'
AND NOT EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.event_id AND r.user_id = u.user_id);

-- ── reviewer2 陳美華（藝術/文化）────────────────────────────────

INSERT INTO club_members (club_id, user_id, role, join_date, is_active, fee_type, fee_paid)
SELECT c.club_id, u.user_id, 'member', DATE_SUB(NOW(), INTERVAL 55 DAY), 1, 'semester', 1
FROM clubs c, users u WHERE c.club_code = '066' AND u.email = 'demo_reviewer2@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_members m WHERE m.club_id = c.club_id AND m.user_id = u.user_id);

INSERT INTO club_members (club_id, user_id, role, join_date, is_active, fee_type, fee_paid)
SELECT c.club_id, u.user_id, 'member', DATE_SUB(NOW(), INTERVAL 40 DAY), 1, 'semester', 1
FROM clubs c, users u WHERE c.club_code = '064' AND u.email = 'demo_reviewer2@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_members m WHERE m.club_id = c.club_id AND m.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 1 FROM clubs c, users u
WHERE c.club_code = '061' AND u.email = 'demo_reviewer2@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 1 FROM clubs c, users u
WHERE c.club_code = '067' AND u.email = 'demo_reviewer2@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 0 FROM clubs c, users u
WHERE c.club_code = '123' AND u.email = 'demo_reviewer2@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO event_registrations (event_id, user_id, registered_at, status)
SELECT e.event_id, u.user_id, DATE_SUB(NOW(), INTERVAL 7 DAY), 'approved'
FROM events e, users u WHERE e.event_name = '攝影社春季戶外外拍活動' AND u.email = 'demo_reviewer2@demo.edu'
AND NOT EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.event_id AND r.user_id = u.user_id);

INSERT INTO event_registrations (event_id, user_id, registered_at, status)
SELECT e.event_id, u.user_id, DATE_SUB(NOW(), INTERVAL 4 DAY), 'approved'
FROM events e, users u WHERE e.event_name = '2026 黑白攝影聯展' AND u.email = 'demo_reviewer2@demo.edu'
AND NOT EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.event_id AND r.user_id = u.user_id);

-- ── reviewer3 王大偉（音樂/表演）────────────────────────────────

INSERT INTO club_members (club_id, user_id, role, join_date, is_active, fee_type, fee_paid)
SELECT c.club_id, u.user_id, 'member', DATE_SUB(NOW(), INTERVAL 70 DAY), 1, 'semester', 1
FROM clubs c, users u WHERE c.club_code = '061' AND u.email = 'demo_reviewer3@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_members m WHERE m.club_id = c.club_id AND m.user_id = u.user_id);

INSERT INTO club_members (club_id, user_id, role, join_date, is_active, fee_type, fee_paid)
SELECT c.club_id, u.user_id, 'member', DATE_SUB(NOW(), INTERVAL 50 DAY), 1, 'semester', 1
FROM clubs c, users u WHERE c.club_code = '049' AND u.email = 'demo_reviewer3@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_members m WHERE m.club_id = c.club_id AND m.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 1 FROM clubs c, users u
WHERE c.club_code = '064' AND u.email = 'demo_reviewer3@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 1 FROM clubs c, users u
WHERE c.club_code = '123' AND u.email = 'demo_reviewer3@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 0 FROM clubs c, users u
WHERE c.club_code = '066' AND u.email = 'demo_reviewer3@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 0 FROM clubs c, users u
WHERE c.club_code = '067' AND u.email = 'demo_reviewer3@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO event_registrations (event_id, user_id, registered_at, status)
SELECT e.event_id, u.user_id, DATE_SUB(NOW(), INTERVAL 10 DAY), 'approved'
FROM events e, users u WHERE e.event_name = '2026 春季國樂聯合音樂會' AND u.email = 'demo_reviewer3@demo.edu'
AND NOT EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.event_id AND r.user_id = u.user_id);

INSERT INTO event_registrations (event_id, user_id, registered_at, status)
SELECT e.event_id, u.user_id, DATE_SUB(NOW(), INTERVAL 6 DAY), 'approved'
FROM events e, users u WHERE e.event_name = '2026 校際即席演講邀請賽' AND u.email = 'demo_reviewer3@demo.edu'
AND NOT EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.event_id AND r.user_id = u.user_id);

-- ── reviewer4 張雅婷（運動/健康）────────────────────────────────

INSERT INTO club_members (club_id, user_id, role, join_date, is_active, fee_type, fee_paid)
SELECT c.club_id, u.user_id, 'member', DATE_SUB(NOW(), INTERVAL 65 DAY), 1, 'semester', 1
FROM clubs c, users u WHERE c.club_code = '075' AND u.email = 'demo_reviewer4@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_members m WHERE m.club_id = c.club_id AND m.user_id = u.user_id);

INSERT INTO club_members (club_id, user_id, role, join_date, is_active, fee_type, fee_paid)
SELECT c.club_id, u.user_id, 'member', DATE_SUB(NOW(), INTERVAL 35 DAY), 1, 'semester', 1
FROM clubs c, users u WHERE c.club_code = '092' AND u.email = 'demo_reviewer4@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_members m WHERE m.club_id = c.club_id AND m.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 1 FROM clubs c, users u
WHERE c.club_code = '084' AND u.email = 'demo_reviewer4@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 1 FROM clubs c, users u
WHERE c.club_code = '090' AND u.email = 'demo_reviewer4@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 0 FROM clubs c, users u
WHERE c.club_code = '100' AND u.email = 'demo_reviewer4@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO event_registrations (event_id, user_id, registered_at, status)
SELECT e.event_id, u.user_id, DATE_SUB(NOW(), INTERVAL 8 DAY), 'approved'
FROM events e, users u WHERE e.event_name = '登山社春季郊山健行：象山一日遊' AND u.email = 'demo_reviewer4@demo.edu'
AND NOT EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.event_id AND r.user_id = u.user_id);

INSERT INTO event_registrations (event_id, user_id, registered_at, status)
SELECT e.event_id, u.user_id, DATE_SUB(NOW(), INTERVAL 5 DAY), 'approved'
FROM events e, users u WHERE e.event_name = 'CPR 急救技能認證訓練課程' AND u.email = 'demo_reviewer4@demo.edu'
AND NOT EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.event_id AND r.user_id = u.user_id);

-- ── reviewer5 林志豪（社交/遊戲）────────────────────────────────

INSERT INTO club_members (club_id, user_id, role, join_date, is_active, fee_type, fee_paid)
SELECT c.club_id, u.user_id, 'member', DATE_SUB(NOW(), INTERVAL 42 DAY), 1, 'semester', 1
FROM clubs c, users u WHERE c.club_code = '168' AND u.email = 'demo_reviewer5@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_members m WHERE m.club_id = c.club_id AND m.user_id = u.user_id);

INSERT INTO club_members (club_id, user_id, role, join_date, is_active, fee_type, fee_paid)
SELECT c.club_id, u.user_id, 'member', DATE_SUB(NOW(), INTERVAL 30 DAY), 1, 'semester', 1
FROM clubs c, users u WHERE c.club_code = '082' AND u.email = 'demo_reviewer5@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_members m WHERE m.club_id = c.club_id AND m.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 1 FROM clubs c, users u
WHERE c.club_code = '067' AND u.email = 'demo_reviewer5@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 1 FROM clubs c, users u
WHERE c.club_code = '184' AND u.email = 'demo_reviewer5@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 0 FROM clubs c, users u
WHERE c.club_code = '092' AND u.email = 'demo_reviewer5@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO club_followers (club_id, user_id, is_subscribing_notifications)
SELECT c.club_id, u.user_id, 0 FROM clubs c, users u
WHERE c.club_code = '090' AND u.email = 'demo_reviewer5@demo.edu'
AND NOT EXISTS (SELECT 1 FROM club_followers f WHERE f.club_id = c.club_id AND f.user_id = u.user_id);

INSERT INTO event_registrations (event_id, user_id, registered_at, status)
SELECT e.event_id, u.user_id, DATE_SUB(NOW(), INTERVAL 4 DAY), 'approved'
FROM events e, users u WHERE e.event_name = '春季桌遊馬拉松 12 小時不間斷' AND u.email = 'demo_reviewer5@demo.edu'
AND NOT EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.event_id AND r.user_id = u.user_id);

INSERT INTO event_registrations (event_id, user_id, registered_at, status)
SELECT e.event_id, u.user_id, DATE_SUB(NOW(), INTERVAL 2 DAY), 'approved'
FROM events e, users u WHERE e.event_name = 'FPS 電競校內邀請賽（CS2）' AND u.email = 'demo_reviewer5@demo.edu'
AND NOT EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.event_id AND r.user_id = u.user_id);

