-- Demo 撅內鞈?嚗‵?冗?底?暑?????-- 閮剛??箏???瑁?嚗蝑?嚗蝙??WHERE NOT EXISTS / INSERT IGNORE / 撘瑕 UPDATE
-- 瘜冽?嚗?亙撥?嗉?撖恬?銝? WHERE 璇辣?嚗Ⅱ靽隢?潛雿?憟
USE club_platform;

-- =============================================================
-- 1. ?湔 20 ?蜓閬冗??撅內鞈?嚗撥?嗉?撖恬?
-- =============================================================

-- ??嚗?冗
UPDATE clubs SET
    description      = '瘨菔?銵??-POP?憯怎?憭??◢嚗?摮豢??齒憭批???撅?嚗?∪???瑟暑????蝷曉?銋??迭餈?箇??飛銝韏瑕??伐??勗飛?瑕?敺蝷葆韏瘀?鈭怠?????頞??',
    meeting_day      = '?曹?',
    meeting_time     = '18:00-21:00',
    meeting_location = '??憭扳? A305 ???恕',
    contact_email    = 'dance.club@univ.edu',
    contact_phone    = '0912345001',
    club_fee         = 300,
    activity_badge   = 'high_active',
    last_activity_date = NOW(),
    last_updated     = NOW()
WHERE club_code = '067';

-- ??嚗?敶梁冗
UPDATE clubs SET
    description      = '?券?剛???瘣餌?蝢末?祇?嚗飛蝧?敶望???蝺??刻? Lightroom 敺ˊ?銵?摮豢??齒銝駁??蔣撅??游???蝜??暑??敺?撅望?瘚瑕硫嚗????臬??臬末?唳??,
    meeting_day      = '?勗?',
    meeting_time     = '19:00-21:00',
    meeting_location = '??擗?3F ?蔣撖阡?摰?,
    contact_email    = 'photo.club@univ.edu',
    contact_phone    = '0912345002',
    club_fee         = 200,
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 2 DAY),
    last_updated     = NOW()
WHERE club_code = '066';

-- ??嚗?璅冗
UPDATE clubs SET
    description      = '?單銝剛????嚗?憟?嗚??～蝞?摮??喟絞璅??隢?豢??脤??舐隞?蝺剁???蝷曆誑蝎曄溶瞍??銵帑?璅?蝢?撟渲?颲西?璅?嚗迭餈璅?憟質??乓?,
    meeting_day      = '?曹?',
    meeting_time     = '14:00-17:00',
    meeting_location = '?單?撱?B1 ?毀摰?,
    contact_email    = 'music.club@univ.edu',
    contact_phone    = '0912345003',
    club_fee         = 500,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 5 DAY),
    last_updated     = NOW()
WHERE club_code = '061';

-- ??嚗瘜冗
UPDATE clubs SET
    description      = '??瘥??豢???嚗?璆瑟???詨?嚗???銝???箇???銋??冗隤脩?豢??葦??嚗???颲行瘥急?鞈質?雿?撅?霈蝯望???曆誨?∪?銝剖辣蝥?,
    meeting_day      = '?曹?',
    meeting_time     = '19:00-21:00',
    meeting_location = '鈭箸?擗?H301 ?豢??恕',
    contact_email    = 'calligraphy.club@univ.edu',
    contact_phone    = '0912345004',
    club_fee         = 200,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 10 DAY),
    last_updated     = NOW()
WHERE club_code = '064';

-- ??嚗?渡冗
UPDATE clubs SET
    description      = '蝤函毀?潛瞍??撌改?敺?豢??唳?銵?桀?嗡蒂?身?犖蝺渡??挾嚗???颲血??璅?鈭急?嚗?瘥?蝷曉?賣?璈??刻??唬?撅瞍?????,
    meeting_day      = '?曹?',
    meeting_time     = '19:00-21:00',
    meeting_location = '?單?撱?B1 ?湔',
    contact_email    = 'piano.club@univ.edu',
    contact_phone    = '0912345005',
    club_fee         = 300,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 7 DAY),
    last_updated     = NOW()
WHERE club_code = '123';

-- 擃嚗撅梁冗
UPDATE clubs SET
    description      = '閬??啁?控?撅梯楝蝺?敺?撅勗銵?曉眾?嚗擗控???質??嗅?摰蝝??????渲???湛?瘥?摰?撅梯?嚗??飛?典之?芰銝剔ㄗ蝺渲澈敹?,
    meeting_day      = '?勗',
    meeting_time     = '07:00-12:00',
    meeting_location = '擃擗典誨?湛??箇??暺?',
    contact_email    = 'mountain.club@univ.edu',
    contact_phone    = '0912345006',
    club_fee         = 400,
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 3 DAY),
    last_updated     = NOW()
WHERE club_code = '075';

-- 擃嚗?銵冗
UPDATE clubs SET
    description      = '?單銝剛甇西?蝎暸?嚗憿批撥頨怠擃????單???箇???啣?頝臬?蝺湛??梯?瘛望?蝺渲扛?芣?撠?????郎銵漱瘚魚嚗??曄揹撖血?摨?,
    meeting_day      = '?曹?',
    meeting_time     = '19:00-21:00',
    meeting_location = '甇西?擗?M101',
    contact_email    = 'martial.club@univ.edu',
    contact_phone    = '0912345007',
    club_fee         = 300,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 8 DAY),
    last_updated     = NOW()
WHERE club_code = '084';

