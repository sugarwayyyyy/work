<?php
/**
 * 私訊 API 端點
 */

require_once '../auth.php';
require_once '../content_filter.php';

Helper::handleCorsPreFlight();

class MessagesAPI {

    private static function requireLogin() {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }
        $uid = Auth::getCurrentUserId();
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
        return $uid;
    }

    /**
     * GET ?action=conversations
     * 取得所有對話列表（含最後一則訊息與未讀數）
     */
    public static function getConversations() {
        $uid = self::requireLogin();

        try {
            $rows = Database::getInstance()->fetchAll(
                'SELECT
                    u.user_id,
                    u.name,
                    u.avatar_path,
                    (
                        SELECT content FROM private_messages
                        WHERE (sender_id = ? AND receiver_id = u.user_id)
                           OR (sender_id = u.user_id AND receiver_id = ?)
                        ORDER BY created_at DESC LIMIT 1
                    ) AS last_content,
                    sub.last_time,
                    sub.unread_count
                 FROM (
                    SELECT
                        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_id,
                        MAX(created_at) AS last_time,
                        SUM(CASE WHEN receiver_id = ? AND is_read = 0 THEN 1 ELSE 0 END) AS unread_count
                    FROM private_messages
                    WHERE sender_id = ? OR receiver_id = ?
                    GROUP BY other_id
                 ) sub
                 JOIN users u ON u.user_id = sub.other_id
                 ORDER BY sub.last_time DESC',
                [$uid, $uid, $uid, $uid, $uid, $uid]
            );

            Helper::success('取得對話列表成功', ['conversations' => $rows]);
        } catch (Exception $e) {
            Helper::error('取得對話列表失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET ?action=thread&user_id=X
     * 取得與用戶 X 的對話紀錄，並標記為已讀
     */
    public static function getThread() {
        $uid = self::requireLogin();
        $otherId = (int)($_GET['user_id'] ?? 0);

        if ($otherId <= 0) {
            Helper::error('無效的用戶 ID', 400);
        }

        try {
            dbUpdate('private_messages', ['is_read' => 1],
                'sender_id = ? AND receiver_id = ? AND is_read = 0',
                [$otherId, $uid]
            );

            $messages = Database::getInstance()->fetchAll(
                'SELECT m.message_id, m.sender_id, m.receiver_id, m.content,
                        m.is_read, m.is_recalled, m.reply_to_id, m.created_at,
                        u.name AS sender_name, u.avatar_path AS sender_avatar,
                        rm.content AS reply_content, rm.sender_id AS reply_sender_id,
                        ru.name AS reply_sender_name
                 FROM private_messages m
                 JOIN users u ON u.user_id = m.sender_id
                 LEFT JOIN private_messages rm ON rm.message_id = m.reply_to_id
                 LEFT JOIN users ru ON ru.user_id = rm.sender_id
                 WHERE (m.sender_id = ? AND m.receiver_id = ?)
                    OR (m.sender_id = ? AND m.receiver_id = ?)
                 ORDER BY m.created_at ASC
                 LIMIT 200',
                [$uid, $otherId, $otherId, $uid]
            );

            // Attach emoji reactions
            $ids = array_column($messages, 'message_id');
            if ($ids) {
                $ph = implode(',', array_fill(0, count($ids), '?'));
                $rxns = Database::getInstance()->fetchAll(
                    "SELECT message_id, emoji, COUNT(*) AS cnt, GROUP_CONCAT(user_id) AS uids
                     FROM message_reactions WHERE message_id IN ($ph) GROUP BY message_id, emoji",
                    $ids
                );
                $rxnMap = [];
                foreach ($rxns as $r) {
                    $rxnMap[$r['message_id']][] = [
                        'emoji'    => $r['emoji'],
                        'count'    => (int)$r['cnt'],
                        'user_ids' => array_map('intval', explode(',', $r['uids'])),
                    ];
                }
                foreach ($messages as &$msg) {
                    $msg['reactions'] = $rxnMap[$msg['message_id']] ?? [];
                }
                unset($msg);
            }

            $otherUser = Database::getInstance()->fetchOne(
                'SELECT user_id, name, avatar_path FROM users WHERE user_id = ?',
                [$otherId]
            );

            Helper::success('取得訊息成功', [
                'messages' => $messages,
                'other_user' => $otherUser ?: null
            ]);
        } catch (Exception $e) {
            Helper::error('取得訊息失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST ?action=send
     * Body: {receiver_id, content}
     */
    /**
     * POST ?action=recall_message
     * Body: { message_id }
     */
    public static function recallMessage($data) {
        $uid = self::requireLogin();
        $msgId = (int)($data['message_id'] ?? 0);
        if ($msgId <= 0) Helper::error('無效的訊息 ID', 400);

        $msg = Database::getInstance()->fetchOne(
            'SELECT sender_id, is_recalled FROM private_messages WHERE message_id = ?',
            [$msgId]
        );
        if (!$msg) Helper::error('找不到此訊息', 404);
        if ((int)$msg['sender_id'] !== $uid) Helper::error('只能收回自己發送的訊息', 403);
        if ($msg['is_recalled']) Helper::error('訊息已收回', 400);

        dbUpdate('private_messages', ['is_recalled' => 1], 'message_id = ?', [$msgId]);
        Helper::success('訊息已收回');
    }

    public static function sendMessage($data) {
        $uid = self::requireLogin();

        $receiverId = (int)($data['receiver_id'] ?? 0);
        $content = trim((string)($data['content'] ?? ''));
        $replyToId = isset($data['reply_to_id']) ? (int)$data['reply_to_id'] : null;
        if ($replyToId !== null && $replyToId <= 0) $replyToId = null;

        if ($receiverId <= 0) {
            Helper::error('無效的收件人 ID', 400);
        }
        if ($receiverId === $uid) {
            Helper::error('無法傳訊給自己', 400);
        }
        if ($content === '') {
            Helper::error('訊息內容不得為空', 400);
        }
        if (mb_strlen($content) > 2000) {
            Helper::error('訊息內容不得超過 2000 字', 400);
        }
        if (ContentFilter::containsRestrictedLanguage($content)) {
            Helper::error('訊息內容包含不適當字眼，請修改後再送出', 400);
        }

        try {
            $receiver = Database::getInstance()->fetchOne(
                'SELECT user_id FROM users WHERE user_id = ?',
                [$receiverId]
            );
            if (!$receiver) {
                Helper::error('找不到該用戶', 404);
            }

            $insertData = [
                'sender_id'   => $uid,
                'receiver_id' => $receiverId,
                'content'     => $content,
            ];
            if ($replyToId !== null) $insertData['reply_to_id'] = $replyToId;
            $messageId = dbInsert('private_messages', $insertData);

            if (!$messageId) {
                Helper::error('傳送失敗', 500);
            }

            Helper::success('傳送成功', ['message_id' => (int)$messageId]);
        } catch (Exception $e) {
            Helper::error('傳送失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET ?action=search_user&q=X
     * 以 user_id（精確）、student_id（精確）或姓名（模糊）搜尋用戶
     */
    public static function searchUser() {
        $uid = self::requireLogin();
        $q = trim((string)($_GET['q'] ?? ''));

        if ($q === '') {
            Helper::success('', ['users' => []]);
            return;
        }

        try {
            $results = [];

            if (is_numeric($q)) {
                $byId = Database::getInstance()->fetchAll(
                    'SELECT user_id, name, avatar_path, student_id FROM users
                     WHERE (user_id = ? OR student_id = ?) AND user_id != ?
                     LIMIT 10',
                    [(int)$q, $q, $uid]
                );
                $results = $byId;
            }

            if (empty($results)) {
                $byName = Database::getInstance()->fetchAll(
                    'SELECT user_id, name, avatar_path, student_id FROM users
                     WHERE name LIKE ? AND user_id != ?
                     LIMIT 10',
                    ['%' . $q . '%', $uid]
                );
                $results = $byName;
            }

            Helper::success('搜尋成功', ['users' => array_values($results)]);
        } catch (Exception $e) {
            Helper::error('搜尋失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET ?action=bot_messages
     * 取得 Bot 系統訊息列表
     */
    public static function getBotMessages() {
        $uid = self::requireLogin();
        try {
            $messages = Database::getInstance()->fetchAll(
                'SELECT message_id, message_type, title, content, meta, is_read, created_at
                 FROM bot_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 50',
                [$uid]
            );
            foreach ($messages as &$msg) {
                $msg['meta'] = $msg['meta'] ? (json_decode($msg['meta'], true) ?: []) : [];
                if ($msg['message_type'] === 'join_verification' && !empty($msg['meta']['application_id'])) {
                    $app = Database::getInstance()->fetchOne(
                        'SELECT code_used FROM club_join_applications WHERE application_id = ?',
                        [(int)$msg['meta']['application_id']]
                    );
                    $msg['meta']['code_used'] = $app ? (bool)$app['code_used'] : false;
                }
            }
            Helper::success('取得 Bot 訊息成功', ['messages' => $messages]);
        } catch (Exception $e) {
            Helper::error('取得 Bot 訊息失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST ?action=mark_bot_read
     * Body: { message_id } 或空 body（標記全部）
     */
    public static function markBotMessageRead($data) {
        $uid = self::requireLogin();
        $msgId = (int)($data['message_id'] ?? 0);
        try {
            if ($msgId > 0) {
                dbUpdate('bot_messages', ['is_read' => 1], 'message_id = ? AND user_id = ?', [$msgId, $uid]);
            } else {
                dbUpdate('bot_messages', ['is_read' => 1], 'user_id = ?', [$uid]);
            }
            Helper::success('已標記已讀');
        } catch (Exception $e) {
            Helper::error('標記失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET ?action=note
     * 取得個人記事本內容
     */
    public static function getNote() {
        $uid = self::requireLogin();
        try {
            $row = Database::getInstance()->fetchOne(
                'SELECT content, updated_at FROM user_notes WHERE user_id = ?', [$uid]
            );
            Helper::success('', ['content' => $row ? $row['content'] : '', 'updated_at' => $row ? $row['updated_at'] : null]);
        } catch (Exception $e) {
            Helper::success('', ['content' => '', 'updated_at' => null]);
        }
    }

    /**
     * POST ?action=save_note
     * Body: { content }
     */
    public static function saveNote($data) {
        $uid = self::requireLogin();
        $content = (string)($data['content'] ?? '');
        if (mb_strlen($content) > 10000) {
            Helper::error('記事本不得超過 10000 字', 400);
        }
        try {
            $existing = Database::getInstance()->fetchOne('SELECT note_id FROM user_notes WHERE user_id = ?', [$uid]);
            if ($existing) {
                dbUpdate('user_notes', ['content' => $content], 'user_id = ?', [$uid]);
            } else {
                dbInsert('user_notes', ['user_id' => $uid, 'content' => $content]);
            }
            Helper::success('已儲存');
        } catch (Exception $e) {
            Helper::error('儲存失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET ?action=note_messages
     */
    public static function getNoteMessages() {
        $uid = self::requireLogin();
        if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
        $rows = Database::getInstance()->fetchAll(
            'SELECT note_id, content, created_at FROM note_messages WHERE user_id = ? AND is_recalled = 0 ORDER BY created_at ASC',
            [$uid]
        );
        Helper::success('', ['messages' => $rows]);
    }

    /**
     * POST ?action=send_note_message
     * Body: { content }
     */
    public static function sendNoteMessage($data) {
        $uid = self::requireLogin();
        $content = trim((string)($data['content'] ?? ''));
        if ($content === '') Helper::error('內容不可空白', 400);
        if (mb_strlen($content) > 2000) Helper::error('訊息過長', 400);
        if (ContentFilter::containsRestrictedLanguage($content)) {
            Helper::error('訊息內容包含不適當字眼，請修改後再送出', 400);
        }
        dbInsert('note_messages', ['user_id' => $uid, 'content' => $content]);
        Helper::success('已儲存');
    }

    /**
     * POST ?action=recall_note_message
     * Body: { note_id }
     */
    public static function recallNoteMessage($data) {
        $uid = self::requireLogin();
        $noteId = (int)($data['note_id'] ?? 0);
        if ($noteId <= 0) Helper::error('無效的 ID', 400);

        $row = Database::getInstance()->fetchOne(
            'SELECT user_id FROM note_messages WHERE note_id = ? AND is_recalled = 0',
            [$noteId]
        );
        if (!$row) Helper::error('找不到此訊息', 404);
        if ((int)$row['user_id'] !== $uid) Helper::error('無權限', 403);

        dbUpdate('note_messages', ['is_recalled' => 1], 'note_id = ?', [$noteId]);
        Helper::success('已刪除');
    }

    /**
     * POST ?action=toggle_reaction
     * Body: { message_id, emoji }
     */
    public static function toggleReaction($data) {
        $uid = self::requireLogin();
        $msgId = (int)($data['message_id'] ?? 0);
        $emoji = trim((string)($data['emoji'] ?? ''));
        $allowed = ['👍', '❤️', '😂', '😮', '😢', '👏'];
        if (!$msgId || !in_array($emoji, $allowed, true)) Helper::error('無效參數', 400);

        $msg = Database::getInstance()->fetchOne(
            'SELECT sender_id, receiver_id FROM private_messages WHERE message_id = ?',
            [$msgId]
        );
        if (!$msg || !in_array($uid, [(int)$msg['sender_id'], (int)$msg['receiver_id']])) {
            Helper::error('無權限', 403);
        }

        // 每人對同一則訊息只允許一個 reaction
        $existing = Database::getInstance()->fetchOne(
            'SELECT reaction_id, emoji FROM message_reactions WHERE message_id = ? AND user_id = ?',
            [$msgId, $uid]
        );
        if ($existing) {
            dbDelete('message_reactions', 'reaction_id = ?', [(int)$existing['reaction_id']]);
            if ($existing['emoji'] !== $emoji) {
                // 不同 emoji → 換成新的
                dbInsert('message_reactions', ['message_id' => $msgId, 'user_id' => $uid, 'emoji' => $emoji]);
                Helper::success('已切換');
            } else {
                // 同一個 emoji → toggle 取消
                Helper::success('已移除');
            }
        } else {
            dbInsert('message_reactions', ['message_id' => $msgId, 'user_id' => $uid, 'emoji' => $emoji]);
            Helper::success('已新增');
        }
    }

    /**
     * POST ?action=verify_join_code
     * Body: { club_id, code }
     */
    public static function verifyJoinCode($data) {
        $uid = self::requireLogin();
        $code   = strtoupper(trim((string)($data['code'] ?? '')));
        $clubId = (int)($data['club_id'] ?? 0);
        if (!$code || !$clubId) Helper::error('請填寫驗證碼', 400);

        try {
            $app = Database::getInstance()->fetchOne(
                "SELECT a.*, c.club_name FROM club_join_applications a
                 JOIN clubs c ON c.club_id = a.club_id
                 WHERE a.club_id = ? AND a.user_id = ? AND a.status = 'approved' AND a.code_used = 0",
                [$clubId, $uid]
            );
            if (!$app) Helper::error('找不到有效申請，請確認社團或重新申請', 404);
            if ($app['verification_code'] !== $code) Helper::error('驗證碼錯誤', 400);

            dbUpdate('club_join_applications', ['code_used' => 1], 'application_id = ?', [(int)$app['application_id']]);

            $allowedFeeTypes = ['none', 'onetime', 'semester', 'session'];
            $feeType = in_array($app['fee_type'], $allowedFeeTypes, true) ? $app['fee_type'] : 'semester';

            $existing = Database::getInstance()->fetchOne(
                'SELECT member_id, is_active FROM club_members WHERE club_id = ? AND user_id = ?',
                [$clubId, $uid]
            );
            $feePaidDefault = ($feeType !== 'none') ? 1 : 0;

            if ($existing) {
                Database::getInstance()->update('club_members',
                    ['is_active' => 1, 'fee_type' => $feeType, 'fee_paid' => $feePaidDefault, 'join_date' => date('Y-m-d H:i:s')],
                    'member_id = ?', [(int)$existing['member_id']]
                );
            } else {
                dbInsert('club_members', [
                    'club_id'   => $clubId,
                    'user_id'   => $uid,
                    'role'      => 'member',
                    'is_active' => 1,
                    'fee_type'  => $feeType,
                    'fee_paid'  => $feePaidDefault,
                    'join_date' => date('Y-m-d H:i:s'),
                ]);
            }

            Helper::success('驗證成功，已加入社團！', ['club_name' => $app['club_name'], 'club_id' => $clubId]);
        } catch (Exception $e) {
            Helper::error('驗證失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET ?action=unread_count
     * 取得未讀私訊總數（供導覽列紅點），包含平台機器人未讀訊息
     */
    public static function getUnreadCount() {
        if (!Auth::isLoggedIn()) {
            Helper::success('', ['count' => 0]);
            return;
        }
        $uid = Auth::getCurrentUserId();
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        try {
            $row = Database::getInstance()->fetchOne(
                'SELECT
                    (SELECT COUNT(*) FROM private_messages WHERE receiver_id = ? AND is_read = 0) +
                    (SELECT COUNT(*) FROM bot_messages   WHERE user_id     = ? AND is_read = 0)
                 AS cnt',
                [$uid, $uid]
            );
            Helper::success('', ['count' => (int)($row['cnt'] ?? 0)]);
        } catch (Exception $e) {
            Helper::success('', ['count' => 0]);
        }
    }

    /**
     * GET ?action=quiz_recommend&category=體育性&intensity=light|active|any&budget=0|500|any
     * 社團匹配測驗推薦端點：依類別、強度、預算找最多 3 個適合的社團，並存入 bot_messages
     */
    public static function quizRecommend() {
        $uid = self::requireLogin();
        if (session_status() === PHP_SESSION_ACTIVE) session_write_close();

        $category  = trim($_GET['category']  ?? '');
        $budget    = trim($_GET['budget']    ?? 'any');
        $intensity = trim($_GET['intensity'] ?? 'any');

        $validCats = ['體育性', '學術性', '藝文性', '服務性', '休閒性'];
        if (!in_array($category, $validCats, true)) {
            Helper::error('無效的社團類別', 400);
        }
        // DB category_name 與前端傳入值一致（均為「體育性」「學術性」…）
        $dbCategory = $category;

        if (!in_array($budget, ['0', '500', 'any'], true)) $budget = 'any';
        if (!in_array($intensity, ['light', 'active', 'any'], true)) $intensity = 'any';

        // 動態子句由白名單驗證過的固定字串組成，不含使用者輸入
        $budgetSql = '';
        if ($budget === '0') {
            $budgetSql = 'AND (c.club_fee_semester IS NULL OR c.club_fee_semester = 0)';
        } elseif ($budget === '500') {
            $budgetSql = 'AND (c.club_fee_semester IS NULL OR c.club_fee_semester <= 500)';
        }

        $intensitySql = '';
        if ($intensity === 'active') {
            $intensitySql = "AND c.activity_badge IN ('high_active','normal_active')";
        }

        try {
            $clubs = Database::getInstance()->fetchAll(
                "SELECT c.club_id, c.club_name,
                        LEFT(c.description, 100) AS description,
                        c.logo_path, cat.category_name,
                        c.club_fee_semester, c.activity_badge,
                        c.meeting_day, c.meeting_time,
                        (SELECT COUNT(*) FROM club_members cm2
                         WHERE cm2.club_id = c.club_id AND cm2.is_active = 1) AS member_count
                 FROM clubs c
                 LEFT JOIN club_categories cat ON cat.category_id = c.category_id
                 WHERE cat.category_name = ?
                   AND c.activity_status = 'active'
                   AND c.club_id NOT IN (
                       SELECT club_id FROM club_members WHERE user_id = ? AND is_active = 1
                   )
                   $budgetSql $intensitySql
                 ORDER BY
                   CASE c.activity_badge
                     WHEN 'high_active'   THEN 1
                     WHEN 'normal_active' THEN 2
                     ELSE 3
                   END,
                   member_count DESC
                 LIMIT 3",
                [$dbCategory, $uid]
            );

            dbInsert('bot_messages', [
                'user_id'      => $uid,
                'message_type' => 'club_match_result',
                'title'        => '社團匹配結果 🎯',
                'content'      => '根據你的測驗結果，為你推薦以下社團：',
                'meta'         => json_encode(['clubs' => $clubs, 'category' => $category]),
            ]);

            Helper::success('已取得推薦社團', ['clubs' => $clubs]);
        } catch (Exception $e) {
            Helper::error('推薦失敗：' . $e->getMessage(), 500);
        }
    }

    /**
     * GET ?action=fju_forms
     * 從輔大課指組網站即時抓取表單列表，快取 12 小時
     */
    public static function getFjuForms() {
        self::requireLogin();

        $cacheFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'fju_forms_v1.json';
        $ttl = 43200; // 12 hours

        if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $ttl) {
            $cached = json_decode(file_get_contents($cacheFile), true);
            if (is_array($cached) && count($cached) > 0) {
                Helper::success('ok', ['forms' => $cached, 'from_cache' => true]);
                return;
            }
        }

        $ch = curl_init('https://activity.fju.edu.tw/resource.jsp?labelID=21');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 12,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; ClubPlatform/1.0)',
        ]);
        $html = curl_exec($ch);
        curl_close($ch);

        if (!$html) {
            if (file_exists($cacheFile)) {
                $cached = json_decode(file_get_contents($cacheFile), true);
                if (is_array($cached) && count($cached) > 0) {
                    Helper::success('ok', ['forms' => $cached, 'from_cache' => true]);
                    return;
                }
            }
            Helper::error('無法取得課指組表單列表', 503);
            return;
        }

        $forms = self::parseFjuForms($html);
        @file_put_contents($cacheFile, json_encode($forms, JSON_UNESCAPED_UNICODE));
        Helper::success('ok', ['forms' => $forms, 'from_cache' => false]);
    }

    private static function parseFjuForms(string $html): array {
        $sections = [];

        // External entry prepended (Canva link not on FJU site)
        $sections[] = [
            'category' => '行政課程講義',
            'icon'     => '📖',
            'items'    => [
                ['name' => '114行政課程', 'url' => 'https://www.canva.com/design/DAGxsZXQGJk/MjhmQWrs3VwpEml60hVVOQ/view', 'external' => true],
            ],
        ];

        // Split HTML on <h3> boundaries
        if (preg_match_all('/<h3>(.*?)<\/h3>(.*?)(?=<h3>|$)/si', $html, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $cat = trim(html_entity_decode(strip_tags($match[1]), ENT_QUOTES, 'UTF-8'));
                if (!$cat) continue;

                $items = [];
                if (preg_match_all(
                    '/<li[^>]*title="([^"]+)"[^>]*>.*?href="(DownloadSubLabelFileServlet[^"]+)"/si',
                    $match[2], $lms, PREG_SET_ORDER
                )) {
                    foreach ($lms as $lm) {
                        $name = trim(html_entity_decode($lm[1], ENT_QUOTES, 'UTF-8'));
                        $url  = 'https://activity.fju.edu.tw/' . htmlspecialchars_decode($lm[2]);
                        if ($name && $url) {
                            $items[] = ['name' => $name, 'url' => $url, 'external' => false];
                        }
                    }
                }

                if ($items) {
                    $sections[] = [
                        'category' => $cat,
                        'icon'     => self::fjuFormIcon($cat),
                        'items'    => $items,
                    ];
                }
            }
        }

        // External entry appended (Google Forms / reurl.cc not on FJU site)
        $sections[] = [
            'category' => '電子交接資料',
            'icon'     => '💻',
            'items'    => [
                ['name' => '電子交接資料填寫網址',             'url' => 'https://forms.gle/s8jb4kwS1JyPBhLd6', 'external' => true],
                ['name' => '電子交接資料上傳檔案之格式連結', 'url' => 'https://reurl.cc/Z423EW',                'external' => true],
            ],
        ];

        return $sections;
    }

    private static function fjuFormIcon(string $cat): string {
        $map = [
            '行政課程' => '📖', '活動申請' => '📝', '酒精'    => '🍺',
            '攤位'    => '🏪', '場地'    => '🏟️', '核銷'    => '💰',
            '成果'    => '📊', '範例'    => '📄', '負責人'  => '🪪',
            '用火'    => '🔥', '娛樂稅'  => '🧾', '紙本交接' => '📦',
            '電子交接' => '💻',
        ];
        foreach ($map as $kw => $icon) {
            if (mb_strpos($cat, $kw, 0, 'UTF-8') !== false) return $icon;
        }
        return '📄';
    }
}

$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'conversations';
$data   = ($method === 'POST') ? Helper::getRequestInput() : [];

if ($method === 'GET') {
    if ($action === 'thread')           { MessagesAPI::getThread(); }
    elseif ($action === 'search_user')  { MessagesAPI::searchUser(); }
    elseif ($action === 'unread_count') { MessagesAPI::getUnreadCount(); }
    elseif ($action === 'bot_messages')   { MessagesAPI::getBotMessages(); }
    elseif ($action === 'note')           { MessagesAPI::getNote(); }
    elseif ($action === 'note_messages')  { MessagesAPI::getNoteMessages(); }
    elseif ($action === 'quiz_recommend') { MessagesAPI::quizRecommend(); }
    elseif ($action === 'fju_forms')      { MessagesAPI::getFjuForms(); }
    else                                  { MessagesAPI::getConversations(); }
}

if ($method === 'POST') {
    if ($action === 'send')              { MessagesAPI::sendMessage($data); }
    elseif ($action === 'mark_bot_read') { MessagesAPI::markBotMessageRead($data); }
    elseif ($action === 'save_note')          { MessagesAPI::saveNote($data); }
    elseif ($action === 'send_note_message')  { MessagesAPI::sendNoteMessage($data); }
    elseif ($action === 'recall_message')      { MessagesAPI::recallMessage($data); }
    elseif ($action === 'recall_note_message') { MessagesAPI::recallNoteMessage($data); }
    elseif ($action === 'toggle_reaction')     { MessagesAPI::toggleReaction($data); }
    elseif ($action === 'verify_join_code')   { MessagesAPI::verifyJoinCode($data); }
}

Helper::error('無效的請求', 400);
?>
