<?php
/**
 * 通知 API 端點
 */

require_once '../auth.php';

// Handle CORS preflight requests
Helper::handleCorsPreFlight();

class NotificationAPI {

    /**
     * 取得個人動態牆（追蹤社團的未過期活動）
     * GET /api/notifications.php?action=feed
     */
    public static function getMyFeed() {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            $userId = Auth::getCurrentUserId();
            
            // 額外驗證：user_id 必須有效
            if (!$userId || !is_numeric($userId)) {
                Helper::error('無效的用戶身份', 401);
            }

            // 驗證 user_id 確實存在於資料庫
            $userExists = Database::getInstance()->fetchOne(
                'SELECT user_id FROM users WHERE user_id = ?',
                [$userId]
            );
            
            if (!$userExists) {
                Helper::error('用戶不存在', 401);
            }

            $followCountRow = Database::getInstance()->fetchOne(
                'SELECT COUNT(*) AS total FROM club_followers WHERE user_id = ?',
                [$userId]
            );
            $followCount = (int)($followCountRow['total'] ?? 0);

            // 優先顯示即將到來的活動
            $events = Database::getInstance()->fetchAll(
                'SELECT
                    e.event_id,
                    e.event_name,
                    e.description,
                    e.event_date,
                    e.location,
                    e.published_at,
                    c.club_id,
                    c.club_name
                 FROM club_followers cf
                 JOIN clubs c ON c.club_id = cf.club_id
                 JOIN events e ON e.club_id = c.club_id
                 WHERE cf.user_id = ?
                   AND c.deleted_at IS NULL
                   AND c.activity_status = "active"
                   AND e.event_status = "published"
                   AND e.event_date >= NOW()
                 ORDER BY COALESCE(e.published_at, e.created_at) DESC, e.event_date ASC',
                [$userId]
            );

            // 若沒有未來活動，改抓追蹤社團最近動態（避免誤判成未追蹤）
            if (empty($events) && $followCount > 0) {
                $events = Database::getInstance()->fetchAll(
                    'SELECT
                        e.event_id,
                        e.event_name,
                        e.description,
                        e.event_date,
                        e.location,
                        e.published_at,
                        c.club_id,
                        c.club_name
                     FROM club_followers cf
                     JOIN clubs c ON c.club_id = cf.club_id
                     JOIN events e ON e.club_id = c.club_id
                     WHERE cf.user_id = ?
                       AND c.deleted_at IS NULL
                       AND c.activity_status = "active"
                       AND e.event_status IN ("published", "ongoing", "completed")
                       AND e.event_date >= DATE_SUB(NOW(), INTERVAL 120 DAY)
                     ORDER BY e.event_date DESC
                     LIMIT 20',
                    [$userId]
                );
            }

            if (empty($events)) {
                $emptyMessage = $followCount > 0
                    ? '您已追蹤社團，但目前尚無可顯示的活動動態'
                    : '您尚未追蹤任何社團，無法顯示動態';

                Helper::success('取得動態牆成功', [
                    'feed' => [],
                    'empty_state' => [
                        'message' => $emptyMessage,
                        'cta_text' => '前往探索社團',
                        'cta_url' => 'pages/club-list.html'
                    ]
                ]);
                return;
            }

            Helper::success('取得動態牆成功', [
                'feed' => $events,
                'empty_state' => null
            ]);

        } catch (Exception $e) {
            Helper::error('取得動態牆失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 取得用戶通知
     * GET /api/notifications.php
     */
    public static function getNotifications() {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            $notifications = Database::getInstance()->fetchAll(
                'SELECT n.*, qr.qa_id AS qa_id_from_reply
                 FROM notifications n
                 LEFT JOIN qa_replies qr
                   ON n.notification_type = "qa_reply"
                  AND n.related_id = qr.reply_id
                 WHERE n.user_id = ?
                 ORDER BY n.created_at DESC
                 LIMIT 50',
                [Auth::getCurrentUserId()]
            );

            Helper::success('取得通知成功', ['notifications' => $notifications]);

        } catch (Exception $e) {
            Helper::error('取得通知失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 一鍵全部標記為已讀
     * POST /api/notifications.php?action=mark_all_read
     */
    public static function markAllAsRead() {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            dbUpdate('notifications', ['is_read' => 1], 'user_id = ? AND is_read = 0', [
                Auth::getCurrentUserId()
            ]);
            Helper::success('全部標記已讀成功');
        } catch (Exception $e) {
            Helper::error('標記已讀失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 取得未讀通知數量
     * GET /api/notifications.php?action=unread_count
     */
    public static function getUnreadCount() {
        if (!Auth::isLoggedIn()) {
            Helper::success('', ['count' => 0]);
            return;
        }

        try {
            $uid = Auth::getCurrentUserId();
            $row = Database::getInstance()->fetchOne(
                'SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0',
                [$uid]
            );
            $notifCount = (int)($row['cnt'] ?? 0);

            Helper::success('', ['count' => $notifCount]);
        } catch (Exception $e) {
            Helper::success('', ['count' => 0]);
        }
    }

    /**
     * 刪除單則通知
     * POST /api/notifications.php?action=delete
     */
    public static function deleteNotification($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            $errors = Helper::validateRequired($data, ['notification_id']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }

            dbDelete('notifications', 'notification_id = ? AND user_id = ?', [
                (int)$data['notification_id'],
                Auth::getCurrentUserId()
            ]);

            Helper::success('刪除成功');
        } catch (Exception $e) {
            Helper::error('刪除失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 標記通知為已讀
     * POST /api/notifications.php?action=mark_read
     */
    public static function markAsRead($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            $errors = Helper::validateRequired($data, ['notification_id']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }

            dbUpdate('notifications', ['is_read' => 1], 'notification_id = ? AND user_id = ?', [
                $data['notification_id'],
                Auth::getCurrentUserId()
            ]);

            Helper::success('標記已讀成功');

        } catch (Exception $e) {
            Helper::error('標記已讀失敗: ' . $e->getMessage(), 500);
        }
    }
}

// 路由處理
$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'list';

$data = ($method === 'POST' || $method === 'PUT')
    ? Helper::getRequestInput()
    : [];

if ($method === 'GET') {
    if ($action === 'feed') {
        NotificationAPI::getMyFeed();
    } elseif ($action === 'unread_count') {
        NotificationAPI::getUnreadCount();
    } else {
        NotificationAPI::getNotifications();
    }
}

if ($method === 'POST') {
    if ($action === 'mark_all_read') {
        NotificationAPI::markAllAsRead();
    } elseif ($action === 'mark_read') {
        NotificationAPI::markAsRead($data);
    } elseif ($action === 'delete') {
        NotificationAPI::deleteNotification($data);
    }
}

Helper::error('無效的請求', 400);