-- 擃嚗??冗
UPDATE clubs SET
    description      = '?Ｙ揣???情璉?摮?蝑?撘???甇∟??飛?擃????冗隤脫?璉??飛?儔?文???摰??齒蝷曉?隢魚嚗蒂蝛扔???⊿?璉魚??,
    meeting_day      = '?勗?',
    meeting_time     = '19:30-21:30',
    meeting_location = '?擗?1F 璉??梯汗摰?,
    contact_email    = 'chess.club@univ.edu',
    contact_phone    = '0912345008',
    club_fee         = 100,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 6 DAY),
    last_updated     = NOW()
WHERE club_code = '082';

-- 擃嚗雯?冗
UPDATE clubs SET
    description      = '摮貊?蝬脩??箇??格??郊瘜??啗?撣?嚗迭餈?箇??圈脤?蝔漲?飛?????撅祉毀蝧?堆?摰??齒蝷曉?航魚嚗蒂???∠雯?冗?脰??盲鈭斗???,
    meeting_day      = '?曹?',
    meeting_time     = '17:00-19:00',
    meeting_location = '擃擗函雯?嚗?湛?',
    contact_email    = 'tennis.club@univ.edu',
    contact_phone    = '0912345009',
    club_fee         = 400,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 4 DAY),
    last_updated     = NOW()
WHERE club_code = '092';

-- 擃嚗噬?冗嚗???閮?靽????箇?鞈?嚗?UPDATE clubs SET
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 1 DAY),
    last_updated     = NOW()
WHERE club_code = '090';

-- 摮貉?嚗閮蝷?UPDATE clubs SET
    description      = '?寥?瞍??劑隢??敺?頛舀雁?啣憸典???Ｘ?????颲血撣剜?雓?鞈賬劑隢魚?冗?漱瘚??臬飛??∪??抒ㄗ蝺游?遣蝡靽∠??雿喳像?啜?,
    meeting_day      = '?曹?',
    meeting_time     = '19:00-21:00',
    meeting_location = '鈭箸?擗?H101 瞍?撱?,
    contact_email    = 'speech.club@univ.edu',
    contact_phone    = '0912345010',
    club_fee         = 200,
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 1 DAY),
    last_updated     = NOW()
WHERE club_code = '049';

-- 摮貉?嚗?啣璆剔冗
UPDATE clubs SET
    description      = '瞈?澆璆剔?????摮貉??璆剛?皞?颲血?璆剜芋撘奎鞈賬璆剖?鈭急??平撣怨?撠暑????飛撠???撖阡??航???璆剛??恬???銝?閫隡平??,
    meeting_day      = '?曹?',
    meeting_time     = '19:00-21:00',
    meeting_location = '?菜?脫?銝剖? Innovation Lab',
    contact_email    = 'startup.club@univ.edu',
    contact_phone    = '0912345011',
    club_fee         = 200,
    activity_badge   = 'high_active',
    last_activity_date = NOW(),
    last_updated     = NOW()
WHERE club_code = '192';

-- 摮貉?嚗予?冗
UPDATE clubs SET
    description      = '?Ｙ揣摰?憟抒?嚗???颲行?鞊∟?皜研予??摨扯?憭拇??蔣瘣餃?????批予?雿輻甈?瘥Ｘ????憌?憭抵情敹齒憭?瘣餃?嚗迭餈??征?遛憟賢?????,
    meeting_day      = '?曹?',
    meeting_time     = '19:30-21:30',
    meeting_location = '?飛?Ｗ??予?',
    contact_email    = 'astro.club@univ.edu',
    contact_phone    = '0912345012',
    club_fee         = 200,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 14 DAY),
    last_updated     = NOW()
WHERE club_code = '051';

-- 摮貉?嚗???鞈?蝛嗥冗
UPDATE clubs SET
    description      = '?弦??撣????鞈??伐??齒璅⊥?∠巨蝡嗉魚?瓷???極雿??平??摨扼?蝮賡?蝬??啣??嚗???脣??璆剔??飛??撖行瞍毀撟喳??,
    meeting_day      = '?勗?',
    meeting_time     = '19:00-21:00',
    meeting_location = '?飛??B101 鞎∠恣?恕',
    contact_email    = 'finance.club@univ.edu',
    contact_phone    = '0912345013',
    club_fee         = 300,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 9 DAY),
    last_updated     = NOW()
WHERE club_code = '401';

-- ??嚗交?摨瑁?蝷?UPDATE clubs SET
    description      = '?典誨?交??亥?嚗閮??箏儔?西?嚗PR嚗ED 雿輻???交?霅瑟??賬???颲行交?閮毀隤脩?嚗?瘥?蝷曉?質?函??交??餅頨怨嚗?霅瑁澈?犖???賢??具?,
    meeting_day      = '?勗',
    meeting_time     = '13:00-16:00',
    meeting_location = '摮貊?瘣餃?銝剖? S201 ?交??恕',
    contact_email    = 'firstaid.club@univ.edu',
    contact_phone    = '0912345014',
    club_fee         = 0,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 12 DAY),
    last_updated     = NOW()
WHERE club_code = '100';

-- ??嚗??瞈??冗
UPDATE clubs SET
    description      = '蝯????望?蝎曄?嚗?摮豢?瘛勗??摮豢??隤脫平頛??隡湔???撖阡???撌亥????寥??飛?冗?痊隞餅???撘勗?黎??????,
    meeting_day      = '?勗',
    meeting_time     = '09:00-12:00',
    meeting_location = '摮貊?瘣餃?銝剖? S301 敹極摰?,
    contact_email    = 'volunteer.club@univ.edu',
    contact_phone    = '0912345015',
    club_fee         = 0,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 20 DAY),
    last_updated     = NOW()
