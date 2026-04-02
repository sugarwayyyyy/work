<?php
/**
 * 社團幹部 API
 */

require_once '../auth.php';

class ClubAdminAPI {

    public static function requireClubAdmin() {
        if (!Auth::isClubAdmin() && !Auth::isAdmin()) {
            Helper::error('您無權限執行此操作', 403);
        }
    }

    public static function getMyClubs() {
        self::requireClubAdmin();

        $user_id = Auth::getCurrentUserId();
        $clubs = Database::getInstance()->fetchAll(
            'SELECT c.club_id, c.club_name, c.activity_status FROM clubs c '
            . 'JOIN club_members cm ON c.club_id = cm.club_id '
            . 'WHERE cm.user_id = ? AND cm.role IN ("president", "vice_president", "public_relations", "treasurer", "director")',
            [$user_id]
        );

        Helper::success('取得所屬社團成功', ['clubs' => $clubs]);
    }

    public static function getClubEvents($club_id) {
        self::requireClubAdmin();

        $club = Database::getInstance()->fetchOne('SELECT * FROM clubs WHERE club_id = ?', [$club_id]);
        if (!$club) {
            Helper::error('社團不存在', 404);
        }

        if (!Auth::isAdmin()) {
            $isMember = Database::getInstance()->fetchOne(
                'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? AND role IN ("president", "vice_president", "public_relations", "treasurer", "director")',
                [$club_id, Auth::getCurrentUserId()]
            );
            if (!$isMember) {
                Helper::error('您無權限檢視此社團', 403);
            }
        }

        $events = Database::getInstance()->fetchAll('SELECT * FROM events WHERE club_id = ? ORDER BY event_date DESC', [$club_id]);
        Helper::success('取得社團活動成功', ['events' => $events]);
    }

    public static function createClubEvent($data) {
        self::requireClubAdmin();

        $errors = Helper::validateRequired($data, ['club_id', 'event_name', 'event_date', 'location']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $club_id = (int)$data['club_id'];
        $isMember = Database::getInstance()->fetchOne(
            'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? AND role IN ("president", "vice_president", "public_relations", "treasurer", "director")',
            [$club_id, Auth::getCurrentUserId()]
        );
        if (!Auth::isAdmin() && !$isMember) {
            Helper::error('您無權限操作此社團', 403);
        }

        $event_id = dbInsert('events', [
            'club_id' => $club_id,
            'event_name' => $data['event_name'],
            'description' => $data['description'] ?? '',
            'event_date' => $data['event_date'],
            'location' => $data['location'],
            'capacity' => $data['capacity'] ?? null,
            'fee' => $data['fee'] ?? 0,
            'registration_deadline' => $data['registration_deadline'] ?? null,
            'event_status' => $data['event_status'] ?? 'draft',
            'is_registration_open' => $data['is_registration_open'] ?? 0,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        if (!$event_id) Helper::error('建立活動失敗', 500);
        Helper::success('活動建立成功', ['event_id' => $event_id]);
    }

    public static function submitTransferRequest($data) {
        self::requireClubAdmin();

        $errors = Helper::validateRequired($data, ['club_id', 'target_user_id', 'reason']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $club_id = (int)$data['club_id'];
        $requester_user_id = (int)Auth::getCurrentUserId();
        $target_user_id = (int)$data['target_user_id'];
        $reason = trim($data['reason']);
        $handover_note = trim($data['handover_note'] ?? '');

        if ($requester_user_id === $target_user_id) {
            Helper::error('轉讓對象不可為本人', 400);
        }

        $club = Database::getInstance()->fetchOne('SELECT club_id, club_name FROM clubs WHERE club_id = ?', [$club_id]);
        if (!$club) Helper::error('社團不存在', 404);

        $isMember = Database::getInstance()->fetchOne(
            'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? AND role IN ("president", "vice_president", "public_relations", "treasurer", "director") AND is_active = 1',
            [$club_id, $requester_user_id]
        );
        if (!Auth::isAdmin() && !$isMember) {
            Helper::error('您無權限對此社團送出轉讓申請', 403);
        }

        $targetUser = Database::getInstance()->fetchOne(
            'SELECT user_id, name, student_id, is_active FROM users WHERE user_id = ?',
            [$target_user_id]
        );
        if (!$targetUser || (int)$targetUser['is_active'] !== 1) {
            Helper::error('目標帳戶不存在或未啟用', 400);
        }

        $pendingRequest = Database::getInstance()->fetchOne(
            'SELECT request_id FROM account_transfer_requests WHERE club_id = ? AND requester_user_id = ? AND request_status = "pending"',
            [$club_id, $requester_user_id]
        );
        if ($pendingRequest) {
            Helper::error('你已有待審核中的轉讓申請，請先等待審核結果', 409);
        }

        $requestId = dbInsert('account_transfer_requests', [
            'club_id' => $club_id,
            'requester_user_id' => $requester_user_id,
            'target_user_id' => $target_user_id,
            'reason' => $reason,
            'handover_note' => $handover_note,
            'request_status' => 'pending',
            'requested_at' => date('Y-m-d H:i:s')
        ]);

        if (!$requestId) Helper::error('送出轉讓申請失敗', 500);

        Helper::success('轉讓申請已送出，待管理員審核', ['request_id' => $requestId]);
    }

    public static function getMyTransferRequests() {
        self::requireClubAdmin();
        $user_id = Auth::getCurrentUserId();

        $rows = Database::getInstance()->fetchAll(
            'SELECT r.request_id, r.club_id, c.club_name, c.club_code,
                    r.target_user_id, tu.name AS target_user_name, tu.student_id AS target_student_id,
                    r.reason, r.handover_note, r.request_status, r.review_note,
                    r.requested_at, r.reviewed_at
             FROM account_transfer_requests r
             JOIN clubs c ON r.club_id = c.club_id
             JOIN users tu ON r.target_user_id = tu.user_id
             WHERE r.requester_user_id = ?
             ORDER BY r.requested_at DESC',
            [$user_id]
        );

        Helper::success('取得我的轉讓申請成功', ['requests' => $rows]);
    }

}

$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'my_clubs';
$club_id = $_GET['id'] ?? null;

if ($method === 'GET') {
    if ($action === 'my_clubs') {
        ClubAdminAPI::getMyClubs();
    } elseif ($action === 'club_events' && $club_id) {
        ClubAdminAPI::getClubEvents($club_id);
    } elseif ($action === 'my_transfer_requests') {
        ClubAdminAPI::getMyTransferRequests();
    }
}

if ($method === 'POST') {
    $data = Helper::getJsonInput() ?? $_POST;
    if ($action === 'create_event') {
        ClubAdminAPI::createClubEvent($data);
    } elseif ($action === 'submit_transfer_request') {
        ClubAdminAPI::submitTransferRequest($data);
    }
}

Helper::error('無效請求', 400);
