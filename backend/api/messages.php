<?php
/**
 * 私訊 API 端點
 */

require_once '../auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Helper::applyCorsHeaders();
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');
    exit(0);
}

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
                'SELECT m.message_id, m.sender_id, m.receiver_id, m.content, m.is_read, m.created_at,
                        u.name AS sender_name, u.avatar_path AS sender_avatar
                 FROM private_messages m
                 JOIN users u ON u.user_id = m.sender_id
                 WHERE (m.sender_id = ? AND m.receiver_id = ?)
                    OR (m.sender_id = ? AND m.receiver_id = ?)
                 ORDER BY m.created_at ASC
                 LIMIT 200',
                [$uid, $otherId, $otherId, $uid]
            );

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
    public static function sendMessage($data) {
        $uid = self::requireLogin();

        $receiverId = (int)($data['receiver_id'] ?? 0);
        $content = trim((string)($data['content'] ?? ''));

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

        try {
            $receiver = Database::getInstance()->fetchOne(
                'SELECT user_id FROM users WHERE user_id = ?',
                [$receiverId]
            );
            if (!$receiver) {
                Helper::error('找不到該用戶', 404);
            }

            $messageId = dbInsert('private_messages', [
                'sender_id'   => $uid,
                'receiver_id' => $receiverId,
                'content'     => $content,
            ]);

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
     * GET ?action=unread_count
     * 取得未讀私訊總數（供導覽列紅點）
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
                'SELECT COUNT(*) AS cnt FROM private_messages WHERE receiver_id = ? AND is_read = 0',
                [$uid]
            );
            Helper::success('', ['count' => (int)($row['cnt'] ?? 0)]);
        } catch (Exception $e) {
            Helper::success('', ['count' => 0]);
        }
    }
}

$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'conversations';
$data   = ($method === 'POST') ? Helper::getRequestInput() : [];

if ($method === 'GET') {
    if ($action === 'thread')       { MessagesAPI::getThread(); }
    elseif ($action === 'search_user') { MessagesAPI::searchUser(); }
    elseif ($action === 'unread_count') { MessagesAPI::getUnreadCount(); }
    else                            { MessagesAPI::getConversations(); }
}

if ($method === 'POST') {
    if ($action === 'send') { MessagesAPI::sendMessage($data); }
}

Helper::error('無效的請求', 400);
?>
