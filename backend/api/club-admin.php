<?php
/**
 * 社團幹部 API
 */

require_once '../auth.php';
require_once '../content_filter.php';

// Handle CORS preflight requests
Helper::handleCorsPreFlight();

class ClubAdminAPI {
    public static function requireClubAdmin() {
        if (!Auth::isClubAdmin()) {
            Helper::error('您無權限執行此操作', 403);
        }
        // Release PHP session file lock after auth check; remaining work is read-only DB queries.
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
    }

    // 寫入幹部操作紀錄（稽核 Log）。失敗時僅記錄錯誤，不中斷主流程。
    private static function logOp($club_id, $action, $target_user_id = null, $detail = null) {
        try {
            $actorId = (int)Auth::getCurrentUserId();
            $actorRole = null;
            if ($actorId > 0 && (int)$club_id > 0) {
                $row = Database::getInstance()->fetchOne(
                    'SELECT role FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1 LIMIT 1',
                    [(int)$club_id, $actorId]
                );
                $actorRole = $row['role'] ?? (Auth::isAdmin() ? 'platform_admin' : null);
            }
            dbInsert('club_operation_logs', [
                'club_id'        => (int)$club_id,
                'actor_user_id'  => $actorId,
                'actor_role'     => $actorRole,
                'action'         => $action,
                'target_user_id' => $target_user_id !== null ? (int)$target_user_id : null,
                'detail'         => $detail,
                'created_at'     => date('Y-m-d H:i:s'),
            ]);
        } catch (Throwable $e) {
            Helper::logError('club_operation_logs 寫入失敗: ' . $e->getMessage());
        }
    }

    public static function getMyClubs() {
        self::requireClubAdmin();

        $user_id = Auth::getCurrentUserId();
        $clubs = Database::getInstance()->fetchAll(
            'SELECT c.club_id, c.club_name, c.activity_status FROM clubs c '
            . 'JOIN club_members cm ON c.club_id = cm.club_id '
            . 'WHERE cm.user_id = ? AND cm.is_active = 1 AND cm.role IN ("president", "vice_president", "public_relations", "treasurer", "director")',
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
                'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1 AND role IN ("president", "vice_president", "public_relations", "treasurer", "director")',
                [$club_id, Auth::getCurrentUserId()]
            );
            if (!$isMember) {
                Helper::error('您無權限檢視此社團', 403);
            }
        }

