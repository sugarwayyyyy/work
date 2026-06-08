-- 類別助教功能 + 六大社團分類調整
-- 目標分類（沿用現有無「性」字尾命名）：運動、學術、服務、休閒、音樂、藝術

-- 1. 新增 category_assistant 角色到 users.role ENUM
ALTER TABLE users
MODIFY COLUMN role ENUM('student','club_admin','platform_admin','category_assistant') DEFAULT 'student';

-- 2. 將「藝文」改名為「藝術」（原 23 個藝文社團自動歸入藝術，等同改分到藝術）
UPDATE club_categories
SET category_name = '藝術', description = '視覺藝術、設計、創作相關社團'
WHERE category_name = '藝文';

-- 3. 新增「音樂」與「休閒」分類（具備冪等性，重複執行不會產生重複資料）
--    同時相容舊環境的「性」字尾命名（音樂性／休閒性）：若已存在對應分類則跳過，避免重複。
INSERT INTO club_categories (category_name, description)
SELECT '音樂', '音樂演奏、聲樂、樂器相關社團' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM club_categories WHERE category_name IN ('音樂', '音樂性'));

INSERT INTO club_categories (category_name, description)
SELECT '休閒', '娛樂、休閒活動相關社團' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM club_categories WHERE category_name IN ('休閒', '休閒性'));

-- 3b. 將原本混在「藝術」(舊藝文) 的 9 個音樂類社團改分到「音樂」
--     （全新安裝時這些社團已直接歸音樂，此處 WHERE 不會命中，具冪等性）
UPDATE clubs c
JOIN club_categories music ON music.category_name = '音樂'
JOIN club_categories art   ON art.category_name   = '藝術'
SET c.category_id = music.category_id
WHERE c.club_code IN ('061','068','071','074','123','124','167','186','223')
  AND c.category_id = art.category_id;

-- 4. 建立類別助教指派表（每位助教只能負責一個類別）
CREATE TABLE IF NOT EXISTS category_assistant_assignments (
    assignment_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id       INT NOT NULL,
    category_id   INT NOT NULL,
    assigned_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user (user_id),
    FOREIGN KEY (user_id)     REFERENCES users(user_id)               ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES club_categories(category_id) ON DELETE CASCADE
);