WHERE club_code = '097';

-- ??嚗?瞈?撟渡冗
UPDATE clubs SET
    description      = '隞交?瞈犖?移蟡?靽?????嚗撖衣蝳?蝳?敹萸?颲衣靽?皞??嗚犖??冗???瘣餃?嚗???蝔桀??冽?葉??ㄞ??,
    meeting_day      = '?望',
    meeting_time     = '09:00-12:00',
    meeting_location = '摮貊?瘣餃?銝剖? S101',
    contact_email    = 'tzuchi.club@univ.edu',
    contact_phone    = '0912345016',
    club_fee         = 0,
    activity_badge   = 'no_recent_activity',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 45 DAY),
    last_updated     = NOW()
WHERE club_code = '126';

-- 隡?嚗?銝??脩冗
UPDATE clubs SET
    description      = '?典誨獢????嚗??梯?颲行???嚗???血雀??摰日???捏蝑甈暹???蝷曉??隢??亙??瘣曉??????質?曉敹??????脣丰隡湛?',
    meeting_day      = '?曹?',
    meeting_time     = '19:00-22:00',
    meeting_location = '摮貊?瘣餃?銝剖? 1F 獢?摰?,
    contact_email    = 'boardgame.club@univ.edu',
    contact_phone    = '0912345017',
    club_fee         = 150,
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 2 DAY),
    last_updated     = NOW()
WHERE club_code = '168';

-- 隡?嚗摮奎?蝷?UPDATE clubs SET
    description      = '?典誨?餃?蝡嗆???嚗項??FPS?OBA????亦?憭車?憿???颲行?折?隢魚??鞈賣晷撠?蝛扔蝯????⊿??餌奎?航魚嚗????撘瑟??',
    meeting_day      = '?勗?',
    meeting_time     = '19:00-22:00',
    meeting_location = '鞈極擗?2F ?餌奎銝剖?',
    contact_email    = 'esports.club@univ.edu',
    contact_phone    = '0912345018',
    club_fee         = 200,
    activity_badge   = 'high_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 1 DAY),
    last_updated     = NOW()
WHERE club_code = '184';

-- 隡?嚗ㄡ?矽鋆賜冗
UPDATE clubs SET
    description      = '?Ｙ揣??隤輸ㄡ?銵?敺??扒?嗅?菜??寡矽嚗?園ㄡ璆剖葦????憌脰ˊ雿?閮??摮豢??齒?ㄡ蝡嗉魚嚗??飛?典飛蝧???鈭怠?蝢嚗??寥??芯????祕???賬?,
    meeting_day      = '?曹?',
    meeting_time     = '19:00-21:00',
    meeting_location = '?暑擗?2F 憌脫??恕',
    contact_email    = 'drinks.club@univ.edu',
    contact_phone    = '0912345019',
    club_fee         = 300,
    activity_badge   = 'normal_active',
    last_activity_date = DATE_SUB(NOW(), INTERVAL 7 DAY),
    last_updated     = NOW()
WHERE club_code = '083';

-- 蝔?蝷橘?鋆?瘣餉?摨佗?
UPDATE clubs SET
    description      = '摮貊?蝔?閮剛???蝞???擃??潘?摰??齒撌乩???撠?蝡嗉魚?? Python ?仿??啣祕??獢??潘????璆剔?鞈?嚗撠?撌仿????閎?飛???貊冗??,
    activity_badge   = 'high_active',
    last_activity_date = NOW(),
    last_updated     = NOW()
WHERE club_code = 'CSC001';

-- =============================================================
-- 2. Demo 撖拇撣唾?嚗???E2E cleanup 皜嚗?潭?靘??對?
-- =============================================================

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'demo_reviewer1@demo.edu', 'Test123456', 'D000001', '?喳???, 'student', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo_reviewer1@demo.edu');

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'demo_reviewer2@demo.edu', 'Test123456', 'D000002', '??憍?, 'student', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo_reviewer2@demo.edu');

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'demo_reviewer3@demo.edu', 'Test123456', 'D000003', '撘萄?鞊?, 'student', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo_reviewer3@demo.edu');

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'demo_reviewer4@demo.edu', 'Test123456', 'D000004', '?蔔??, 'student', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo_reviewer4@demo.edu');

INSERT INTO users (email, password, student_id, name, role, is_active)
SELECT 'demo_reviewer5@demo.edu', 'Test123456', 'D000005', '暺遣摰?, 'student', TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo_reviewer5@demo.edu');

-- =============================================================
-- 3. ?啣? 12 ??蝷箸暑??WHERE NOT EXISTS ?脤?銴銵????嚗?-- =============================================================

-- 瘣餃? 1嚗?冗?亙迤??祆?嚗之??3 撘菜絲?梧?
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, location, capacity, fee,
    registration_deadline, registration_start, event_status, is_registration_open, published_at)
SELECT c.club_id,
    '?梯?蝷暹摮???怠瞍?,
    '?梯?蝷曆?撟港?摨衣??亙迤??撅?嚗??冗?批???蝎曉蔗瞍嚗項???-POP?憯怨?蝑?蝔桅◢?潦??雿????啗”瞍?蝎曉蔗蝯恬?蟡典?祥?亙嚗漣雿?????勗???,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 21 DAY), '%Y-%m-%d'), ' 19:00:00'),
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 21 DAY), '%Y-%m-%d'), ' 21:00:00'),
    '憭批飛憭抒旨??, 300, 0,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 18 DAY), '%Y-%m-%d'), ' 23:30:00'),
    CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), ' 00:00:00'),
    'published', 1, NOW()