        $events = Database::getInstance()->fetchAll(
            'SELECT e.*, (
                SELECT COUNT(*)
                FROM event_registrations er
                WHERE er.event_id = e.event_id AND er.status = "approved"
             ) AS registered_count,
             (
                SELECT a.status FROM event_venue_applications a
                WHERE a.event_id = e.event_id ORDER BY a.application_id DESC LIMIT 1
             ) AS venue_status,
             (
                SELECT a.review_comment FROM event_venue_applications a
                WHERE a.event_id = e.event_id ORDER BY a.application_id DESC LIMIT 1
             ) AS venue_comment,
             (
                SELECT a.application_id FROM event_venue_applications a
                WHERE a.event_id = e.event_id ORDER BY a.application_id DESC LIMIT 1
             ) AS venue_application_id
             FROM events e
             WHERE (
                e.club_id = ?
                OR e.event_id IN (
                    SELECT ce.event_id
                    FROM collaborative_events ce
                    WHERE ce.participated_club_id = ? AND ce.status = "approved"
                )
             )
             ORDER BY e.event_date DESC',
            [$club_id, $club_id]
        );

        foreach ($events as &$event) {
            $event['co_host_clubs'] = Database::getInstance()->fetchAll(
                'SELECT c.club_id, c.club_name
                 FROM collaborative_events ce
                 JOIN clubs c ON c.club_id = ce.participated_club_id
                 WHERE ce.event_id = ? AND ce.status = "approved"
                 ORDER BY c.club_name ASC',
                [$event['event_id']]
            );
        }
        unset($event);

        Helper::success('取得社團活動成功', ['events' => $events]);
    }

    public static function createClubEvent($data) {
        self::requireClubAdmin();

        $errors = Helper::validateRequired($data, ['club_id', 'event_name', 'event_date', 'location']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        if (ContentFilter::hasRestrictedInFields($data, ['event_name', 'description'])) {
            Helper::error('活動內容包含不適當字眼，請修改後再送出', 400);
        }
        ContentFilter::validateLocationOrError($data['location'] ?? '');

        $club_id = (int)$data['club_id'];
        $isMember = Database::getInstance()->fetchOne(
            'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1 AND role IN ("president", "vice_president", "public_relations", "treasurer", "director")',
            [$club_id, Auth::getCurrentUserId()]
        );
        if (!$isMember) {
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

        $errors = Helper::validateRequired($data, ['club_id', 'reason']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
        if (empty($data['target_user_email']) && empty($data['target_user_id'])) {
            Helper::error('驗證失敗: target_user_email', 400);
        }

        $club_id = (int)$data['club_id'];
        $requester_user_id = (int)Auth::getCurrentUserId();
        $reason = trim($data['reason']);
        $handover_note = trim($data['handover_note'] ?? '');
        $target_user_id = 0;
        $target_user_email = '';

        if (ContentFilter::hasRestrictedInFields($data, ['reason', 'handover_note'])) {
            Helper::error('轉讓申請內容包含不適當字眼，請修改後再送出', 400);
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

        if (!empty($data['target_user_email'])) {
            $target_user_email = strtolower(trim((string)$data['target_user_email']));
            if (!filter_var($target_user_email, FILTER_VALIDATE_EMAIL)) {
                Helper::error('目標 Email 格式不正確', 400);
            }
            $targetUser = Database::getInstance()->fetchOne(
                'SELECT user_id, name, student_id, is_active, email, role FROM users WHERE LOWER(email) = ? LIMIT 1',
                [$target_user_email]
            );
        } else {
            $target_user_id = (int)$data['target_user_id'];
            $targetUser = Database::getInstance()->fetchOne(
                'SELECT user_id, name, student_id, is_active, email, role FROM users WHERE user_id = ?',
                [$target_user_id]
            );
        }

        if (!$targetUser || (int)$targetUser['is_active'] !== 1) {
            Helper::error('目標帳戶不存在或未啟用', 400);
        }
        if (($targetUser['role'] ?? '') === 'platform_admin') {
            Helper::error('平台管理員不能成為社團管理員', 403);
        }
        $target_user_id = (int)$targetUser['user_id'];

        if ($requester_user_id === $target_user_id) {
            Helper::error('轉讓對象不可為本人', 400);
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

        $admins = Database::getInstance()->fetchAll(
            "SELECT user_id FROM users WHERE role = 'platform_admin' AND is_active = 1"
        );
        foreach ($admins as $admin) {
            dbInsert('notifications', [
                'user_id'           => $admin['user_id'],
                'title'             => '新帳戶轉讓申請',
                'message'           => '有新的社團帳戶轉讓申請待審核，請前往管理員後台處理。',
                'notification_type' => 'system',
                'is_read'           => 0,
                'created_at'        => date('Y-m-d H:i:s')
            ]);
        }

        Helper::success('轉讓申請已送出，待管理員審核', ['request_id' => $requestId]);
    }

    public static function getClubStats($club_id) {
        self::requireClubAdmin();

        $club_id = (int)$club_id;
        if (!$club_id) {
            Helper::error('缺少社團 ID', 400);
        }

        if (!Auth::isAdmin()) {
            $isMember = Database::getInstance()->fetchOne(
                'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1 AND role IN ("president", "vice_president", "public_relations", "treasurer", "director")',
                [$club_id, Auth::getCurrentUserId()]
            );
            if (!$isMember) {
                Helper::error('您無權限查看此社團統計', 403);
            }
        }

        $db = Database::getInstance();

        $followers       = $db->fetchOne('SELECT COUNT(*) AS cnt FROM club_followers WHERE club_id = ?', [$club_id]);
        $totalEvents     = $db->fetchOne('SELECT COUNT(*) AS cnt FROM events WHERE club_id = ?', [$club_id]);
        $upcomingEvents  = $db->fetchOne('SELECT COUNT(*) AS cnt FROM events WHERE club_id = ? AND event_date >= NOW() AND event_status IN ("published", "ongoing")', [$club_id]);
        $publishedEvents = $db->fetchOne('SELECT COUNT(*) AS cnt FROM events WHERE club_id = ? AND event_status = "published"', [$club_id]);
        $cancelledEvents = $db->fetchOne('SELECT COUNT(*) AS cnt FROM events WHERE club_id = ? AND event_status = "cancelled"', [$club_id]);
        $totalRegs       = $db->fetchOne('SELECT COUNT(*) AS cnt FROM event_registrations er JOIN events e ON er.event_id = e.event_id WHERE e.club_id = ?', [$club_id]);
        $rating          = $db->fetchOne('SELECT ROUND(AVG(rating), 1) AS avg FROM reviews WHERE club_id = ? AND review_status = "approved"', [$club_id]);
        $unansweredQA    = $db->fetchOne('SELECT COUNT(*) AS cnt FROM q_and_a qa WHERE qa.club_id = ? AND qa.status = "open" AND NOT EXISTS (SELECT 1 FROM qa_replies qr WHERE qr.qa_id = qa.qa_id)', [$club_id]);

        Helper::success('取得社團統計成功', [
            'follower_count'    => (int)($followers['cnt']       ?? 0),
            'total_events'      => (int)($totalEvents['cnt']     ?? 0),
            'upcoming_events'   => (int)($upcomingEvents['cnt']  ?? 0),
            'published_events'  => (int)($publishedEvents['cnt'] ?? 0),
            'cancelled_events'  => (int)($cancelledEvents['cnt'] ?? 0),
            'total_registrations' => (int)($totalRegs['cnt']     ?? 0),
            'average_rating'    => isset($rating['avg']) && $rating['avg'] !== null ? (float)$rating['avg'] : null,
            'unanswered_qa'     => (int)($unansweredQA['cnt']    ?? 0),
        ]);
    }

    public static function getClubMembers($club_id) {
        self::requireClubAdmin();

        $club_id = (int)$club_id;
        if (!$club_id) {
            Helper::error('缺少社團 ID', 400);
        }

        $callerId = Auth::getCurrentUserId();
        $myRole = null;

        if (!Auth::isAdmin()) {
            $myMembership = Database::getInstance()->fetchOne(
                'SELECT role FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1
                 AND role IN ("president","vice_president","public_relations","treasurer","director")',
                [$club_id, $callerId]
            );
            if (!$myMembership) {
                Helper::error('您無權限查看此社團成員', 403);
            }
            $myRole = $myMembership['role'];
        } else {
            $row = Database::getInstance()->fetchOne(
                'SELECT role FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1',
                [$club_id, $callerId]
            );
            $myRole = $row ? $row['role'] : 'platform_admin';
        }

        $members = Database::getInstance()->fetchAll(
            'SELECT cm.user_id, cm.role, cm.fee_type, cm.fee_paid, u.name, u.student_id
             FROM club_members cm
             JOIN users u ON cm.user_id = u.user_id
             WHERE cm.club_id = ? AND cm.is_active = 1
             ORDER BY FIELD(cm.role,"president","vice_president","public_relations","treasurer","director","member","advisor"),
                      u.name',
            [$club_id]
        );

        $clubFees = Database::getInstance()->fetchOne(
            'SELECT club_fee, club_fee_semester, club_fee_per_session FROM clubs WHERE club_id = ?',
            [$club_id]
        );

        Helper::success('取得社團成員成功', [
            'members' => $members,
            'my_role' => $myRole,
            'club_fees' => [
                'onetime'  => (int)($clubFees['club_fee']              ?? 0),
                'semester' => (int)($clubFees['club_fee_semester']     ?? 0),
                'session'  => (int)($clubFees['club_fee_per_session']  ?? 0),
            ],
        ]);
    }

    public static function updateMemberRole($data) {
        self::requireClubAdmin();

        $errors = Helper::validateRequired($data, ['club_id', 'target_user_id', 'role']);
        if (!empty($errors)) {
            Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
        }

        $club_id       = (int)$data['club_id'];
        $targetUserId  = (int)$data['target_user_id'];
        $newRole       = (string)$data['role'];
        $callerId      = (int)Auth::getCurrentUserId();

        $allowedRoles = ['vice_president', 'public_relations', 'treasurer', 'director', 'member'];
        if (!in_array($newRole, $allowedRoles, true)) {
            Helper::error('不允許指派此角色', 400);
        }

        if ($targetUserId === $callerId) {
            Helper::error('不能修改自己的角色', 400);
        }

        // 呼叫者必須是該社團的社長
        $isPresident = Database::getInstance()->fetchOne(
            'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? AND role = "president" AND is_active = 1',
            [$club_id, $callerId]
        );
        if (!$isPresident && !Auth::isAdmin()) {
            Helper::error('只有社長才能指派角色', 403);
        }

        // target 必須是該社團的 is_active 成員
        $targetMember = Database::getInstance()->fetchOne(
            'SELECT role FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1',
            [$club_id, $targetUserId]
        );
        if (!$targetMember) {
            Helper::error('找不到此社團成員', 404);
        }

        // 不能變更另一位社長的角色
        if ($targetMember['role'] === 'president') {
            Helper::error('社長職位轉讓請透過帳戶轉讓流程處理', 403);
        }

        // 獨占職稱：同社團不可有兩人擔任同一職稱
        $exclusiveRoles = ['vice_president', 'public_relations', 'treasurer', 'director'];
        if (in_array($newRole, $exclusiveRoles, true)) {
            $existing = Database::getInstance()->fetchOne(
                'SELECT user_id FROM club_members WHERE club_id = ? AND role = ? AND is_active = 1 AND user_id != ?',
                [$club_id, $newRole, $targetUserId]
            );
            if ($existing) {
                $roleNames = [
                    'vice_president' => '副社長', 'public_relations' => '公關',
                    'treasurer' => '總務', 'director' => '幹事',
                ];
                Helper::error('此社團已有人擔任「' . ($roleNames[$newRole] ?? $newRole) . '」，請先變更該成員的職稱', 409);
            }
        }

        Database::getInstance()->update(
            'club_members',
            ['role' => $newRole],
            'club_id = ? AND user_id = ?',
            [$club_id, $targetUserId]
        );

        // 同步 target 的全域 role
        $officerRoles = '"president","vice_president","public_relations","treasurer","director"';
        $stillOfficer = Database::getInstance()->fetchOne(
            "SELECT 1 FROM club_members WHERE user_id = ? AND is_active = 1 AND role IN ($officerRoles)",
            [$targetUserId]
        );
        $globalRole = $stillOfficer ? 'club_admin' : 'student';
        Database::getInstance()->update(
            'users',
            ['role' => $globalRole],
            'user_id = ? AND role != "platform_admin"',
            [$targetUserId]
        );

        self::logOp($club_id, 'assign_role', $targetUserId, $targetMember['role'] . ' → ' . $newRole);

        Helper::success('角色已更新');
    }

    public static function updateMemberFeeType($data) {
        self::requireClubAdmin();

        $errors = Helper::validateRequired($data, ['club_id', 'target_user_id', 'fee_type']);
        if (!empty($errors)) {
            Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
        }

        $club_id      = (int)$data['club_id'];
        $targetUserId = (int)$data['target_user_id'];
        $feeType      = (string)$data['fee_type'];

        if (!in_array($feeType, ['none', 'onetime', 'semester', 'session'], true)) {
            Helper::error('無效的費用類型', 400);
        }

        if (!Auth::isAdmin()) {
            $isOfficer = Database::getInstance()->fetchOne(
                'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1
                 AND role IN ("president","vice_president","public_relations","treasurer","director")',
                [$club_id, Auth::getCurrentUserId()]
            );
            if (!$isOfficer) {
                Helper::error('您無權限更新費用類型', 403);
            }
        }

        $target = Database::getInstance()->fetchOne(
            'SELECT member_id FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1',
            [$club_id, $targetUserId]
        );
        if (!$target) {
            Helper::error('找不到此社團成員', 404);
        }

        Database::getInstance()->update(
            'club_members',
            ['fee_type' => $feeType, 'fee_paid' => ($feeType !== 'none') ? 1 : 0],
            'member_id = ?',
            [$target['member_id']]
        );

        self::logOp($club_id, 'change_fee_type', $targetUserId, '費用類型改為 ' . $feeType);

        Helper::success('費用類型已更新');
    }

    public static function updateFeePaid($data) {
        self::requireClubAdmin();

        $errors = Helper::validateRequired($data, ['club_id', 'target_user_id', 'fee_paid']);
        if (!empty($errors)) {
            Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
        }

        $club_id      = (int)$data['club_id'];
        $targetUserId = (int)$data['target_user_id'];
        $feePaid      = $data['fee_paid'] ? 1 : 0;

        // 呼叫者必須是該社團的幹部
        if (!Auth::isAdmin()) {
            $isOfficer = Database::getInstance()->fetchOne(
                'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1
                 AND role IN ("president","vice_president","public_relations","treasurer","director")',
                [$club_id, Auth::getCurrentUserId()]
            );
            if (!$isOfficer) {
                Helper::error('您無權限更新繳費狀態', 403);
            }
        }

        $target = Database::getInstance()->fetchOne(
            'SELECT member_id FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1',
            [$club_id, $targetUserId]
        );
        if (!$target) {
            Helper::error('找不到此社團成員', 404);
        }

        Database::getInstance()->update(
            'club_members',
            ['fee_paid' => $feePaid],
            'member_id = ?',
            [$target['member_id']]
        );

        self::logOp($club_id, $feePaid ? 'confirm_fee' : 'unconfirm_fee', $targetUserId, $feePaid ? '確認已繳費' : '改為未繳費');

        Helper::success('繳費狀態已更新');
    }

    public static function removeMember($data) {
        self::requireClubAdmin();

        $errors = Helper::validateRequired($data, ['club_id', 'target_user_id']);
        if (!empty($errors)) {
            Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
        }

        $club_id      = (int)$data['club_id'];
        $targetUserId = (int)$data['target_user_id'];
        $callerId     = (int)Auth::getCurrentUserId();

        if ($targetUserId === $callerId) {
            Helper::error('不能移除自己', 400);
        }

        // 呼叫者必須是該社團的社長（平台管理員例外）
        if (!Auth::isAdmin()) {
            $isPresident = Database::getInstance()->fetchOne(
                'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? AND role = "president" AND is_active = 1',
                [$club_id, $callerId]
            );
            if (!$isPresident) {
                Helper::error('只有社長才能移除成員', 403);
            }
        }

        // target 必須是該社團的 is_active 成員
        $target = Database::getInstance()->fetchOne(
            'SELECT member_id, role FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1',
            [$club_id, $targetUserId]
        );
        if (!$target) {
            Helper::error('找不到此社團成員', 404);
        }

        if ($target['role'] === 'president') {
            Helper::error('無法移除社長，請透過帳戶轉讓流程處理', 403);
        }

        Database::getInstance()->update(
            'club_members',
            ['is_active' => 0],
            'member_id = ?',
            [$target['member_id']]
        );

        // 取消該使用者在此社團的 pending/approved 申請，避免被踢後仍顯示「前往驗證」
        Database::getInstance()->update(
            'club_join_applications',
            ['status' => 'cancelled'],
            'club_id = ? AND user_id = ? AND status IN ("pending","approved")',
            [$club_id, $targetUserId]
        );

        // 同步全域 role
        $officerRoles = '"president","vice_president","public_relations","treasurer","director"';
        $stillOfficer = Database::getInstance()->fetchOne(
            "SELECT 1 FROM club_members WHERE user_id = ? AND is_active = 1 AND role IN ($officerRoles)",
            [$targetUserId]
        );
        Database::getInstance()->update(
            'users',
            ['role' => $stillOfficer ? 'club_admin' : 'student'],
            'user_id = ? AND role != "platform_admin"',
            [$targetUserId]
        );

        self::logOp($club_id, 'remove_member', $targetUserId, '移除成員（原職稱 ' . $target['role'] . '）');

        Helper::success('成員已移除');
    }

    /**
     * 取得當前幹部跨所有管理社團的待審核申請（按社團分組，供通知中心使用）
     * GET /api/club-admin.php?action=pending_app_count
     */
    public static function getPendingAppCount() {
        if (!Auth::isLoggedIn()) {
            Helper::success('', ['count' => 0, 'clubs' => []]);
            return;
        }
        if (session_status() === PHP_SESSION_ACTIVE) { session_write_close(); }
        $uid = Auth::getCurrentUserId();
        $clubs = Database::getInstance()->fetchAll(
            "SELECT cja.club_id, c.club_name, COUNT(*) AS cnt
             FROM club_join_applications cja
             JOIN clubs c ON c.club_id = cja.club_id
             JOIN club_members cm ON cm.club_id = cja.club_id
                 AND cm.user_id = ? AND cm.is_active = 1
                 AND cm.role IN ('president','vice_president','public_relations','treasurer','director')
             WHERE cja.status = 'pending'
             GROUP BY cja.club_id, c.club_name
             ORDER BY c.club_name",
            [$uid]
        );
        $total = (int)array_sum(array_column($clubs, 'cnt'));
        Helper::success('', ['count' => $total, 'clubs' => $clubs]);
    }

    /**
     * 取得社團待審核加入申請
     * GET /api/club-admin.php?action=join_applications&id={club_id}
     */
    public static function getJoinApplications($club_id) {
        if (!Auth::isLoggedIn()) { Helper::error('請先登入', 401); }
        if (session_status() === PHP_SESSION_ACTIVE) { session_write_close(); }
        $club_id = (int)$club_id;
        if (!$club_id) Helper::error('缺少社團 ID', 400);

        $callerId = Auth::getCurrentUserId();
        if (!Auth::isAdmin()) {
            $membership = Database::getInstance()->fetchOne(
                'SELECT role FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1
                 AND role IN ("president","vice_president","public_relations","treasurer","director")',
                [$club_id, $callerId]
            );
            if (!$membership) Helper::error('無此社團管理權限', 403);
        }

        $apps = Database::getInstance()->fetchAll(
            "SELECT a.application_id, a.user_id, a.fee_type, a.status, a.created_at,
                    u.name AS user_name, u.student_id, u.avatar_path
             FROM club_join_applications a
             JOIN users u ON u.user_id = a.user_id
             WHERE a.club_id = ? AND a.status = 'pending'
             ORDER BY a.created_at ASC",
            [$club_id]
        );
        Helper::success('取得申請列表成功', ['applications' => $apps]);
    }

    /**
     * 審核加入申請（批准或拒絕）
     * POST /api/club-admin.php?action=review_application
     * Body: { application_id, action: 'approve'|'reject' }
     */
    public static function reviewApplication($data) {
        if (!Auth::isLoggedIn()) { Helper::error('請先登入', 401); }
        if (session_status() === PHP_SESSION_ACTIVE) { session_write_close(); }

        $appId  = (int)($data['application_id'] ?? 0);
        $act    = trim($data['action'] ?? '');
        if (!$appId || !in_array($act, ['approve', 'reject'], true)) {
            Helper::error('參數錯誤', 400);
        }

        $app = Database::getInstance()->fetchOne(
            "SELECT a.*, c.club_name
             FROM club_join_applications a
             JOIN clubs c ON c.club_id = a.club_id
             WHERE a.application_id = ? AND a.status IN ('pending','approved') AND a.code_used = 0",
            [$appId]
        );
        if (!$app) Helper::error('申請不存在或已處理', 404);

        $callerId = Auth::getCurrentUserId();
        if (!Auth::isAdmin()) {
            $membership = Database::getInstance()->fetchOne(
                'SELECT role FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1
                 AND role IN ("president","vice_president","public_relations","treasurer","director")',
                [(int)$app['club_id'], $callerId]
            );
            if (!$membership) Helper::error('無此社團管理權限', 403);
        }

        $now = date('Y-m-d H:i:s');

        if ($act === 'reject') {
            dbUpdate('club_join_applications',
                ['status' => 'rejected', 'reviewed_by' => $callerId, 'reviewed_at' => $now],
                'application_id = ?', [$appId]
            );
            dbInsert('bot_messages', [
                'user_id'      => (int)$app['user_id'],
                'message_type' => 'join_rejected',
                'title'        => '社團加入申請未通過',
                'content'      => '您申請加入「' . $app['club_name'] . '」的申請未獲批准。',
                'meta'         => json_encode(['club_id' => (int)$app['club_id'], 'club_name' => $app['club_name']]),
            ]);
            self::logOp((int)$app['club_id'], 'reject_join', (int)$app['user_id'], '拒絕加入申請');
            Helper::success('已拒絕申請');
            return;
        }

        // 冪等處理：已批准 → 重新生成驗證碼（無論舊碼是否已用），刷新 30 分鐘有效期
        if ($app['status'] === 'approved') {
            $newCode = strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
            $expires = date('Y-m-d H:i:s', strtotime('+30 minutes'));
            Database::getInstance()->update(
                'club_join_applications',
                ['verification_code' => $newCode, 'code_used' => 0, 'code_expires_at' => $expires],
                'application_id = ?', [$appId]
            );
            dbInsert('bot_messages', [
                'user_id'      => (int)$app['user_id'],
                'message_type' => 'join_verification',
                'title'        => '社團加入申請通過！（驗證碼補發）',
                'content'      => '您申請加入「' . $app['club_name'] . '」的驗證碼如下（有效期 30 分鐘）：',
                'meta'         => json_encode([
                    'club_id'           => (int)$app['club_id'],
                    'club_name'         => $app['club_name'],
                    'verification_code' => $newCode,
                    'application_id'    => $appId,
                ]),
            ]);
            Helper::success('驗證碼已重新傳送給用戶');
            return;
        }

        // 第一次批准：原子更新（WHERE 加 status='pending' 防止並發競爭）
        // 若兩個請求同時讀到 pending，只有第一個 UPDATE 的 affected_rows=1；
        // 第二個 affected_rows=0，改走補發現有驗證碼的路徑，確保學生收到的碼與 DB 一致。
        $code    = strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
        $expires = date('Y-m-d H:i:s', strtotime('+30 minutes'));
        $db      = Database::getInstance();
        $db->update(
            'club_join_applications',
            ['status' => 'approved', 'verification_code' => $code, 'code_expires_at' => $expires, 'reviewed_by' => $callerId, 'reviewed_at' => $now],
            'application_id = ? AND status = ?',
            [$appId, 'pending']
        );

        if ($db->getConnection()->affected_rows === 0) {
            // 競爭失敗：另一個並發請求已先完成批准，補發對方寫入的驗證碼
            $approved = $db->fetchOne(
                "SELECT a.verification_code, a.user_id, a.club_id, c.club_name
                 FROM club_join_applications a
                 JOIN clubs c ON c.club_id = a.club_id
                 WHERE a.application_id = ? AND a.status = 'approved' AND a.code_used = 0",
                [$appId]
            );
            if (!$approved) {
                Helper::error('申請已處理', 409);
            }
            dbInsert('bot_messages', [
                'user_id'      => (int)$approved['user_id'],
                'message_type' => 'join_verification',
                'title'        => '社團加入申請通過！（驗證碼補發）',
                'content'      => '您申請加入「' . $approved['club_name'] . '」的驗證碼如下（補發，請使用此碼完成加入）：',
                'meta'         => json_encode([
                    'club_id'           => (int)$approved['club_id'],
                    'club_name'         => $approved['club_name'],
                    'verification_code' => $approved['verification_code'],
                    'application_id'    => $appId,
                ]),
            ]);
            Helper::success('已批准申請，驗證碼已傳送給用戶');
            return;
        }

        dbInsert('bot_messages', [
            'user_id'      => (int)$app['user_id'],
            'message_type' => 'join_verification',
            'title'        => '社團加入申請通過！',
            'content'      => '您申請加入「' . $app['club_name'] . '」已獲批准，請使用以下驗證碼完成加入：',
            'meta'         => json_encode([
                'club_id'           => (int)$app['club_id'],
                'club_name'         => $app['club_name'],
                'verification_code' => $code,
                'application_id'    => $appId,
            ]),
        ]);
        self::logOp((int)$app['club_id'], 'approve_join', (int)$app['user_id'], '核准加入申請');
        Helper::success('已批准申請，驗證碼已傳送給用戶');
    }

    public static function getMyTransferRequests() {
        self::requireClubAdmin();
        $user_id = Auth::getCurrentUserId();
        $club_id = isset($_GET['club_id']) && (int)$_GET['club_id'] > 0 ? (int)$_GET['club_id'] : null;

        $sql = 'SELECT r.request_id, r.club_id, c.club_name, c.club_code,
                       r.target_user_id, tu.name AS target_user_name, tu.student_id AS target_student_id,
                       r.reason, r.handover_note, r.request_status, r.review_note,
                       r.requested_at, r.reviewed_at
                FROM account_transfer_requests r
                JOIN clubs c ON r.club_id = c.club_id
                JOIN users tu ON r.target_user_id = tu.user_id
                WHERE r.requester_user_id = ?';
        $params = [$user_id];

        if ($club_id !== null) {
            $sql .= ' AND r.club_id = ?';
            $params[] = $club_id;
        }

        $sql .= ' ORDER BY r.requested_at DESC';
        $rows = Database::getInstance()->fetchAll($sql, $params);

        Helper::success('取得我的轉讓申請成功', ['requests' => $rows]);
    }

    /**
     * 解析活動所屬社團（供通知導向時自動切換社團使用）
     * GET /api/club-admin.php?action=event_club&id=<event_id>
     */
    public static function getEventClub($event_id) {
        self::requireClubAdmin();

        $event = Database::getInstance()->fetchOne(
            'SELECT e.event_id, e.club_id, c.club_name
             FROM events e JOIN clubs c ON c.club_id = e.club_id
             WHERE e.event_id = ?',
            [(int)$event_id]
        );
        if (!$event) {
            Helper::error('活動不存在', 404);
        }

        // 驗證目前使用者為該社團現任幹部（平台管理員不受限）
        if (!Auth::isAdmin()) {
            $isOfficer = Database::getInstance()->fetchOne(
                'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1 AND role IN ("president", "vice_president", "public_relations", "treasurer", "director")',
                [$event['club_id'], Auth::getCurrentUserId()]
            );
            if (!$isOfficer) {
                Helper::error('您無權限檢視此活動', 403);
            }
        }

        Helper::success('取得活動社團成功', [
            'club_id' => (int)$event['club_id'],
            'club_name' => $event['club_name'],
        ]);
    }

    /**
     * 取得社團操作紀錄（稽核 Log）
     * 權限：平台管理員 / 該社團幹部 / 該社團所屬類別的助教
     * GET /api/club-admin.php?action=operation_logs&id=<club_id>
     */
    public static function getOperationLogs($club_id) {
        if (!Auth::isLoggedIn()) { Helper::error('請先登入', 401); }
        $club_id = (int)$club_id;
        if ($club_id <= 0) Helper::error('缺少社團', 400);

        $allowed = Auth::isAdmin();
        if (!$allowed) {
            $isOfficer = Database::getInstance()->fetchOne(
                'SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ? AND is_active = 1
                 AND role IN ("president","vice_president","public_relations","treasurer","director")',
                [$club_id, Auth::getCurrentUserId()]
            );
            $allowed = (bool)$isOfficer;
        }
        if (!$allowed && Auth::isCategoryAssistant()) {
            $catId = Auth::getCategoryAssistantCategoryId();
            $club = Database::getInstance()->fetchOne('SELECT category_id FROM clubs WHERE club_id = ?', [$club_id]);
            if ($club && $catId && (int)$club['category_id'] === (int)$catId) $allowed = true;
        }
        if (!$allowed) Helper::error('您無權限檢視此社團的操作紀錄', 403);

        $logs = Database::getInstance()->fetchAll(
            'SELECT l.log_id, l.action, l.actor_role, l.detail, l.created_at,
                    actor.name  AS actor_name,
                    target.name AS target_name
             FROM club_operation_logs l
             LEFT JOIN users actor  ON actor.user_id  = l.actor_user_id
             LEFT JOIN users target ON target.user_id = l.target_user_id
             WHERE l.club_id = ?
             ORDER BY l.created_at DESC, l.log_id DESC
             LIMIT 200',
            [$club_id]
        );
        Helper::success('取得操作紀錄成功', ['logs' => $logs]);
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
    } elseif ($action === 'club_stats' && $club_id) {
        ClubAdminAPI::getClubStats($club_id);
    } elseif ($action === 'club_members' && $club_id) {
        ClubAdminAPI::getClubMembers($club_id);
    } elseif ($action === 'join_applications' && $club_id) {
        ClubAdminAPI::getJoinApplications($club_id);
    } elseif ($action === 'pending_app_count') {
        ClubAdminAPI::getPendingAppCount();
    } elseif ($action === 'event_club' && $club_id) {
        ClubAdminAPI::getEventClub($club_id);
    }
}

if ($method === 'POST') {
    $data = Helper::getRequestInput();
    if ($action === 'create_event') {
        ClubAdminAPI::createClubEvent($data);
    } elseif ($action === 'submit_transfer_request') {
        ClubAdminAPI::submitTransferRequest($data);
    } elseif ($action === 'update_member_role') {
        ClubAdminAPI::updateMemberRole($data);
    } elseif ($action === 'remove_member') {
        ClubAdminAPI::removeMember($data);
    } elseif ($action === 'update_fee_paid') {
        ClubAdminAPI::updateFeePaid($data);
    } elseif ($action === 'update_member_fee_type') {
        ClubAdminAPI::updateMemberFeeType($data);
    } elseif ($action === 'review_application') {
        ClubAdminAPI::reviewApplication($data);
    }
}

Helper::error('無效請求', 400);
