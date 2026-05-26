-- Enrich existing clubs with descriptions, fees, and activity badges
-- so the club-match quiz returns meaningful results.
USE club_platform;

-- 藝文性 (category_id = 8): fee 500
UPDATE clubs SET
    club_fee_semester = 500,
    meeting_day = COALESCE(NULLIF(meeting_day,''), '週三')
WHERE category_id = 8 AND (club_fee_semester IS NULL OR club_fee_semester = 0 AND club_code != 'CSC001');

-- 運動性 (category_id = 9): fee 300
UPDATE clubs SET
    club_fee_semester = 300,
    meeting_day = COALESCE(NULLIF(meeting_day,''), '週二')
WHERE category_id = 9 AND club_fee_semester IS NULL;

-- 學術性 (category_id = 10): fee 200
UPDATE clubs SET
    club_fee_semester = 200,
    meeting_day = COALESCE(NULLIF(meeting_day,''), '週四')
WHERE category_id = 10 AND club_fee_semester IS NULL;

-- 服務性 (category_id = 11): fee 0
UPDATE clubs SET
    club_fee_semester = 0,
    meeting_day = COALESCE(NULLIF(meeting_day,''), '週六')
WHERE category_id = 11 AND club_fee_semester IS NULL;

-- Descriptions per club (only where currently NULL or empty)
UPDATE clubs SET description = '以足球為主軸，培養團隊合作精神，定期舉辦校內聯賽與友誼賽。' WHERE club_code = '001' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '涵蓋各類音樂風格，歡迎喜愛音樂的同學一起演奏、創作與分享。' WHERE club_code = '002' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '融合現代舞、民族舞與流行舞蹈，定期演出並提供初學者入門課程。' WHERE club_code = '003' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '透過志工服務深入社區，培養同理心與公民責任感。' WHERE club_code = '004' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '探討圍棋、象棋等棋藝，舉辦社內賽事與友誼交流活動。' WHERE club_code = '005' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '凝聚海外僑生情誼，舉辦文化交流活動，協助新生適應校園生活。' WHERE club_code = '042' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '連結各高中校友，促進跨屆情誼與職涯交流。' WHERE club_code = '043' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '培養演講與辯論能力，定期舉辦演講比賽與社際交流賽。' WHERE club_code = '049' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '廣納各類興趣，提供多元文化體驗與交流平台。' WHERE club_code = '050' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '探索宇宙奧秘，定期舉辦天文觀測、星象講座與天文攝影活動。' WHERE club_code = '051' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '結合傳統醫學與現代研究，舉辦中醫藥知識講座與實作工作坊。' WHERE club_code = '053' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '培養國際商管視野，模擬聯合國與商業競賽是核心活動。' WHERE club_code = '054' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '融合占星學與塔羅牌，探索命理文化與心理學的交集。' WHERE club_code = '056' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '以基督信仰為核心，舉辦查經班、服務學習與心靈成長活動。' WHERE club_code = '058' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '協助轉學生快速融入校園，舉辦校園導覽、課業互助與聯誼活動。' WHERE club_code = '060' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '傳承中華國樂文化，演奏琵琶、二胡、古箏等傳統樂器。' WHERE club_code = '061' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '研習毛筆書法藝術，從楷書到行草，感受文字之美。' WHERE club_code = '064' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '用鏡頭記錄生活，學習攝影技術與後製處理，定期舉辦作品展。' WHERE club_code = '066' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '涵蓋街舞、K-POP等多元舞風，每學期舉辦大型成果展演。' WHERE club_code = '067' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '演奏古典樂曲，訓練合奏技巧，每年舉辦正式音樂會。' WHERE club_code = '068' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '結合肢體表演與劇本創作，每學期製作完整舞台劇演出。' WHERE club_code = '070' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '彈奏民謠吉他，從基礎和弦到進階指法，每週舉辦歌唱聚會。' WHERE club_code = '071' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '學習華爾滋、探戈等國際標準舞，培養優雅氣質與舞台表現力。' WHERE club_code = '072' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '研究搖滾音樂歷史，組樂團練習並舉辦定期表演。' WHERE club_code = '074' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '規劃台灣各山脈登山路線，培養山野技能與戶外安全素養。' WHERE club_code = '075' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '體驗野外露營技術，舉辦帳篷搭設、生火料理與定向越野活動。' WHERE club_code = '076' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '學習各類魔術技法，舉辦社內表演與校園公益魔術秀。' WHERE club_code = '080' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '培養廣播主持能力，製作校園廣播節目與演藝相關活動。' WHERE club_code = '081' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '探索各式調飲技術，從手搖飲到特調雞尾酒，定期舉辦品飲活動。' WHERE club_code = '083' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '傳承中華武術精髓，兼顧強身健體與文化傳承。' WHERE club_code = '084' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '修習跆拳道基本功與品勢，並積極參與校際跆拳道賽事。' WHERE club_code = '086' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '學習柔道投技與固技，培養自衛能力與武道精神。' WHERE club_code = '087' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '鍛鍊劍道基本功，以竹劍競技磨礪心志，追求一劍之道。' WHERE club_code = '088' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '學習西洋擊劍三種劍種，培養快速反應能力與比賽技術。' WHERE club_code = '089' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '以桌球為核心，定期舉辦社內聯賽與校際友誼賽。' WHERE club_code = '091' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '學習網球基礎揮拍與戰術，歡迎零基礎到進階程度同學加入。' WHERE club_code = '092' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '修習射箭技術，從基礎瞄準到競技訓練，陶冶專注與定靜心境。' WHERE club_code = '093' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '結合同舟共濟精神，深入偏鄉提供課輔與陪伴服務。' WHERE club_code = '097' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '關懷弱勢長者與兒童，定期辦理社區服務活動。' WHERE club_code = '098' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '推廣環境教育，舉辦淨灘、植樹與永續生活工作坊。' WHERE club_code = '099' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '推廣急救知識，培訓心肺復甦術與緊急救護技能。' WHERE club_code = '100' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '深入社區提供多元志工服務，實踐崇德向善的服務精神。' WHERE club_code = '101' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '扎根基層文化保存，舉辦傳統技藝推廣與社區文化活動。' WHERE club_code = '116' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '推廣水上安全知識，培訓游泳與救生技能。' WHERE club_code = '118' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '磨練鋼琴演奏技巧，從古典樂到流行曲目，定期舉辦音樂分享會。' WHERE club_code = '123' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '結合科技與音樂，學習 DAW 編曲軟體製作原創音樂。' WHERE club_code = '124' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '以慈濟人文精神推動環保與慈善服務，落實知福惜福理念。' WHERE club_code = '126' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '推廣多元文化交流，協助國際學生適應台灣生活。' WHERE club_code = '129' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '修習空手道型與組手，培養紀律、禮儀與自衛實力。' WHERE club_code = '131' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '聚焦動漫、電玩文化，定期舉辦桌遊之夜與動漫鑑賞會。' WHERE club_code = '132' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '以直排輪滑行代步，練習花式與速度技術，探索城市樂趣。' WHERE club_code = '136' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '以基督教信仰為核心，建立互相支持的學習團契。' WHERE club_code = '140' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '探索禪學智慧，透過靜坐、茶禪修習培養內在平靜。' WHERE club_code = '141' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '研讀聖經經文，舉辦聖經知識競賽與靈修活動。' WHERE club_code = '142' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '以繪本為媒介走入偏鄉學校，透過說故事服務兒童。' WHERE club_code = '148' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '學習影片拍攝、剪輯技術，製作紀錄片與短片參加影展競賽。' WHERE club_code = '157' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '凝聚師培生情誼，分享教育實習心得與教學技能。' WHERE club_code = '159' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '以福智理念推廣正向思考，舉辦心靈成長課程與讀書會。' WHERE club_code = '161' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '培養國際視野與領導力，參與國際志工交流計畫。' WHERE club_code = '163' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '修習合氣道圓弧柔化技術，強調以柔克剛的武道哲學。' WHERE club_code = '166' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '學習烏克麗麗演奏，從基礎到進階，帶著夏威夷風情歌唱生活。' WHERE club_code = '167' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '推廣桌上遊戲文化，每週舉辦桌遊夜，歡迎各程度玩家。' WHERE club_code = '168' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '修習日本弓道，感受「射以觀德」的禪意與精準的射藝之美。' WHERE club_code = '171' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '研習歐洲中世紀劍術 HEMA，融合武術與歷史文化研究。' WHERE club_code = '172' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '探討性別議題，推動校園性平教育與多元包容文化。' WHERE club_code = '174' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '結合火光與藝術，學習火舞、光繪攝影等獨特表演技巧。' WHERE club_code = '178' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '傳承舞龍舞獅等民俗技藝，在節慶活動中展現傳統文化魅力。' WHERE club_code = '179' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '推廣電子競技文化，舉辦電競賽事與技術分享交流。' WHERE club_code = '184' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '以機車騎行探索台灣，重視安全騎乘技術與機車維修知識。' WHERE club_code = '185' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '推廣嘻哈文化四元素：饒舌、DJ、塗鴉與霹靂舞。' WHERE club_code = '186' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '學習撞球技術，從基礎瞄準到高難度打法，定期舉辦社內聯賽。' WHERE club_code = '188' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '以青少年陪伴與輔導為核心，舉辦寒暑假育樂營與社區服務。' WHERE club_code = '189' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '修習菲律賓 Kali 武術，融合棍術、刀術與徒手搏擊技巧。' WHERE club_code = '190' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '推動 SDGs 永續發展目標，培養具影響力的社會創新人才。' WHERE club_code = '191' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '激發創業熱情，舉辦商業模式競賽、創業分享與業師輔導活動。' WHERE club_code = '192' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '深入咖啡產業知識，從烘焙到手沖，品味每一杯咖啡的故事。' WHERE club_code = '193' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '學習插花與花藝設計，感受花卉美學帶來的療癒與生活品味。' WHERE club_code = '194' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '研究租稅法規與財稅制度，為有志進入財稅領域的同學提供學習平台。' WHERE club_code = '196' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '推廣韓國音樂、影視與飲食文化，舉辦語言交流與文化體驗活動。' WHERE club_code = '198' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '學習自由潛水技術，探索水下世界，培養靜心與身體控制能力。' WHERE club_code = '199' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '修習爵士鋼琴即興演奏，感受爵士樂的自由與即興魅力。' WHERE club_code = '223' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '以基督信仰凝聚團契，分享生命見證與服務社區。' WHERE club_code = '229' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '研究金融市場與投資策略，舉辦模擬股票競賽與財務分析工作坊。' WHERE club_code = '401' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '推廣路跑運動，從 5K 到馬拉松培訓，定期舉辦校園夜跑活動。' WHERE club_code = '402' AND (description IS NULL OR description = '');
UPDATE clubs SET description = '推廣袋棍球運動，兼顧速度與技術，積極參與校際比賽。' WHERE club_code = '403' AND (description IS NULL OR description = '');

-- Mark a handful of high-visibility clubs as high_active for variety in quiz results
UPDATE clubs SET activity_badge = 'high_active'
WHERE club_code IN ('001','067','075','086','099','132','168','192','066','049','091','403');
