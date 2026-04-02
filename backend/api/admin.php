<?php
/**
 * 管理員專用 API
 */

require_once '../auth.php';

class AdminAPI {

    private static function notifyAllUsersForAnnouncement($announcement_id, $title) {
        $users = Database::getInstance()->fetchAll('SELECT user_id FROM users WHERE is_active = 1');
        foreach ($users as $user) {
            dbInsert('notifications', [
                'user_id' => $user['user_id'],
                'title' => '全校公告',
                'message' => '有新的全校公告：' . $title,
                'notification_type' => 'announcement',
                'related_type' => 'announcement',
                'related_id' => $announcement_id,
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }

    public static function requireAdmin() {
        if (!Auth::isAdmin()) {
            Helper::error('您無權限執行此操作', 403);
        }
    }

    public static function getUsers() {
        self::requireAdmin();
        $users = Database::getInstance()->fetchAll('SELECT user_id, name, email, role, created_at, is_active FROM users ORDER BY created_at DESC');
        Helper::success('取得用戶列表成功', ['users' => $users]);
    }

    public static function getClubs() {
        self::requireAdmin();
        $clubs = Database::getInstance()->fetchAll('SELECT club_id, club_code, club_name, category_id, activity_status, deleted_at, created_at FROM clubs ORDER BY created_at DESC');
        Helper::success('取得社團清單成功', ['clubs' => $clubs]);
    }

    public static function createClubBase($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['club_code', 'club_name', 'category_id']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $club_id = dbInsert('clubs', [
            'club_code' => trim($data['club_code']),
            'club_name' => trim($data['club_name']),
            'category_id' => (int)$data['category_id'],
            'description' => $data['description'] ?? '',
            'meeting_time' => $data['meeting_time'] ?? '',
            'contact_email' => $data['contact_email'] ?? '',
            'activity_status' => $data['activity_status'] ?? 'active',
            'deleted_at' => null,
            'last_updated' => date('Y-m-d H:i:s')
        ]);

        if (!$club_id) Helper::error('新增社團失敗', 500);
        Helper::success('新增社團成功', ['club_id' => $club_id]);
    }

    public static function updateClubBase($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['club_id', 'club_code', 'club_name', 'category_id']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $club_id = (int)$data['club_id'];
        $result = dbUpdate('clubs', [
            'club_code' => trim($data['club_code']),
            'club_name' => trim($data['club_name']),
            'category_id' => (int)$data['category_id'],
            'last_updated' => date('Y-m-d H:i:s')
        ], 'club_id = ?', [$club_id]);

        if (!$result) Helper::error('更新社團基礎名單失敗', 500);
        Helper::success('更新社團基礎名單成功');
    }

    public static function softDeleteClub($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['club_id']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $club_id = (int)$data['club_id'];
        $hide = isset($data['hide']) ? (bool)$data['hide'] : true;

        $update = [
            'activity_status' => $hide ? 'inactive' : 'active',
            'deleted_at' => $hide ? date('Y-m-d H:i:s') : null,
            'last_updated' => date('Y-m-d H:i:s')
        ];

        $result = dbUpdate('clubs', $update, 'club_id = ?', [$club_id]);
        if (!$result) Helper::error('更新社團隱藏狀態失敗', 500);

        Helper::success($hide ? '社團已停用/隱藏' : '社團已恢復顯示');
    }

    public static function updateUserRole($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['user_id', 'role']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $user_id = (int)$data['user_id'];
        $role = in_array($data['role'], ['student', 'club_admin', 'platform_admin']) ? $data['role'] : 'student';

        $result = dbUpdate('users', ['role' => $role], 'user_id = ?', [$user_id]);
        if (!$result) Helper::error('更新用戶角色失敗', 500);

        Helper::success('用戶角色更新成功');
    }

    public static function updateClubStatus($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['club_id', 'activity_status']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $club_id = (int)$data['club_id'];
        $status = in_array($data['activity_status'], ['active', 'inactive', 'suspended', 'pending']) ? $data['activity_status'] : 'inactive';

        $result = dbUpdate('clubs', ['activity_status' => $status], 'club_id = ?', [$club_id]);
        if (!$result) Helper::error('更新社團狀態失敗', 500);

        Helper::success('社團狀態更新成功');
    }

    public static function getEventReports() {
        self::requireAdmin();
        $reports = Database::getInstance()->fetchAll('
            SELECT
                e.event_id,
                e.event_name,
                e.event_status,
                COUNT(er.user_id) as participants_count,
                AVG(er.rating) as average_rating
            FROM events e
            LEFT JOIN event_registrations er ON e.event_id = er.event_id
            GROUP BY e.event_id, e.event_name, e.event_status
            ORDER BY e.created_at DESC
        ');
        Helper::success('取得活動報告成功', ['reports' => $reports]);
    }

    public static function getUserFeedback() {
        self::requireAdmin();
        $feedback = Database::getInstance()->fetchAll('
            SELECT
                f.feedback_id,
                f.feedback_type,
                f.content,
                f.created_at,
                u.name as user_name,
                u.email as user_email
            FROM feedback f
            JOIN users u ON f.user_id = u.user_id
            ORDER BY f.created_at DESC
        ');
        Helper::success('取得用戶回饋成功', ['feedback' => $feedback]);
    }

    public static function createAnnouncement($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['title', 'content', 'type']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $announcement = [
            'title' => trim($data['title']),
            'content' => trim($data['content']),
            'announcement_type' => in_array($data['type'], ['event', 'maintenance', 'update', 'important']) ? $data['type'] : 'important',
            'is_pinned' => isset($data['is_sticky']) ? (int)$data['is_sticky'] : 0,
            'created_by' => Auth::getCurrentUser()['user_id'],
            'created_at' => date('Y-m-d H:i:s')
        ];

        $announcement_id = dbInsert('system_announcements', $announcement);
        if (!$announcement_id) Helper::error('創建公告失敗', 500);

        self::notifyAllUsersForAnnouncement($announcement_id, $announcement['title']);

        Helper::success('公告創建成功', ['announcement_id' => $announcement_id]);
    }

    public static function getAnnouncements() {
                $announcements = Database::getInstance()->fetchAll(
                        'SELECT * FROM system_announcements
                         WHERE (start_date IS NULL OR start_date <= NOW())
                             AND (end_date IS NULL OR end_date >= NOW())
                         ORDER BY is_pinned DESC, display_priority DESC, created_at DESC'
                );
        Helper::success('取得公告列表成功', ['announcements' => $announcements]);
    }

    public static function deleteAnnouncement($id) {
        self::requireAdmin();
        $result = dbDelete('system_announcements', 'announcement_id = ?', [$id]);
        if (!$result) Helper::error('刪除公告失敗', 500);

        Helper::success('公告刪除成功');
    }

    public static function transferAccount($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['from_user_id', 'to_user_id', 'reason']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $from_user_id = (int)$data['from_user_id'];
        $to_user_id = (int)$data['to_user_id'];
        $reason = trim($data['reason']);
        $admin_user_id = Auth::getCurrentUser()['user_id'];

        // 檢查用戶是否存在
        $from_user = Database::getInstance()->fetchOne('SELECT user_id FROM users WHERE user_id = ?', [$from_user_id]);
        $to_user = Database::getInstance()->fetchOne('SELECT user_id FROM users WHERE user_id = ?', [$to_user_id]);

        if (!$from_user || !$to_user) {
            Helper::error('用戶不存在', 404);
        }

        // 記錄轉讓操作（這裡需要指定club_id，假設是社團管理權限轉讓）
        $transfer_record = [
            'club_id' => 0, // 臨時設置，需要根據實際需求修改
            'from_user_id' => $from_user_id,
            'to_user_id' => $to_user_id,
            'transferred_roles' => json_encode(['reason' => $reason]), // 存儲原因
            'transferred_at' => date('Y-m-d H:i:s'),
            'transferred_by' => $admin_user_id,
            'reason' => $reason
        ];

        $result = dbInsert('account_transfers', $transfer_record);
        if (!$result) Helper::error('帳戶轉讓記錄失敗', 500);

        // 這裡可以添加實際的帳戶轉讓邏輯，比如轉移社團管理權限等
        // 根據具體需求實現

        Helper::success('帳戶轉讓成功');
    }

    public static function getTransferHistory() {
        self::requireAdmin();
        $transfers = Database::getInstance()->fetchAll('
            SELECT at.*, u1.name as from_user_name, u2.name as to_user_name, u3.name as admin_name
            FROM account_transfers at
            JOIN users u1 ON at.from_user_id = u1.user_id
            JOIN users u2 ON at.to_user_id = u2.user_id
            JOIN users u3 ON at.transferred_by = u3.user_id
            ORDER BY at.transferred_at DESC
        ');
        Helper::success('取得轉讓歷史成功', ['transfers' => $transfers]);
    }

}

$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'users';

if ($method === 'GET') {
    if ($action === 'users') {
        AdminAPI::getUsers();
    } elseif ($action === 'clubs') {
        AdminAPI::getClubs();
    } elseif ($action === 'event_reports') {
        AdminAPI::getEventReports();
    } elseif ($action === 'user_feedback') {
        AdminAPI::getUserFeedback();
    } elseif ($action === 'announcements') {
        AdminAPI::getAnnouncements();
    } elseif ($action === 'transfer_history') {
        AdminAPI::getTransferHistory();
    }
}

if ($method === 'POST') {
    $data = Helper::getJsonInput() ?? $_POST;
    if ($action === 'update_user_role') {
        AdminAPI::updateUserRole($data);
    } elseif ($action === 'update_club_status') {
        AdminAPI::updateClubStatus($data);
    } elseif ($action === 'create_club') {
        AdminAPI::createClubBase($data);
    } elseif ($action === 'update_club') {
        AdminAPI::updateClubBase($data);
    } elseif ($action === 'soft_delete_club') {
        AdminAPI::softDeleteClub($data);
    } elseif ($action === 'create_announcement') {
        AdminAPI::createAnnouncement($data);
    } elseif ($action === 'transfer_account') {
        AdminAPI::transferAccount($data);
    }
}

if ($method === 'DELETE') {
    if ($action === 'delete_announcement') {
        $id = $_GET['id'] ?? null;
        if (!$id) Helper::error('缺少公告ID', 400);
        AdminAPI::deleteAnnouncement($id);
    }
}

Helper::error('無效請求', 400);