FROM clubs c
WHERE c.club_code = '067'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '?梯?蝷暹摮???怠瞍? AND e.club_id = c.club_id);

-- 瘣餃? 2嚗?冗?啁???隤芣???銝剖?嚗? 撘菜絲?梧?
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, location, capacity, fee,
    registration_deadline, registration_start, event_status, is_registration_open, published_at)
SELECT c.club_id,
    '?梯?蝷暹???牧??',
    '甇∟?撠?頩??閎?????冗??隤芣????曉撠?蝎曉蔗蝷箇?銵冽??冗隤脖?蝝孵???????箇?銋???嚗??迭餈????頩?雿?',
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 7 DAY), '%Y-%m-%d'), ' 18:30:00'),
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 7 DAY), '%Y-%m-%d'), ' 20:00:00'),
    '摮貊?瘣餃?銝剖? 1F 憭批輒', 80, 0,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 6 DAY), '%Y-%m-%d'), ' 23:30:00'),
    CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), ' 00:00:00'),
    'published', 1, NOW()
FROM clubs c
WHERE c.club_code = '067'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '?梯?蝷暹???牧??' AND e.club_id = c.club_id);

-- 瘣餃? 3嚗?敶梁冗?亙迤?嗅?憭?嚗葉??2 撘菜絲?梧?
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, location, capacity, fee,
    registration_deadline, registration_start, event_status, is_registration_open, published_at)
SELECT c.club_id,
    '?蔣蝷暹摮?憭??暑??,
    '?砍飛???暺?啣?璊??隞乓??抵??蔣?銝駁?嚗蝷曉?蔣?犖撣園?撖血???撌扳?撠暑????撠?颲虫???鈭急?嚗迭餈?璈??????祥?典??靘輻銝隞賬?,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 14 DAY), '%Y-%m-%d'), ' 09:00:00'),
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 14 DAY), '%Y-%m-%d'), ' 17:00:00'),
    '?啣?璊?????潭迤????', 20, 200,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 11 DAY), '%Y-%m-%d'), ' 23:30:00'),
    CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), ' 00:00:00'),
    'published', 1, NOW()
FROM clubs c
WHERE c.club_code = '066'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '?蔣蝷暹摮?憭??暑?? AND e.club_id = c.club_id);

-- 瘣餃? 4嚗?敶梁冗暺?蔣?臬?嚗之??3 撘菜絲?梧?
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, location, capacity, fee,
    registration_deadline, registration_start, event_status, is_registration_open, published_at)
SELECT c.club_id,
    '2026 暺?蔣?臬?',
    '?蔣蝷曉僑摨虫???閬踝??砍?銝駁??箝?????閰晞?撅蝷曉蝎曉??????賣?敶曹????Ｙ揣??敶梁?璆菔銋???閬賢?鞎餃?湛?甇∟??冽撣怎??甈??嚗?,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 30 DAY), '%Y-%m-%d'), ' 10:00:00'),
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 33 DAY), '%Y-%m-%d'), ' 18:00:00'),
    '??擗?1F 撅汗撱?, 100, 0,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 27 DAY), '%Y-%m-%d'), ' 23:30:00'),
    CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), ' 00:00:00'),
    'published', 1, NOW()
FROM clubs c
WHERE c.club_code = '066'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '2026 暺?蔣?臬?' AND e.club_id = c.club_id);

-- 瘣餃? 5嚗?璅冗?臬??單???憭批?嚗? 撘菜絲?梧?
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, location, capacity, fee,
    registration_deadline, registration_start, event_status, is_registration_open, published_at)
SELECT c.club_id,
    '2026 ?亙迤???臬??單???,
    '??蝷曇?憪此?∟??颲衣?撟游漲?單??嚗?憟?格項??蟡魚擐研?蝬???嚗誑?隞??璅蝺其??巨?孵?園???嚗?憿????祈???勗???,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 45 DAY), '%Y-%m-%d'), ' 14:00:00'),
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 45 DAY), '%Y-%m-%d'), ' 17:00:00'),
    '?單?撱喳之瞍?撱?, 200, 100,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 40 DAY), '%Y-%m-%d'), ' 23:30:00'),
    CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), ' 00:00:00'),
    'published', 1, NOW()
FROM clubs c
WHERE c.club_code = '061'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '2026 ?亙迤???臬??單??? AND e.club_id = c.club_id);

-- 瘣餃? 6嚗撅梁冗?亙迤?控?亥?嚗葉??2 撘菜絲?梧?
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, location, capacity, fee,
    registration_deadline, registration_start, event_status, is_registration_open, published_at)
SELECT c.club_id,
    '?餃控蝷暹摮??撅勗銵?鞊∪控銝?仿?',
    '?祆活?亥?頝舐??箏?情撅望郊???函?蝝?2.5 ?祇?嚗摨阡銝哨??拙??餃控?飛?窒?ˊ閬賢???憯舫??航嚗??撜啣?撠?颲血???擗暑?祥?典靽鞎餌嚗?????鋆??餃控??,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 10 DAY), '%Y-%m-%d'), ' 07:00:00'),
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 10 DAY), '%Y-%m-%d'), ' 13:00:00'),
    '鞊∪控?琿?蝡?1 ??????嚗?, 30, 300,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 7 DAY), '%Y-%m-%d'), ' 23:30:00'),
    CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), ' 00:00:00'),
    'published', 1, NOW()
