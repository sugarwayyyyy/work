<?php
/**
 * 活動 API 端點
 */

require_once '../auth.php';

class EventAPI {

    private static function notifyFollowersForNewEvent($event_id, $club_id, $event_name) {
        $followers = Database::getInstance()->fetchAll(
            'SELECT user_id FROM club_followers WHERE club_id = ? AND is_subscribing_notifications = 1',
            [$club_id]
        );

        foreach ($followers as $follower) {
            dbInsert('notifications', [
                'user_id' => $follower['user_id'],
                'title' => '新活動通知',
                'message' => '你追蹤的社團發布新活動：' . $event_name,
                'notification_type' => 'event',
                'related_type' => 'event',
                'related_id' => $event_id,
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }
    
    /**
     * 取得活動列表
     * GET /api/events.php?club_id=1&status=published&page=1
     */
    public static function getEvents() {
        try {
            $club_id_raw = $_GET['club_id'] ?? ($_GET['club'] ?? null);
            $club_id = null;
            $club_keyword = null;
            if ($club_id_raw !== null && trim((string)$club_id_raw) !== '') {
                if (ctype_digit((string)$club_id_raw)) {
                    $club_id = (int)$club_id_raw;
                } else {
                    $club_keyword = trim((string)$club_id_raw);
                }
            }
            $status = $_GET['status'] ?? 'published';
            $search = $_GET['search'] ?? '';
            $date_from = $_GET['date_from'] ?? null;
            $date_to = $_GET['date_to'] ?? null;
            $min_fee = $_GET['min_fee'] ?? null;
            $max_fee = $_GET['max_fee'] ?? null;
            $page = (int)($_GET['page'] ?? 1);
            $per_page = ITEMS_PER_PAGE;
            $offset = ($page - 1) * $per_page;
            
            $conditions = ["event_status = ?"];
            $params = [$status];
            
            if ($club_id) {
                $conditions[] = 'club_id = ?';
                $params[] = $club_id;
            }

            if ($club_keyword) {
                $conditions[] = 'EXISTS (SELECT 1 FROM clubs c WHERE c.club_id = events.club_id AND c.club_name LIKE ?)';
                $params[] = "%$club_keyword%";
            }

            if ($search) {
                $conditions[] = 'event_name LIKE ?';
                $params[] = "%$search%";
            }

            if ($date_from) {
                $conditions[] = 'event_date >= ?';
                $params[] = $date_from . ' 00:00:00';
            }

            if ($date_to) {
                $conditions[] = 'event_date <= ?';
                $params[] = $date_to . ' 23:59:59';
            }

            if ($min_fee !== null) {
                $conditions[] = 'fee >= ?';
                $params[] = $min_fee;
            }

            if ($max_fee !== null) {
                $conditions[] = 'fee <= ?';
                $params[] = $max_fee;
            }

            if ($status === 'published') {
                $conditions[] = 'event_date >= NOW()';
            }
            
            $where = implode(' AND ', $conditions);
            
            $sql = "SELECT * FROM events WHERE $where ORDER BY event_date ASC LIMIT ? OFFSET ?";
            $stmt = Database::getInstance()->prepare($sql);
            if ($stmt === false) {
                throw new Exception('查詢準備失敗: ' . Database::getInstance()->error);
            }

            $queryParams = $params; // 複製原始條件，避免後面影響
            $types = str_repeat('s', count($queryParams)) . 'ii';
            $queryParams[] = $per_page;
            $queryParams[] = $offset;
            $stmt->bind_param($types, ...$queryParams);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $events = [];
            while ($row = $result->fetch_assoc()) {
                // 取得報名人數
                $registration = Database::getInstance()->fetchOne(
                    'SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ?',
                    [$row['event_id']]
                );
                $row['registered_count'] = $registration['count'];
                $events[] = $row;
            }
            $stmt->close();
            
            // 取得該活動的社團名稱
            foreach ($events as &$event) {
                $club = Database::getInstance()->fetchOne(
                    'SELECT club_name FROM clubs WHERE club_id = ?',
                    [$event['club_id']]
                );
                $event['club_name'] = $club['club_name'] ?? '';
            }
            
            // 取得總數
            $count_stmt = Database::getInstance()->prepare(
                "SELECT COUNT(*) as total FROM events WHERE $where"
            );
            if ($count_stmt === false) {
                throw new Exception('計數查詢準備失敗: ' . Database::getInstance()->error);
            }
            if (!empty($params)) {
                $count_stmt->bind_param(str_repeat('s', count($params)), ...$params);
            }
            $count_stmt->execute();
            $count_result = $count_stmt->get_result();
            $total = $count_result->fetch_assoc()['total'];
            $count_stmt->close();
            
            Helper::success('取得活動列表成功', [
                'events' => $events,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $per_page,
                    'total' => $total,
                    'total_pages' => ceil($total / $per_page)
                ]
            ]);
            
        } catch (Exception $e) {
            Helper::error('取得活動列表失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 取得單個活動詳情
     * GET /api/events.php?action=detail&id=1
     */
    public static function getEventDetail($event_id) {
        try {
            $event = Database::getInstance()->fetchOne(
                'SELECT * FROM events WHERE event_id = ?',
                [$event_id]
            );
            
            if (!$event) {
                Helper::error('活動不存在', 404);
            }
            
            // 取得社團信息
            $club = Database::getInstance()->fetchOne(
                'SELECT * FROM clubs WHERE club_id = ?',
                [$event['club_id']]
            );
            $event['club'] = $club;
            
            // 取得報名人數
            $registration = Database::getInstance()->fetchOne(
                'SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ?',
                [$event_id]
            );
            $event['registered_count'] = $registration['count'];
            
            // 取得出席人數
            $attendance = Database::getInstance()->fetchOne(
                'SELECT COUNT(*) as count FROM event_attendance WHERE event_id = ?',
                [$event_id]
            );
            $event['attendance_count'] = $attendance['count'];
            
            // 檢查用戶是否報名
            $user_registration = null;
            if (Auth::isLoggedIn()) {
                $user_registration = Database::getInstance()->fetchOne(
                    'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?',
                    [$event_id, Auth::getCurrentUserId()]
                );
            }
            $event['user_registration'] = $user_registration;
            
            Helper::success('取得活動詳情成功', $event);
            
        } catch (Exception $e) {
            Helper::error('取得活動詳情失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 建立活動
     * POST /api/events.php?action=create
     */
    public static function createEvent($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }
        
        try {
            $errors = Helper::validateRequired($data, ['club_id', 'event_name', 'description', 'event_date', 'location']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }
            
            // 檢查用戶權限
            $member = Database::getInstance()->fetchOne(
                'SELECT * FROM club_members WHERE club_id = ? AND user_id = ? AND role IN ("president", "vice_president", "director", "public_relations")',
                [$data['club_id'], Auth::getCurrentUserId()]
            );
            
            if (!$member && !Auth::isAdmin()) {
                Helper::error('您無權限發布活動', 403);
            }
            
            $event_id = dbInsert('events', [
                'club_id' => $data['club_id'],
                'event_name' => $data['event_name'],
                'description' => $data['description'],
                'event_date' => $data['event_date'],
                'location' => $data['location'],
                'capacity' => $data['capacity'] ?? 0,
                'fee' => $data['fee'] ?? 0,
                'registration_deadline' => $data['registration_deadline'] ?? null,
                'event_status' => 'published',
                'is_registration_open' => $data['is_registration_open'] ?? false,
                'published_at' => date('Y-m-d H:i:s')
            ]);
            
            if (!$event_id) {
                Helper::error('建立活動失敗', 500);
            }
            
            // 紀錄活動日誌
            dbInsert('activity_logs', [
                'club_id' => $data['club_id'],
                'activity_type' => 'post_event',
                'triggered_by' => Auth::getCurrentUserId(),
                'description' => '發布了新活動: ' . $data['event_name']
            ]);

            dbUpdate('clubs', [
                'last_updated' => date('Y-m-d H:i:s'),
                'last_activity_date' => date('Y-m-d H:i:s')
            ], 'club_id = ?', [$data['club_id']]);

            self::notifyFollowersForNewEvent($event_id, (int)$data['club_id'], $data['event_name']);
            
            Helper::success('活動建立成功', ['event_id' => $event_id]);
            
        } catch (Exception $e) {
            Helper::error('建立活動失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 更新活動
     * PUT /api/events.php?action=update&id=1
     */
    public static function updateEvent($event_id, $data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            // 檢查權限
            $event = Database::getInstance()->fetchOne('SELECT * FROM events WHERE event_id = ?', [$event_id]);
            if (!$event) {
                Helper::error('活動不存在', 404);
            }

            $member = Database::getInstance()->fetchOne(
                'SELECT * FROM club_members WHERE club_id = ? AND user_id = ? AND role IN ("president", "vice_president", "director", "public_relations")',
                [$event['club_id'], Auth::getCurrentUserId()]
            );

            if (!$member && !Auth::isAdmin()) {
                Helper::error('您無權限編輯此活動', 403);
            }

            // 更新活動信息
            $update_data = [
                'event_name' => $data['event_name'] ?? $event['event_name'],
                'description' => $data['description'] ?? $event['description'],
                'event_date' => $data['event_date'] ?? $event['event_date'],
                'location' => $data['location'] ?? $event['location'],
                'capacity' => $data['capacity'] ?? $event['capacity'],
                'fee' => $data['fee'] ?? $event['fee'],
                'registration_deadline' => $data['registration_deadline'] ?? $event['registration_deadline'],
                'is_registration_open' => $data['is_registration_open'] ?? $event['is_registration_open'],
                'updated_at' => date('Y-m-d H:i:s')
            ];

            if (isset($data['poster_path'])) {
                $update_data['poster_path'] = $data['poster_path'];
            }

            dbUpdate('events', $update_data, 'event_id = ?', [$event_id]);

            // 紀錄活動日誌
            dbInsert('activity_logs', [
                'club_id' => $event['club_id'],
                'activity_type' => 'activity',
                'triggered_by' => Auth::getCurrentUserId(),
                'description' => '更新了活動: ' . $event['event_name']
            ]);

            dbUpdate('clubs', [
                'last_updated' => date('Y-m-d H:i:s'),
                'last_activity_date' => date('Y-m-d H:i:s')
            ], 'club_id = ?', [$event['club_id']]);

            Helper::success('活動更新成功');

        } catch (Exception $e) {
            Helper::error('更新活動失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 報名活動
     * POST /api/events.php?action=register&id=1
     */
    public static function registerEvent($event_id) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }
        
        try {
            $event = Database::getInstance()->fetchOne(
                'SELECT * FROM events WHERE event_id = ?',
                [$event_id]
            );
            
            if (!$event) {
                Helper::error('活動不存在', 404);
            }
            
            if (!$event['is_registration_open']) {
                Helper::error('此活動不開放報名', 400);
            }
            
            // 檢查是否已報名
            $existing = Database::getInstance()->fetchOne(
                'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?',
                [$event_id, Auth::getCurrentUserId()]
            );
            
            if ($existing) {
                Helper::error('您已報名此活動', 400);
            }
            
            // 檢查是否超過容納人數
            if ($event['capacity'] > 0) {
                $count = Database::getInstance()->fetchOne(
                    'SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ?',
                    [$event_id]
                );
                if ($count['count'] >= $event['capacity']) {
                    Helper::error('活動已滿額', 400);
                }
            }
            
            $registration_id = dbInsert('event_registrations', [
                'event_id' => $event_id,
                'user_id' => Auth::getCurrentUserId(),
                'status' => 'approved'
            ]);
            
            if (!$registration_id) {
                Helper::error('報名失敗', 500);
            }
            
            Helper::success('報名成功', ['registration_id' => $registration_id]);
            
        } catch (Exception $e) {
            Helper::error('報名失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 取消報名
     * POST /api/events.php?action=unregister
     */
    public static function cancelRegistration($event_id) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        if (!$event_id) {
            Helper::error('缺少活動ID', 400);
        }

        try {
            $event = Database::getInstance()->fetchOne(
                'SELECT event_id FROM events WHERE event_id = ?',
                [$event_id]
            );

            if (!$event) {
                Helper::error('活動不存在', 404);
            }

            $existing = Database::getInstance()->fetchOne(
                'SELECT registration_id FROM event_registrations WHERE event_id = ? AND user_id = ?',
                [$event_id, Auth::getCurrentUserId()]
            );

            if (!$existing) {
                Helper::error('您尚未報名此活動', 400);
            }

            $deleted = dbDelete(
                'event_registrations',
                'event_id = ? AND user_id = ?',
                [$event_id, Auth::getCurrentUserId()]
            );

            if (!$deleted) {
                Helper::error('取消報名失敗', 500);
            }

            Helper::success('取消報名成功');

        } catch (Exception $e) {
            Helper::error('取消報名失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 檢查報名狀態
     * GET /api/events.php?action=check_registration&event_id=1
     */
    public static function checkRegistrationStatus() {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        $event_id = $_GET['event_id'] ?? null;
        if (!$event_id) {
            Helper::error('缺少活動ID', 400);
        }

        try {
            $registration = Database::getInstance()->fetchOne(
                'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?',
                [$event_id, Auth::getCurrentUserId()]
            );

            Helper::success('檢查報名狀態成功', [
                'registered' => $registration ? true : false,
                'registration' => $registration
            ]);

        } catch (Exception $e) {
            Helper::error('檢查報名狀態失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 取得活動參與者
     * GET /api/events.php?action=participants&event_id=1
     */
    public static function getParticipants() {
        $event_id = $_GET['event_id'] ?? null;
        if (!$event_id) {
            Helper::error('缺少活動ID', 400);
        }

        try {
            $participants = Database::getInstance()->fetchAll(
                'SELECT u.name, u.student_id FROM event_registrations er
                 JOIN users u ON er.user_id = u.user_id
                 WHERE er.event_id = ? AND er.status = "approved"
                 ORDER BY er.registered_at ASC',
                [$event_id]
            );

            Helper::success('取得參與者成功', ['participants' => $participants]);

        } catch (Exception $e) {
            Helper::error('取得參與者失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 取得活動評論
     * GET /api/events.php?action=comments&event_id=1
     */
    public static function getComments() {
        $event_id = $_GET['event_id'] ?? null;
        if (!$event_id) {
            Helper::error('缺少活動ID', 400);
        }

        try {
            $comments = Database::getInstance()->fetchAll(
                'SELECT ec.*, u.name as user_name FROM event_comments ec
                 JOIN users u ON ec.user_id = u.user_id
                 WHERE ec.event_id = ?
                 ORDER BY ec.created_at DESC',
                [$event_id]
            );

            Helper::success('取得評論成功', ['comments' => $comments]);

        } catch (Exception $e) {
            Helper::error('取得評論失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 取得用戶的活動
     * GET /api/events.php?action=my_events
     */
    public static function getMyEvents() {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            $events = Database::getInstance()->fetchAll(
                'SELECT e.*, c.club_name, er.registration_status FROM events e
                 JOIN event_registrations er ON e.event_id = er.event_id
                 JOIN clubs c ON e.club_id = c.club_id
                 WHERE er.user_id = ? AND er.status = "approved"
                 ORDER BY e.event_date DESC',
                [Auth::getCurrentUserId()]
            );

            Helper::success('取得我的活動成功', ['events' => $events]);

        } catch (Exception $e) {
            Helper::error('取得我的活動失敗: ' . $e->getMessage(), 500);
        }
    }
    public static function addComment($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        try {
            $errors = Helper::validateRequired($data, ['event_id', 'rating', 'comment']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }

            // 檢查用戶是否參加過活動
            $participated = Database::getInstance()->fetchOne(
                'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ? AND status = "approved"',
                [$data['event_id'], Auth::getCurrentUserId()]
            );

            if (!$participated) {
                Helper::error('只有參加過活動的用戶才能評論', 403);
            }

            // 檢查是否已評論
            $existing = Database::getInstance()->fetchOne(
                'SELECT * FROM event_comments WHERE event_id = ? AND user_id = ?',
                [$data['event_id'], Auth::getCurrentUserId()]
            );

            if ($existing) {
                Helper::error('您已經評論過此活動', 409);
            }

            $comment_id = dbInsert('event_comments', [
                'event_id' => $data['event_id'],
                'user_id' => Auth::getCurrentUserId(),
                'rating' => $data['rating'],
                'comment' => $data['comment']
            ]);

            if (!$comment_id) {
                Helper::error('添加評論失敗', 500);
            }

            Helper::success('評論添加成功', ['comment_id' => $comment_id]);

        } catch (Exception $e) {
            Helper::error('添加評論失敗: ' . $e->getMessage(), 500);
        }
    }
}

// 路由處理
$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'list';
$event_id = $_GET['id'] ?? null;

$data = ($method === 'POST' || $method === 'PUT')
    ? (Helper::getJsonInput() ?? $_POST)
    : [];

if ($method === 'GET') {
    if ($action === 'list') {
        EventAPI::getEvents();
    } elseif ($action === 'detail' && $event_id) {
        EventAPI::getEventDetail($event_id);
    } elseif ($action === 'check_registration') {
        EventAPI::checkRegistrationStatus();
    } elseif ($action === 'participants') {
        EventAPI::getParticipants();
    } elseif ($action === 'comments') {
        EventAPI::getComments();
    } elseif ($action === 'my_events') {
        EventAPI::getMyEvents();
    }
}

if ($method === 'POST') {
    if ($action === 'create') {
        EventAPI::createEvent($data);
    } elseif ($action === 'register') {
        EventAPI::registerEvent($data['event_id'] ?? null);
    } elseif ($action === 'unregister') {
        EventAPI::cancelRegistration($data['event_id'] ?? null);
    } elseif ($action === 'add_comment') {
        EventAPI::addComment($data);
    }
}

if ($method === 'PUT') {
    if ($action === 'update' && $event_id) {
        EventAPI::updateEvent($event_id, $data);
    }
}

Helper::error('無效的請求', 400);
