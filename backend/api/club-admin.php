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

}

$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'my_clubs';
$club_id = $_GET['id'] ?? null;

if ($method === 'GET') {
    if ($action === 'my_clubs') {
        ClubAdminAPI::getMyClubs();
    } elseif ($action === 'club_events' && $club_id) {
        ClubAdminAPI::getClubEvents($club_id);
    }
}

if ($method === 'POST') {
    $data = Helper::getJsonInput() ?? $_POST;
    if ($action === 'create_event') {
        ClubAdminAPI::createClubEvent($data);
    }
}

Helper::error('無效請求', 400);