FROM clubs c
WHERE c.club_code = '075'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '?餃控蝷暹摮??撅勗銵?鞊∪控銝?仿?' AND e.club_id = c.club_id);

-- 瘣餃? 7嚗?銵冗?擃??伐?撠?嚗? 撘菜絲?梧?
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, location, capacity, fee,
    registration_deadline, registration_start, event_status, is_registration_open, published_at)
SELECT c.club_id,
    '??蝷暹??圈?撽',
    '撠葉?舀郎銵??閎??甇∟??勗???蝷暹??圈?撽嚗憭拙?擃??箇???云璆菜?仿??璇啣?蝷綽??梯?瘛梁冗?∟扛?芸葆??霈???甇西?????箇?甇∟?嚗?蝛輯?撖祇?????,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '%Y-%m-%d'), ' 14:00:00'),
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '%Y-%m-%d'), ' 17:00:00'),
    '甇西?擗?M101', 40, 0,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '%Y-%m-%d'), ' 23:30:00'),
    CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), ' 00:00:00'),
    'published', 1, NOW()
FROM clubs c
WHERE c.club_code = '084'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '??蝷暹??圈?撽' AND e.club_id = c.club_id);

-- 瘣餃? 8嚗閮蝷暹?撣剜?雓魚嚗之??3 撘菜絲????隤踵?箏???1 撘蛛?
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, location, capacity, fee,
    registration_deadline, registration_start, event_status, is_registration_open, published_at)
SELECT c.club_id,
    '2026 ?⊿??喳葉瞍??隢魚',
    '?亥?蝷曉僑摨阡??剜嚗?隢?啣?憭折?∩誨銵券???嚗憿???皞?嚗?瞍????典???賢??”??撌扼?鞈賢??魚??鞈賬捱鞈賭?頛迎?甇∟??冽撣怎??閫鞈賢?瘝對?',
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 28 DAY), '%Y-%m-%d'), ' 09:00:00'),
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 28 DAY), '%Y-%m-%d'), ' 17:00:00'),
    '鈭箸?擗?H101 憭扳?雓輒', 150, 0,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 21 DAY), '%Y-%m-%d'), ' 23:30:00'),
    CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), ' 00:00:00'),
    'published', 1, NOW()
FROM clubs c
WHERE c.club_code = '049'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '2026 ?⊿??喳葉瞍??隢魚' AND e.club_id = c.club_id);

-- 瘣餃? 9嚗交?摨瑁?蝷?CPR ?交?閮毀嚗???1 撘菜絲?梧?
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, location, capacity, fee,
    registration_deadline, registration_start, event_status, is_registration_open, published_at)
SELECT c.club_id,
    'CPR ?交???質?霅?蝺渲玨蝔?,
    '?祈玨蝔????箏儔?西?嚗PR嚗?皞?雿?蝔? AED ?芸?擃?敹??餅??駁‵?其蝙?冽瘜??勗?怎???冗?⊿脰?撖虫???????蝺渲???蝯平霅?撥?遣霅啣?∪葦????蝧????踝?',
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 12 DAY), '%Y-%m-%d'), ' 13:00:00'),
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 12 DAY), '%Y-%m-%d'), ' 17:00:00'),
    '摮貊?瘣餃?銝剖? S201 ?交??恕', 30, 0,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 9 DAY), '%Y-%m-%d'), ' 23:30:00'),
    CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), ' 00:00:00'),
    'published', 1, NOW()
FROM clubs c
WHERE c.club_code = '100'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = 'CPR ?交???質?霅?蝺渲玨蝔? AND e.club_id = c.club_id);

-- 瘣餃? 10嚗?銝??脩冗?亙迤獢?擐祆??橘?銝剖?嚗? 撘菜絲?梧?
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, location, capacity, fee,
    registration_deadline, registration_start, event_status, is_registration_open, published_at)
SELECT c.club_id,
    '?亙迤獢?擐祆???12 撠?銝???,
    '銝撟港?摨衣?獢?擐祆??暹暑??敺葉??啣?憭??? 200+ 甈暹??憚瘚岫?抬???∪撜嗚?摰日???銝?蝑犖瘞???脯祥?典擗??ㄡ??甇∟?蝯??鈭箏??',
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 8 DAY), '%Y-%m-%d'), ' 12:00:00'),
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 9 DAY), '%Y-%m-%d'), ' 00:00:00'),
    '摮貊?瘣餃?銝剖? 1F 獢?摰歹??典?嚗?, 60, 150,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '%Y-%m-%d'), ' 23:30:00'),
    CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), ' 00:00:00'),
    'published', 1, NOW()
FROM clubs c
WHERE c.club_code = '168'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = '?亙迤獢?擐祆???12 撠?銝??? AND e.club_id = c.club_id);

-- 瘣餃? 11嚗摮奎?蝷?FPS ?∪?隢魚嚗葉??2 撘菜絲?梧?
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, location, capacity, fee,
    registration_deadline, registration_start, event_status, is_registration_open, published_at)
SELECT c.club_id,
    'FPS ?餌奎?∪?隢魚嚗S2嚗?,
    '?餃?蝡嗆?蝷曆蜓颲行??CS2嚗ounter-Strike 2嚗?隢魚嚗 5v5 ???園脰?嚗????鞈賬???餌奎?券?蝳桀?蝯迭餈?頝舫???鞈踝?銋迭餈?摮詨?曉?粹?隡?瘝孵???',
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 16 DAY), '%Y-%m-%d'), ' 14:00:00'),
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 16 DAY), '%Y-%m-%d'), ' 22:00:00'),
    '鞈極擗?2F ?餌奎銝剖?', 32, 0,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 12 DAY), '%Y-%m-%d'), ' 23:30:00'),
    CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), ' 00:00:00'),
    'published', 1, NOW()
