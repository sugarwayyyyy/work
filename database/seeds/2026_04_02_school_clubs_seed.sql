-- 學校社團批次匯入（2026-04-02）
-- 先建立基本資料，後續再由各社團補齊地點、時間與聯絡資訊。

USE club_platform;

SET @placeholder_text = '這個社團很懶什麼資料都沒留'; -- 統一佔位字串，方便後續補資料

INSERT INTO clubs (
    club_code,
    club_name,
    category_id,
    meeting_location,
    meeting_time,
    contact_email,
    contact_phone,
    activity_status
)
SELECT
    src.club_code,
    src.club_name,
    cc.category_id,
    @placeholder_text,
    @placeholder_text,
    @placeholder_text,
    @placeholder_text,
    'active'
FROM (
    SELECT '049' AS club_code, '健言社' AS club_name, '學術性' AS category_name UNION ALL
    SELECT '050', '大千社', '學術性' UNION ALL
    SELECT '051', '天文社', '學術性' UNION ALL
    SELECT '053', '中華醫藥研習社', '學術性' UNION ALL
    SELECT '054', '國際經濟商管學生會', '學術性' UNION ALL
    SELECT '056', '占星塔羅社', '學術性' UNION ALL
    SELECT '058', '信望愛社', '學術性' UNION ALL
    SELECT '099', '淨仁社', '學術性' UNION ALL
    SELECT '140', '學園團契社', '學術性' UNION ALL
    SELECT '141', '禪學社', '學術性' UNION ALL
    SELECT '142', '聖經研究社', '學術性' UNION ALL
    SELECT '159', '教育學程學會', '學術性' UNION ALL
    SELECT '161', '福智青年社', '學術性' UNION ALL
    SELECT '174', '性別研究社', '學術性' UNION ALL
    SELECT '191', '永續影響力大使社', '學術性' UNION ALL
    SELECT '192', '創新創業社', '學術性' UNION ALL
    SELECT '196', '租稅研究社', '學術性' UNION ALL
    SELECT '229', '光鹽社', '學術性' UNION ALL
    SELECT '401', '金融投資研究社', '學術性' UNION ALL

    SELECT '042', '僑生聯誼會', '休閒性' UNION ALL
    SELECT '043', '高中校友聯合總會', '休閒性' UNION ALL
    SELECT '060', '轉學生聯誼會', '休閒性' UNION ALL
    SELECT '076', '野營社', '休閒性' UNION ALL
    SELECT '080', '魔術社', '休閒性' UNION ALL
    SELECT '082', '棋藝社', '休閒性' UNION ALL
    SELECT '083', '飲料調製社', '休閒性' UNION ALL
    SELECT '129', '努瑪社', '休閒性' UNION ALL
    SELECT '163', '國際菁英學生會', '休閒性' UNION ALL
    SELECT '168', '桌上遊戲社', '休閒性' UNION ALL
    SELECT '184', '電子競技社', '休閒性' UNION ALL
    SELECT '185', '二輪社', '休閒性' UNION ALL
    SELECT '193', '咖啡研究社', '休閒性' UNION ALL
    SELECT '198', '韓國流行文化研究社', '休閒性' UNION ALL

    SELECT '097', '同舟共濟服務社', '服務性' UNION ALL
    SELECT '098', '醒新愛愛服務社', '服務性' UNION ALL
    SELECT '100', '急救康輔社', '服務性' UNION ALL
    SELECT '101', '崇德志工服務社', '服務性' UNION ALL
    SELECT '116', '基層文化服務社', '服務性' UNION ALL
    SELECT '126', '慈濟青年社', '服務性' UNION ALL
    SELECT '148', '繪本服務學習社', '服務性' UNION ALL
    SELECT '189', '勵德青少年服務社', '服務性' UNION ALL

    SELECT '075', '登山社', '體育性' UNION ALL
    SELECT '084', '國術社', '體育性' UNION ALL
    SELECT '086', '跆拳道社', '體育性' UNION ALL
    SELECT '087', '柔道社', '體育性' UNION ALL
    SELECT '088', '劍道社', '體育性' UNION ALL
    SELECT '089', '擊劍社', '體育性' UNION ALL
    SELECT '090', '羽球社', '體育性' UNION ALL
    SELECT '091', '桌球社', '體育性' UNION ALL
    SELECT '092', '網球社', '體育性' UNION ALL
    SELECT '093', '射箭社', '體育性' UNION ALL
    SELECT '118', '同心救生社', '體育性' UNION ALL
    SELECT '131', '空手道社', '體育性' UNION ALL
    SELECT '136', '黑輪社', '體育性' UNION ALL
    SELECT '166', '合氣道社', '體育性' UNION ALL
    SELECT '172', '歐洲劍術社', '體育性' UNION ALL
    SELECT '188', '撞球社', '體育性' UNION ALL
    SELECT '190', 'Kali武術社', '體育性' UNION ALL
    SELECT '199', '自由潛水社', '體育性' UNION ALL
    SELECT '402', '跑步社', '體育性' UNION ALL
    SELECT '403', '袋棍球社', '體育性' UNION ALL

    SELECT '064', '書法社', '藝文性' UNION ALL
    SELECT '066', '攝影社', '藝文性' UNION ALL
    SELECT '067', '熱舞社', '藝文性' UNION ALL
    SELECT '070', '戲劇社', '藝文性' UNION ALL
    SELECT '072', '國際標準舞蹈社', '藝文性' UNION ALL
    SELECT '081', '廣播演藝社', '藝文性' UNION ALL
    SELECT '132', '動漫電玩研習社', '藝文性' UNION ALL
    SELECT '157', '影片創作社', '藝文性' UNION ALL
    SELECT '171', '弓道社', '藝文性' UNION ALL
    SELECT '178', '光火藝術社', '藝文性' UNION ALL
    SELECT '179', '民俗體育社', '藝文性' UNION ALL
    SELECT '194', '生活花藝設計社', '藝文性' UNION ALL

    SELECT '061', '國樂社', '藝文性' UNION ALL
    SELECT '068', '管弦樂社', '藝文性' UNION ALL
    SELECT '071', '民謠吉他社', '藝文性' UNION ALL
    SELECT '074', '搖滾音樂研究社', '藝文性' UNION ALL
    SELECT '123', '鋼琴社', '藝文性' UNION ALL
    SELECT '124', '數位音樂創作研習社', '藝文性' UNION ALL
    SELECT '167', '烏克麗麗社', '藝文性' UNION ALL
    SELECT '186', '嘻哈文化社', '藝文性' UNION ALL
    SELECT '223', '爵士鋼琴社', '藝文性'
) AS src
INNER JOIN club_categories AS cc
    ON cc.category_name = src.category_name
LEFT JOIN clubs AS existing
    ON existing.club_code = src.club_code
    OR existing.club_name = src.club_name
WHERE existing.club_id IS NULL;