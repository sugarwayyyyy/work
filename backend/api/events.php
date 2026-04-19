<?php
/**
 * 活動 API 端點
 */

require_once '../auth.php';
require_once '../content_filter.php';

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: http://localhost:8000');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    exit(0);
}

class EventAPI {

    private static function ensureEventCommentsTable() {
        static $checked = false;
        if ($checked) {
            return;
        }

        $sql = 'CREATE TABLE IF NOT EXISTS event_comments (
            comment_id INT PRIMARY KEY AUTO_INCREMENT,
            event_id INT NOT NULL,
            user_id INT NOT NULL,
            rating INT NOT NULL,
            comment TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            UNIQUE KEY unique_event_user_comment (event_id, user_id)
        )';

        $stmt = Database::getInstance()->prepare($sql);
        if ($stmt === false) {
            Helper::error('評論功能初始化失敗，請稍後再試', 500);
        }

        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) {
            Helper::error('評論功能初始化失敗，請稍後再試', 500);
        }

        $checked = true;
    }

    private static function sanitizeCollaborativeClubIds($rawIds, $ownerClubId) {
        $ids = array_values(array_unique(array_filter(array_map('intval', (array)$rawIds), function ($id) use ($ownerClubId) {
            return $id > 0 && $id !== (int)$ownerClubId;
        })));

        if (empty($ids)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $rows = Database::getInstance()->fetchAll(
            'SELECT club_id FROM clubs WHERE club_id IN (' . $placeholders . ') AND activity_status = "active" AND deleted_at IS NULL',
            $ids
        );
        $valid = array_map(function ($row) {
            return (int)($row['club_id'] ?? 0);
        }, $rows);

        return array_values(array_filter($ids, function ($id) use ($valid) {
            return in_array((int)$id, $valid, true);
        }));
    }

    private static function replaceCollaborativeClubs($eventId, $ownerClubId, $collaborativeClubIds) {
        $stmt = Database::getInstance()->prepare('DELETE FROM collaborative_events WHERE event_id = ?');
        if ($stmt !== false) {
            $stmt->bind_param('i', $eventId);
            $stmt->execute();
            $stmt->close();
        }

        $validIds = self::sanitizeCollaborativeClubIds($collaborativeClubIds, $ownerClubId);
        foreach ($validIds as $clubId) {
            dbInsert('collaborative_events', [
                'event_id' => $eventId,
                'created_by_club_id' => $ownerClubId,
                'participated_club_id' => $clubId,
                'status' => 'approved',
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }

    private static function requireEventManagePermission($event_id) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        $event = Database::getInstance()->fetchOne(
            'SELECT event_id, club_id, event_name, event_status FROM events WHERE event_id = ?',
            [$event_id]
        );
        if (!$event) {
            Helper::error('活動不存在', 404);
        }

        if (Auth::isAdmin()) {
            return $event;
        }

        $member = Database::getInstance()->fetchOne(
            'SELECT member_id FROM club_members WHERE club_id = ? AND user_id = ? AND role IN ("president", "vice_president", "director", "public_relations", "treasurer") AND is_active = 1',
            [$event['club_id'], Auth::getCurrentUserId()]
        );
        if (!$member) {
            Helper::error('您無權限操作此活動', 403);
        }

        return $event;
    }

    private static function normalizeDatetimeInput($value, $endOfDay = false) {
        $raw = trim((string)$value);
        if ($raw === '') {
            return null;
        }

        $normalized = str_replace('T', ' ', $raw);
        if (strlen($raw) <= 10) {
            $normalized .= $endOfDay ? ' 23:59:59' : ' 00:00:00';
        } elseif (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $normalized)) {
            $normalized .= ':00';
        }

        return $normalized;
    }

    private static function isHalfHourAligned($value) {
        $raw = trim((string)$value);
        if ($raw === '') {
            return false;
        }

        $timestamp = strtotime(str_replace('T', ' ', $raw));
        if ($timestamp === false) {
            return false;
        }

        return (int)date('i', $timestamp) % 30 === 0 && date('s', $timestamp) === '00';
    }

    private static function validateHalfHourField($value, $message, $required = false) {
        $raw = trim((string)$value);
        if ($raw === '') {
            if ($required) {
                Helper::error($message, 400);
            }
            return;
        }

        if (!self::isHalfHourAligned($raw)) {
            Helper::error($message, 400);
        }
    }

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
            $filter = strtolower($_GET['filter'] ?? 'open');
            $event_start_from = $_GET['event_start_from'] ?? ($_GET['date_from'] ?? null);
            $deadline_to = $_GET['deadline_to'] ?? ($_GET['date_to'] ?? null);
            $min_remaining = isset($_GET['min_remaining']) && $_GET['min_remaining'] !== ''
                ? (int)$_GET['min_remaining']
                : null;
            $min_fee = $_GET['min_fee'] ?? null;
            $max_fee = $_GET['max_fee'] ?? null;
            $page = (int)($_GET['page'] ?? 1);
            $per_page = ITEMS_PER_PAGE;
            $offset = ($page - 1) * $per_page;
            
            $conditions = ["event_status = ?"];
            $params = [$status];
            
            if ($club_id) {
                $conditions[] = '(club_id = ? OR event_id IN (
                    SELECT ce.event_id
                    FROM collaborative_events ce
                    WHERE ce.participated_club_id = ? AND ce.status = "approved"
                ))';
                $params[] = $club_id;
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

            if ($event_start_from) {
                self::validateHalfHourField($event_start_from, '開始時間只能選整點或半點', true);
                $conditions[] = 'event_date >= ?';
                $params[] = self::normalizeDatetimeInput($event_start_from, false);
            }

            if ($deadline_to) {
                self::validateHalfHourField($deadline_to, '截止時間只能選整點或半點', true);
                $conditions[] = 'registration_deadline <= ?';
                $params[] = self::normalizeDatetimeInput($deadline_to, true);
            }

            if ($min_remaining !== null) {
                $conditions[] = "(capacity = 0 OR (capacity - (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = events.event_id)) >= ?)";
                $params[] = $min_remaining;
            }

            if ($filter === 'open') {
                $conditions[] = '(is_registration_open = 1 AND (registration_deadline IS NULL OR registration_deadline >= NOW()) AND event_date >= NOW())';
            } elseif ($filter === 'closed') {
                $conditions[] = '(is_registration_open = 0 OR (registration_deadline IS NOT NULL AND registration_deadline < NOW()) OR event_date < NOW())';
            }

            if ($min_fee !== null) {
                $conditions[] = 'fee >= ?';
                $params[] = $min_fee;
            }

            if ($max_fee !== null) {
                $conditions[] = 'fee <= ?';
                $params[] = $max_fee;
            }

            $conditions[] = 'NOT EXISTS (
                SELECT 1 FROM reports rp
                WHERE rp.reported_content_type = "event"
                  AND rp.reported_content_id = events.event_id
                  AND rp.status = "resolved"
                  AND rp.action_taken = "force_hide"
            )';
            
            $where = implode(' AND ', $conditions);

            $orderParts = [];
            $orderParams = [];
            if ($event_start_from) {
                $orderParts[] = 'ABS(TIMESTAMPDIFF(SECOND, event_date, ?)) ASC';
                $orderParams[] = str_replace('T', ' ', $event_start_from) . (strlen($event_start_from) <= 10 ? ' 00:00:00' : ':00');
            }

            if ($deadline_to) {
                $orderParts[] = 'ABS(TIMESTAMPDIFF(SECOND, COALESCE(registration_deadline, event_date), ?)) ASC';
                $orderParams[] = str_replace('T', ' ', $deadline_to) . (strlen($deadline_to) <= 10 ? ' 23:59:59' : ':59');
            }

            $orderParts[] = $filter === 'closed' ? 'event_date DESC' : 'event_date ASC';

            $sql = "SELECT * FROM events WHERE $where ORDER BY " . implode(', ', $orderParts) . " LIMIT ? OFFSET ?";
            $stmt = Database::getInstance()->prepare($sql);
            if ($stmt === false) {
                throw new Exception('查詢準備失敗: ' . Database::getInstance()->error);
            }

            $queryParams = array_merge($params, $orderParams);
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

                $tags = Database::getInstance()->fetchAll(
                    'SELECT t.* FROM club_tags t
                     JOIN event_tag_relations etr ON t.tag_id = etr.tag_id
                     WHERE etr.event_id = ?
                     ORDER BY t.tag_name ASC',
                    [$event['event_id']]
                );
                $event['tags'] = $tags;

                $coHosts = Database::getInstance()->fetchAll(
                    'SELECT c.club_id, c.club_name
                     FROM collaborative_events ce
                     JOIN clubs c ON c.club_id = ce.participated_club_id
                     WHERE ce.event_id = ? AND ce.status = "approved"
                     ORDER BY c.club_name ASC',
                    [$event['event_id']]
                );
                $event['co_host_clubs'] = $coHosts;
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

            if (!Auth::isAdmin()) {
                $hiddenReport = Database::getInstance()->fetchOne(
                    'SELECT report_id FROM reports
                     WHERE reported_content_type = "event"
                       AND reported_content_id = ?
                       AND status = "resolved"
                       AND action_taken = "force_hide"
                     LIMIT 1',
                    [$event_id]
                );
                if ($hiddenReport) {
                    Helper::error('活動不存在', 404);
                }
            }
            
            // 取得社團信息
            $club = Database::getInstance()->fetchOne(
                'SELECT * FROM clubs WHERE club_id = ?',
                [$event['club_id']]
            );
            $event['club'] = $club;
            
            // 取得標籤
            $tags = Database::getInstance()->fetchAll(
                'SELECT t.* FROM club_tags t
                 JOIN event_tag_relations etr ON t.tag_id = etr.tag_id
                 WHERE etr.event_id = ?',
                [$event_id]
            );
            $event['tags'] = $tags;

            $coHosts = Database::getInstance()->fetchAll(
                'SELECT c.club_id, c.club_name
                 FROM collaborative_events ce
                 JOIN clubs c ON c.club_id = ce.participated_club_id
                 WHERE ce.event_id = ? AND ce.status = "approved"
                 ORDER BY c.club_name ASC',
                [$event_id]
            );
            $event['co_host_clubs'] = $coHosts;
            
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

            if (ContentFilter::hasRestrictedInFields($data, ['event_name', 'description', 'location'])) {
                Helper::error('活動內容包含不適當字眼，請修改後再送出', 400);
            }
            
            self::validateHalfHourField($data['event_date'] ?? '', '舉辦日期與時間只能選整點或半點', true);
            self::validateHalfHourField($data['registration_deadline'] ?? '', '報名截止只能選整點或半點', false);
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

            // 保存活動標籤
            $tag_ids = isset($data['tag_ids']) ? array_filter(array_map('intval', (array)$data['tag_ids'])) : [];
            foreach ($tag_ids as $tag_id) {
                dbInsert('event_tag_relations', [
                    'event_id' => $event_id,
                    'tag_id' => $tag_id
                ]);
            }

            self::replaceCollaborativeClubs(
                (int)$event_id,
                (int)$data['club_id'],
                $data['collaborative_club_ids'] ?? []
            );
            
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

            if (ContentFilter::hasRestrictedInFields($data, ['event_name', 'description', 'location'])) {
                Helper::error('活動內容包含不適當字眼，請修改後再送出', 400);
            }

            if (isset($data['event_date'])) {
                self::validateHalfHourField($data['event_date'], '日期只能選整點或半點', true);
            }

            if (isset($data['registration_deadline'])) {
                self::validateHalfHourField($data['registration_deadline'], '報名截止只能選整點或半點', false);
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

            // 更新活動標籤
            if (isset($data['tag_ids'])) {
                // 刪除舊標籤關聯
                Database::getInstance()->prepare(
                    'DELETE FROM event_tag_relations WHERE event_id = ?'
                )->bind_param('i', $event_id)->execute();

                // 新增新標籤關聯
                $tag_ids = array_filter(array_map('intval', (array)$data['tag_ids']));
                foreach ($tag_ids as $tag_id) {
                    dbInsert('event_tag_relations', [
                        'event_id' => $event_id,
                        'tag_id' => $tag_id
                    ]);
                }
            }

            if (isset($data['collaborative_club_ids'])) {
                self::replaceCollaborativeClubs(
                    (int)$event_id,
                    (int)$event['club_id'],
                    $data['collaborative_club_ids']
                );
            }

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

            if (strtotime((string)$event['event_date']) <= time()) {
                Helper::error('活動已結束，無法報名', 400);
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
                'SELECT event_id, event_date FROM events WHERE event_id = ?',
                [$event_id]
            );

            if (!$event) {
                Helper::error('活動不存在', 404);
            }

            if (strtotime((string)$event['event_date']) <= time()) {
                Helper::error('活動已結束，無法取消報名', 400);
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

        // 權限檢查：只有平台管理員和社團幹部可以查看
        $user_id = Auth::getCurrentUserId();
        if (!$user_id) {
            Helper::error('禁止訪問：請先登入', 403);
        }

        try {
            $user = Database::getInstance()->fetchOne(
                'SELECT role FROM users WHERE user_id = ?',
                [$user_id]
            );

            if (!$user) {
                Helper::error('禁止訪問', 403);
            }

            // 平台管理員可以查看所有參與者
            if ($user['role'] === 'platform_admin') {
                $participants = Database::getInstance()->fetchAll(
                    'SELECT u.name, u.student_id FROM event_registrations er
                     JOIN users u ON er.user_id = u.user_id
                     WHERE er.event_id = ? AND er.status = "approved"
                     ORDER BY er.registered_at ASC',
                    [$event_id]
                );

                Helper::success('取得參與者成功', ['participants' => $participants]);
                return;
            }

            // 社團幹部只能查看自己社團的活動參與者
            if ($user['role'] === 'club_admin') {
                // 檢查該用戶是否是該活動所屬社團的幹部
                $eventClub = Database::getInstance()->fetchOne(
                    'SELECT e.club_id FROM events e WHERE e.event_id = ?',
                    [$event_id]
                );

                if (!$eventClub) {
                    Helper::error('找不到該活動', 404);
                }

                $adminCheck = Database::getInstance()->fetchOne(
                    'SELECT 1 FROM club_members cm
                     WHERE cm.user_id = ? AND cm.club_id = ? AND cm.role IN ("president", "vice_president", "director", "public_relations", "treasurer") AND cm.is_active = 1',
                    [$user_id, $eventClub['club_id']]
                );

                if (!$adminCheck) {
                    Helper::error('禁止訪問：您無權查看該社團的參與者列表', 403);
                }

                $participants = Database::getInstance()->fetchAll(
                    'SELECT u.name, u.student_id FROM event_registrations er
                     JOIN users u ON er.user_id = u.user_id
                     WHERE er.event_id = ? AND er.status = "approved"
                     ORDER BY er.registered_at ASC',
                    [$event_id]
                );

                Helper::success('取得參與者成功', ['participants' => $participants]);
                return;
            }

            // 其他用戶（普通學生）無權訪問
            Helper::error('禁止訪問：只有社團幹部和平台管理員可以查看參與者列表', 403);

        } catch (Exception $e) {
            Helper::error('取得參與者失敗: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 取得活動評論
     * GET /api/events.php?action=comments&event_id=1
     */
    public static function getComments() {
        self::ensureEventCommentsTable();

        $event_id = $_GET['event_id'] ?? null;
        if (!$event_id) {
            Helper::error('缺少活動ID', 400);
        }

        try {
            $comments = Database::getInstance()->fetchAll(
                'SELECT ec.*, u.name as user_name, u.name as author_name FROM event_comments ec
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

        self::ensureEventCommentsTable();

        try {
            $errors = Helper::validateRequired($data, ['event_id', 'rating', 'comment']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }

            $event = Database::getInstance()->fetchOne(
                'SELECT event_id, event_date FROM events WHERE event_id = ?',
                [$data['event_id']]
            );

            if (!$event) {
                Helper::error('活動不存在', 404);
            }

            if (strtotime((string)$event['event_date']) >= time()) {
                Helper::error('活動尚未結束，需參與完成後才能評論', 403);
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

            if (ContentFilter::hasRestrictedInFields($data, ['comment'])) {
                Helper::error('評論內容包含不適當字眼，請修改後再送出', 400);
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

    /**
     * 更新活動標籤
     * POST /api/events.php?action=update_event_tags
     * Body: { event_id, tag_ids: [1, 2, 3] }
     */
    public static function updateEventTags($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        $event_id = (int)($data['event_id'] ?? 0);
        $tag_ids = (array)($data['tag_ids'] ?? []);

        if (!$event_id) {
            Helper::error('活動 ID 不能為空', 400);
        }

        try {
            // 取得活動資料以驗證權限
            $event = Database::getInstance()->fetchOne(
                'SELECT * FROM events WHERE event_id = ?',
                [$event_id]
            );

            if (!$event) {
                Helper::error('活動不存在', 404);
            }

            // 驗證權限：檢查用戶是否為該社團的幹部
            $member = Database::getInstance()->fetchOne(
                'SELECT member_id FROM club_members WHERE club_id = ? AND user_id = ? AND role IN ("president", "vice_president", "director", "public_relations")',
                [$event['club_id'], Auth::getCurrentUserId()]
            );

            if (!$member && !Auth::isAdmin()) {
                Helper::error('您沒有權限修改此活動的標籤', 403);
            }

            // 刪除舊標籤關聯
            $stmt = Database::getInstance()->prepare('DELETE FROM event_tag_relations WHERE event_id = ?');
            if ($stmt === false) {
                throw new Exception('刪除舊活動標籤關聯準備失敗: ' . Database::getInstance()->error);
            }
            $stmt->bind_param('i', $event_id);
            $stmt->execute();
            $stmt->close();

            // 新增新標籤關聯
            $tag_ids = array_filter(array_map('intval', $tag_ids));
            foreach ($tag_ids as $tag_id) {
                dbInsert('event_tag_relations', [
                    'event_id' => $event_id,
                    'tag_id' => $tag_id
                ]);
            }

            Helper::success('活動標籤更新成功');
        } catch (Exception $e) {
            Helper::error('更新活動標籤失敗: ' . $e->getMessage(), 500);
        }
    }

    public static function archiveEvent($event_id, $archive = true) {
        try {
            $event = self::requireEventManagePermission($event_id);
            $nextStatus = $archive ? 'archived' : 'published';

            dbUpdate('events', [
                'event_status' => $nextStatus,
                'updated_at' => date('Y-m-d H:i:s')
            ], 'event_id = ?', [$event_id]);

            $logMessage = $archive
                ? ('將活動設為歷史紀錄: ' . ($event['event_name'] ?? ''))
                : ('還原歷史活動: ' . ($event['event_name'] ?? ''));

            dbInsert('activity_logs', [
                'club_id' => $event['club_id'],
                'activity_type' => 'event',
                'triggered_by' => Auth::getCurrentUserId(),
                'description' => $logMessage
            ]);

            Helper::success($archive ? '活動已歸檔' : '活動已還原');
        } catch (Exception $e) {
            Helper::error('更新活動狀態失敗: ' . $e->getMessage(), 500);
        }
    }

    public static function exportRegistrationsCsv($event_id) {
        try {
            $event = self::requireEventManagePermission($event_id);

            $rows = Database::getInstance()->fetchAll(
                'SELECT u.name, u.student_id, u.email, u.phone, er.registered_at, er.status
                 FROM event_registrations er
                 JOIN users u ON u.user_id = er.user_id
                 WHERE er.event_id = ?
                 ORDER BY er.registered_at ASC',
                [$event_id]
            );

            $safeEventName = preg_replace('/[^A-Za-z0-9_\-\x{4e00}-\x{9fa5}]/u', '_', (string)($event['event_name'] ?? 'event'));
            if ($safeEventName === null || $safeEventName === '') {
                $safeEventName = 'event';
            }

            header('Content-Type: text/csv; charset=UTF-8');
            header('Content-Disposition: attachment; filename="registrations_' . $safeEventName . '_' . date('Ymd_His') . '.csv"');

            $out = fopen('php://output', 'w');
            if ($out === false) {
                Helper::error('無法輸出 CSV', 500);
            }

            // UTF-8 BOM for Excel compatibility.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['姓名', '學號', 'Email', '電話', '報名時間', '狀態']);

            foreach ($rows as $row) {
                fputcsv($out, [
                    $row['name'] ?? '',
                    $row['student_id'] ?? '',
                    $row['email'] ?? '',
                    $row['phone'] ?? '',
                    $row['registered_at'] ?? '',
                    $row['status'] ?? ''
                ]);
            }

            fclose($out);
            exit;
        } catch (Exception $e) {
            Helper::error('匯出報名名單失敗: ' . $e->getMessage(), 500);
        }
    }

    public static function exportParticipationProofSvg() {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        $user = Auth::getCurrentUser();
        if (!$user) {
            Helper::error('找不到用戶資料', 404);
        }

        $events = Database::getInstance()->fetchAll(
            'SELECT e.event_name, e.event_date, c.club_name
             FROM event_registrations er
             JOIN events e ON e.event_id = er.event_id
             JOIN clubs c ON c.club_id = e.club_id
             WHERE er.user_id = ? AND er.status = "approved"
             ORDER BY e.event_date DESC
             LIMIT 12',
            [Auth::getCurrentUserId()]
        );

        $roles = Database::getInstance()->fetchAll(
            'SELECT c.club_name, cm.role
             FROM club_members cm
             JOIN clubs c ON c.club_id = cm.club_id
             WHERE cm.user_id = ?
               AND cm.is_active = 1
               AND cm.role IN ("president", "vice_president", "public_relations", "treasurer", "director")
             ORDER BY c.club_name ASC
             LIMIT 8',
            [Auth::getCurrentUserId()]
        );

        $safeName = htmlspecialchars((string)($user['name'] ?? ''), ENT_QUOTES, 'UTF-8');
        $safeStudentId = htmlspecialchars((string)($user['student_id'] ?? ''), ENT_QUOTES, 'UTF-8');
        $issuedAt = date('Y-m-d H:i:s');

        $lines = [];
        $lines[] = '<text x="50" y="92" font-size="26" font-weight="700" fill="#0f172a">社團參與證明</text>';
        $lines[] = '<text x="50" y="130" font-size="16" fill="#334155">姓名：' . $safeName . '</text>';
        $lines[] = '<text x="50" y="156" font-size="16" fill="#334155">學號：' . $safeStudentId . '</text>';
        $lines[] = '<text x="50" y="182" font-size="14" fill="#64748b">簽發時間：' . $issuedAt . '</text>';
        $lines[] = '<text x="50" y="220" font-size="16" font-weight="600" fill="#0f172a">活動參與紀錄</text>';

        $y = 246;
        if (empty($events)) {
            $lines[] = '<text x="66" y="' . $y . '" font-size="14" fill="#475569">- 目前沒有活動參與紀錄</text>';
            $y += 24;
        } else {
            foreach ($events as $idx => $event) {
                $name = htmlspecialchars((string)($event['event_name'] ?? '-'), ENT_QUOTES, 'UTF-8');
                $club = htmlspecialchars((string)($event['club_name'] ?? '-'), ENT_QUOTES, 'UTF-8');
                $date = htmlspecialchars((string)($event['event_date'] ?? '-'), ENT_QUOTES, 'UTF-8');
                $text = sprintf('%d. %s｜%s｜%s', $idx + 1, $name, $club, $date);
                $lines[] = '<text x="66" y="' . $y . '" font-size="13" fill="#334155">' . $text . '</text>';
                $y += 22;
            }
        }

        $y += 10;
        $lines[] = '<text x="50" y="' . $y . '" font-size="16" font-weight="600" fill="#0f172a">幹部任職紀錄</text>';
        $y += 24;

        if (empty($roles)) {
            $lines[] = '<text x="66" y="' . $y . '" font-size="14" fill="#475569">- 目前沒有幹部任職紀錄</text>';
            $y += 24;
        } else {
            foreach ($roles as $idx => $role) {
                $club = htmlspecialchars((string)($role['club_name'] ?? '-'), ENT_QUOTES, 'UTF-8');
                $roleName = htmlspecialchars((string)($role['role'] ?? '-'), ENT_QUOTES, 'UTF-8');
                $text = sprintf('%d. %s｜職務：%s', $idx + 1, $club, $roleName);
                $lines[] = '<text x="66" y="' . $y . '" font-size="13" fill="#334155">' . $text . '</text>';
                $y += 22;
            }
        }

        $svgHeight = max(520, $y + 40);
        $svg = '<?xml version="1.0" encoding="UTF-8"?>'
            . '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="' . $svgHeight . '" viewBox="0 0 960 ' . $svgHeight . '">'
            . '<rect x="0" y="0" width="960" height="' . $svgHeight . '" fill="#f8fafc"/>'
            . '<rect x="24" y="24" width="912" height="' . ($svgHeight - 48) . '" rx="16" fill="#ffffff" stroke="#cbd5e1"/>'
            . implode('', $lines)
            . '</svg>';

        header('Content-Type: image/svg+xml; charset=UTF-8');
        header('Content-Disposition: attachment; filename="participation_proof_' . Auth::getCurrentUserId() . '_' . date('Ymd_His') . '.svg"');
        echo $svg;
        exit;
    }
}

// 路由處理
$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'list';
$event_id = $_GET['id'] ?? null;

$data = ($method === 'POST' || $method === 'PUT')
    ? Helper::getRequestInput()
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
    } elseif ($action === 'export_registrations' && $event_id) {
        EventAPI::exportRegistrationsCsv($event_id);
    } elseif ($action === 'participation_proof') {
        EventAPI::exportParticipationProofSvg();
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
    } elseif ($action === 'update_event_tags') {
        EventAPI::updateEventTags($data);
    }
}

if ($method === 'PUT') {
    if ($action === 'update' && $event_id) {
        EventAPI::updateEvent($event_id, $data);
    } elseif ($action === 'archive' && $event_id) {
        EventAPI::archiveEvent($event_id, true);
    } elseif ($action === 'restore' && $event_id) {
        EventAPI::archiveEvent($event_id, false);
    }
}

Helper::error('無效的請求', 400);