FROM clubs c
WHERE c.club_code = '184'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = 'FPS ?餌奎?∪?隢魚嚗S2嚗? AND e.club_id = c.club_id);

-- 瘣餃? 12嚗?啣璆剔冗 Startup Weekend嚗之??3 撘菜絲????銝剖? 2 撘蛛?
INSERT INTO events (club_id, event_name, description, event_date, event_end_date, location, capacity, fee,
    registration_deadline, registration_start, event_status, is_registration_open, published_at)
SELECT c.club_id,
    'Startup Weekend ?菜平?撌乩???,
    '擃撥摨血璆剖極雿?嚗??平璅∪??潭???湧?霅 MVP ???函??勗璆剖?撣怨?撠?蝯?璆剔?閰祟 Pitch嚗??隡??脣?璆剖葦銝撠?頛?鞈?璆剖??鈭箔??臬???曉??嚗?,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 25 DAY), '%Y-%m-%d'), ' 09:00:00'),
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 27 DAY), '%Y-%m-%d'), ' 18:00:00'),
    '?菜?脫?銝剖? Innovation Lab', 50, 500,
    CONCAT(DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 20 DAY), '%Y-%m-%d'), ' 23:30:00'),
    CONCAT(DATE_FORMAT(CURDATE(), '%Y-%m-%d'), ' 00:00:00'),
    'published', 1, NOW()
FROM clubs c
WHERE c.club_code = '192'
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = 'Startup Weekend ?菜平?撌乩??? AND e.club_id = c.club_id);

-- =============================================================
-- 4. 瘣餃?瘚瑕嚗??雿輻?????曉 frontend/assets/uploads/嚗?--    頝臬??澆?嚗ssets/uploads/{瑼?}嚗??怠?蝵格?蝺???upload.php 銝?湛?
-- =============================================================

-- ?梯?蝷暹摮???怠瞍?3 撘蛛?
INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_dance_show_1.jpg', 1
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '?梯?蝷暹摮???怠瞍? AND c.club_code = '067'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_dance_show_1.jpg');

INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_dance_show_2.jpg', 2
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '?梯?蝷暹摮???怠瞍? AND c.club_code = '067'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_dance_show_2.jpg');

INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_dance_show_3.jpg', 3
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '?梯?蝷暹摮???怠瞍? AND c.club_code = '067'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_dance_show_3.jpg');

-- ?梯?蝷暹??啗牧??嚗? 撘蛛?
INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_dance_recruit_1.jpg', 1
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '?梯?蝷暹???牧??' AND c.club_code = '067'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_dance_recruit_1.jpg');

INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_dance_recruit_2.jpg', 2
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '?梯?蝷暹???牧??' AND c.club_code = '067'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_dance_recruit_2.jpg');

-- ?蔣蝷暹摮????2 撘蛛?
INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_photo_outing_1.jpg', 1
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '?蔣蝷暹摮?憭??暑?? AND c.club_code = '066'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_photo_outing_1.jpg');

INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_photo_outing_2.jpg', 2
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '?蔣蝷暹摮?憭??暑?? AND c.club_code = '066'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_photo_outing_2.jpg');

-- ?蔣蝷暸??賣?敶梯撅?3 撘蛛?
INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_photo_exhibition_1.jpg', 1
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '2026 暺?蔣?臬?' AND c.club_code = '066'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_photo_exhibition_1.jpg');

INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_photo_exhibition_2.jpg', 2
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '2026 暺?蔣?臬?' AND c.club_code = '066'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_photo_exhibition_2.jpg');

INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_photo_exhibition_3.jpg', 3
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '2026 暺?蔣?臬?' AND c.club_code = '066'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_photo_exhibition_3.jpg');

-- ??蝷曇?璅?嚗? 撘蛛?
INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_music_concert_1.jpg', 1
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '2026 ?亙迤???臬??單??? AND c.club_code = '061'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_music_concert_1.jpg');

INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_music_concert_2.jpg', 2
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '2026 ?亙迤???臬??單??? AND c.club_code = '061'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_music_concert_2.jpg');

INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_music_concert_3.jpg', 3
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '2026 ?亙迤???臬??單??? AND c.club_code = '061'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_music_concert_3.jpg');

-- ?餃控蝷曇情撅勗銵?2 撘蛛?
INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_hiking_1.jpg', 1
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '?餃控蝷暹摮??撅勗銵?鞊∪控銝?仿?' AND c.club_code = '075'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_hiking_1.jpg');

INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_hiking_2.jpg', 2
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '?餃控蝷暹摮??撅勗銵?鞊∪控銝?仿?' AND c.club_code = '075'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_hiking_2.jpg');

-- ??蝷暹??圈?撽嚗? 撘蛛?
INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_martial_arts_1.jpg', 1
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '??蝷暹??圈?撽' AND c.club_code = '084'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_martial_arts_1.jpg');

-- ?⊿??喳葉瞍?鞈踝?1 撘蛛?
INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_speech_1.jpg', 1
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '2026 ?⊿??喳葉瞍??隢魚' AND c.club_code = '049'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_speech_1.jpg');

