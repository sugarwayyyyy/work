<?php
/**
 * 通知 API 端點
 */

require_once '../auth.php';

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
                [Auth::getCurrentUserId()]
            );

            if (empty($events)) {
                Helper::success('取得動態牆成功', [
                    'feed' => [],
                    'empty_state' => [
                        'message' => '您尚未追蹤任何社團，無法顯示動態',
                        'cta_text' => '前往探索社團',
                        'cta_url' => 'pages/club-list.html'
                    ]
                ]);
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
                'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
                [Auth::getCurrentUserId()]
            );

            Helper::success('取得通知成功', ['notifications' => $notifications]);

        } catch (Exception $e) {
            Helper::error('取得通知失敗: ' . $e->getMessage(), 500);
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
    ? (Helper::getJsonInput() ?? $_POST)
    : [];

if ($method === 'GET') {
    if ($action === 'feed') {
        NotificationAPI::getMyFeed();
    } else {
        NotificationAPI::getNotifications();
    }
}

if ($method === 'POST') {
    if ($action === 'mark_read') {
        NotificationAPI::markAsRead($data);
    }
}

Helper::error('無效的請求', 400);
?>