-- CPR ?交?閮毀嚗? 撘蛛?
INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_firstaid_1.jpg', 1
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = 'CPR ?交???質?霅?蝺渲玨蝔? AND c.club_code = '100'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_firstaid_1.jpg');

-- 獢?擐祆??橘?2 撘蛛?
INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_boardgame_1.jpg', 1
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '?亙迤獢?擐祆???12 撠?銝??? AND c.club_code = '168'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_boardgame_1.jpg');

INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_boardgame_2.jpg', 2
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = '?亙迤獢?擐祆???12 撠?銝??? AND c.club_code = '168'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_boardgame_2.jpg');

-- FPS ?餌奎?隢魚嚗? 撘蛛?
INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_esports_1.jpg', 1
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = 'FPS ?餌奎?∪?隢魚嚗S2嚗? AND c.club_code = '184'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_esports_1.jpg');

INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_esports_2.jpg', 2
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = 'FPS ?餌奎?∪?隢魚嚗S2嚗? AND c.club_code = '184'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_esports_2.jpg');

-- Startup Weekend嚗? 撘蛛?
INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_startup_1.jpg', 1
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = 'Startup Weekend ?菜平?撌乩??? AND c.club_code = '192'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_startup_1.jpg');

INSERT INTO event_posters (event_id, image_path, sort_order)
SELECT e.event_id, 'assets/uploads/events/demo_startup_2.jpg', 2
FROM events e JOIN clubs c ON e.club_id = c.club_id
WHERE e.event_name = 'Startup Weekend ?菜平?撌乩??? AND c.club_code = '192'
  AND NOT EXISTS (SELECT 1 FROM event_posters ep WHERE ep.event_id = e.event_id AND ep.image_path = 'assets/uploads/events/demo_startup_2.jpg');

-- =============================================================
-- 5. 蝟餌絞?砍?嚗?方? E2E 皜祈岫?砍?嚗??亙?蝷箇?砍?嚗?-- =============================================================

DELETE FROM system_announcements WHERE title IN ('蝷曉??汗???, '撟喳蝬剛風?');

INSERT INTO system_announcements (title, content, announcement_type, is_pinned, display_priority, created_by, start_date, end_date)
SELECT '? 2026 ?亙迤蝷曉??汗??憭抒?湛?',
    '銝撟港?摨衣?蝷曉??汗???潔??勗摮貊?瘣餃?撱??之??嚗????80 憭冗????箸嚗?游?蝷曆澈?曈交???暑????銝? 9:00 ?喃???5:00嚗迭餈?∪葦?葩頨???撠撅祆雿?蝷曉?嚗?,
    'event', TRUE, 100, u.user_id, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)
FROM users u WHERE u.email = 'admin@univ.edu' LIMIT 1;

INSERT INTO system_announcements (title, content, announcement_type, is_pinned, display_priority, created_by, start_date, end_date)
SELECT '?? 蝟餌絞蝬剛風?砍?',
    '撟喳撠?祆? 30 ?伐??勗嚗???02:00??4:00 ?脰?靘?蝟餌絞蝬剛風??嚗??像?唳????怠?雿輻?雁霅瑕???撠憓暑???銝像鞎颯??賬?銝噶嚗隢?隢?,
    'maintenance', TRUE, 90, u.user_id, NOW(), DATE_ADD(NOW(), INTERVAL 10 DAY)
FROM users u WHERE u.email = 'admin@univ.edu' LIMIT 1;

INSERT INTO system_announcements (title, content, announcement_type, is_pinned, display_priority, created_by, start_date, end_date)
SELECT '? 蝘??甇??銝?',
    '撟喳?冽?典??閮??踝??飛?曉?臭誑?湔?冗?凳?函?閮???閰Ｗ??亦冗鞈??暑?敦蝭蝑?憿???渲??舀?moji ????閮??賬迭餈???臭葉敹?撽?唳??撘?',
    'update', FALSE, 60, u.user_id, NOW(), DATE_ADD(NOW(), INTERVAL 60 DAY)
FROM users u WHERE u.email = 'admin@univ.edu' LIMIT 1;

INSERT INTO system_announcements (title, content, announcement_type, is_pinned, display_priority, created_by, start_date, end_date)
SELECT '?? 摮豢?蝷曇祥蝜喟?????',
    '?冗?飛?冗鞎餌像蝝甇Ｘ??祆?摨?隢??芰像蝝??飛???像鞎餅?蝥?喳飛??????撟喳???冗???Ｘ閰Ｘ?蝜唾祥?冽?蝝啜暹??芰像???怠?蝷曉鞈嚗隢釣??',
    'important', FALSE, 80, u.user_id, NOW(), DATE_ADD(NOW(), INTERVAL 20 DAY)
FROM users u WHERE u.email = 'admin@univ.edu' LIMIT 1;

-- =============================================================
-- 6. 蝷曉?閰嚗eview_status 敹?閮剔 'approved' ???典??圈＊蝷綽?
--    雿輻 demo 撖拇撣唾?嚗NIQUE(club_id, user_id) ? INSERT IGNORE
-- =============================================================

-- CSC001 蝔?蝷曇??對?5 蝑?
INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, display_name, verified_participant, review_status)
SELECT c.club_id, u.user_id, 5, '頞???撘冗嚗撥???,
    '?蝔?蝷暹憭批飛?甇?Ⅱ?捱摰?摮賊憪敺敹?敺蝷?瘜撖阡?撠???賣?撣塚?撌乩???鞈芯?敺????梁冗隤脰??隤脫平銋???蝎暸脩?撘??踝??Ｘ平敺撌乩?銋??憭?,
    '?喳???, TRUE, 'approved'
FROM clubs c, users u WHERE c.club_code = 'CSC001' AND u.email = 'demo_reviewer1@demo.edu';

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, display_name, verified_participant, review_status)
SELECT c.club_id, u.user_id, 4, '摮貊?瘞?敺末嚗暑??撖?,
    '蝷曇玨?批捆蝝桀祕嚗? Python ??Web ??賣?瘨菔??銝撠撩暺???暑??唳?暺?嚗??誑敺?憭抒??恕?擃?隤芣???澆???飛銵冗??',
    '??憍?, FALSE, 'approved'
FROM clubs c, users u WHERE c.club_code = 'CSC001' AND u.email = 'demo_reviewer2@demo.edu';

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, display_name, verified_participant, review_status)
SELECT c.club_id, u.user_id, 5, '撟寥?典??冗隤脣?鞈芷?',
    '蝔?蝷曄?撟寥?虜?典?皞?瘥梁冗隤莎?敺??圈脤??賣????飛?飛???憿銵其?霈?摮豢?璈?撅內??嚗?撠望?敺???撣豢?衣策?喳飛蝔????',
    '撘萄?鞊?, TRUE, 'approved'
FROM clubs c, users u WHERE c.club_code = 'CSC001' AND u.email = 'demo_reviewer3@demo.edu';

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, display_name, verified_participant, review_status)
SELECT c.club_id, u.user_id, 4, '?批捆鞊?嚗P ?澆?擃?,
    '蝷曇祥?嗉祥??嚗?摮詨?镼輯??潘?瞍?瘜極雿?霈????鈭嗾甈⊿閰佗?????蝷曉?憬??鈭怒?衣策撠?撌仿????閎??摮詻?,
    '?蔔??, FALSE, 'approved'
FROM clubs c, users u WHERE c.club_code = 'CSC001' AND u.email = 'demo_reviewer4@demo.edu';

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, display_name, verified_participant, review_status)
SELECT c.club_id, u.user_id, 5, '憭批飛蝷曉?擐嚗?雿??脣璆剔?',
    '蝔?蝷暸??鈭迂憭平?犖憯思??澈蝬?嚗??憭找?撠勗??芯??瘨舀?皜???冗?找??拇???憟踝????憭批振?賣?銝韏瑁?隢圾瘙綽??死撠勗?銝?????澆???',
    '暺遣摰?, TRUE, 'approved'
FROM clubs c, users u WHERE c.club_code = 'CSC001' AND u.email = 'demo_reviewer5@demo.edu';

-- ?梯?蝷曇??對?5 蝑?
INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, display_name, verified_participant, review_status)
SELECT c.club_id, u.user_id, 5, '??祆?霈????啣',
    '???梯?蝷曉撟港?嚗?甈⊥??怠瞍?舀??????颯??嗅蝷?賢??典之蝳桀?銝瞍嚗???虜?????撽?撠葦?飛?瑕??質???嚗撥??佗?',
    '??憍?, TRUE, 'approved'
FROM clubs c, users u WHERE c.club_code = '067' AND u.email = 'demo_reviewer2@demo.edu';

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, display_name, verified_participant, review_status)
SELECT c.club_id, u.user_id, 5, '?∪???暑??蝷曉?嚗?,
    '?梯?蝷曄?蝺渲?瘞???頞?嚗冗?∩?????憟賬-POP 蝯?摮詨?頞???????撠梯頝?蝷曇玨?脣漲鈭?甈∠毀????憭批振?賣?銝韏瑕?ㄞ嚗???飛撅祆??冗??,
    '?喳???, FALSE, 'approved'
FROM clubs c, users u WHERE c.club_code = '067' AND u.email = 'demo_reviewer1@demo.edu';

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, display_name, verified_participant, review_status)
SELECT c.club_id, u.user_id, 4, '銵冽?璈?憭??敺翰',
    '??梯?蝷曉?憭?敺?銵冽?璈?嚗??⊥???啣??祆?嚗?甈∟”瞍霈??湔??芯縑?擃?隤芣??鈭箸??瑞?憟賜冗??',
    '?蔔??, TRUE, 'approved'
FROM clubs c, users u WHERE c.club_code = '067' AND u.email = 'demo_reviewer4@demo.edu';

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, display_name, verified_participant, review_status)
SELECT c.club_id, u.user_id, 5, '銝摮貉?嚗摮詨鈭??移蟡?,
    '?函?冗摮詨???芣???撌改??湔?????痊隞餅??????唬???隤??閬擃冗?∠??芸?嚗車??????Ｘ平敺??嗆敹萎?撌脯?,
    '暺遣摰?, FALSE, 'approved'
FROM clubs c, users u WHERE c.club_code = '067' AND u.email = 'demo_reviewer5@demo.edu';

INSERT IGNORE INTO reviews (club_id, user_id, rating, review_title, review_content, display_name, verified_participant, review_status)
SELECT c.club_id, u.user_id, 4, '憭車?◢?豢?嚗?啗撌梁?憸冽',
    '?梯?蝷曉?鈭末撟曉??伐??銵??-POP?憯怎?嚗隞交?撌勗?憟賡?冗隤脫????改??葉??銋??拍隤踵蝺渲?撘瑕漲嚗凳?典?擃?蝷曉?玨璆剖???,
    '撘萄?鞊?, TRUE, 'approved'
FROM clubs c, users u WHERE c.club_code = '067' AND u.email = 'demo_reviewer3@demo.edu';

-- ============================================================
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

