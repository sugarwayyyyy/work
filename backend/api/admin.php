<?php
/**
 * 管理員專用 API
 */

require_once '../auth.php';
require_once '../content_filter.php';

// Handle CORS preflight requests
Helper::handleCorsPreFlight();

class AdminAPI {

    private static function forceHideReportedContent($report) {
        $type = $report['reported_content_type'] ?? '';
        $contentId = (int)($report['reported_content_id'] ?? 0);

        if ($contentId <= 0) {
            return;
        }

        if ($type === 'qa_question') {
            dbUpdate('q_and_a', ['status' => 'closed'], 'qa_id = ?', [$contentId]);
        } elseif ($type === 'qa_reply') {
            dbUpdate('qa_replies', ['reply_content' => '[此內容因違反規範已下架]'], 'reply_id = ?', [$contentId]);
        } elseif ($type === 'review') {
            dbUpdate('reviews', ['review_status' => 'rejected'], 'review_id = ?', [$contentId]);
        } elseif ($type === 'event') {
            dbUpdate('events', ['event_status' => 'cancelled'], 'event_id = ?', [$contentId]);
        } elseif ($type === 'club') {
            dbUpdate('clubs', [
                'activity_status' => 'inactive',
                'deleted_at' => date('Y-m-d H:i:s'),
                'last_updated' => date('Y-m-d H:i:s')
            ], 'club_id = ?', [$contentId]);
        }
    }

    private static function syncUserRoleByClubAdminMembership($user_id) {
        $activeAdminMembership = Database::getInstance()->fetchOne(
            'SELECT 1
             FROM club_members
             WHERE user_id = ?
               AND is_active = 1
               AND role IN ("president", "vice_president", "public_relations", "treasurer", "director")
             LIMIT 1',
            [$user_id]
        );

        if ($activeAdminMembership) {
            dbUpdate('users', ['role' => 'club_admin'], 'user_id = ?', [$user_id]);
            return;
        }

        $user = Database::getInstance()->fetchOne('SELECT role FROM users WHERE user_id = ?', [$user_id]);
        if ($user && $user['role'] !== 'platform_admin') {
            dbUpdate('users', ['role' => 'student'], 'user_id = ?', [$user_id]);
        }
    }

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
        $users = Database::getInstance()->fetchAll(
            'SELECT
                u.user_id,
                u.name,
                u.email,
                u.student_id,
                u.avatar_path,
                u.role,
                u.created_at,
                u.is_active,
                COALESCE(cm_stats.club_admin_count, 0) AS club_admin_count,
                COALESCE(cm_stats.club_role_summary, "") AS club_role_summary
             FROM users u
             LEFT JOIN (
                SELECT
                    cm.user_id,
                    COUNT(*) AS club_admin_count,
                    GROUP_CONCAT(CONCAT(c.club_name, ":", cm.role) ORDER BY c.club_name ASC SEPARATOR "||") AS club_role_summary
                FROM club_members cm
                JOIN clubs c ON c.club_id = cm.club_id
                WHERE cm.is_active = 1
                  AND cm.role IN ("president", "vice_president", "public_relations", "treasurer", "director")
                GROUP BY cm.user_id
             ) cm_stats ON cm_stats.user_id = u.user_id
             ORDER BY u.created_at DESC'
        );
        Helper::success('取得用戶列表成功', ['users' => $users]);
    }

    public static function getClubAdminAssignments() {
        self::requireAdmin();
        $assignments = Database::getInstance()->fetchAll('
            SELECT
                cm.member_id,
                cm.club_id,
                c.club_code,
                c.club_name,
                cm.user_id,
                u.name AS user_name,
                u.email AS user_email,
                u.student_id AS user_student_id,
                cm.role,
                cm.is_active,
                cm.join_date
            FROM club_members cm
            JOIN clubs c ON c.club_id = cm.club_id
            JOIN users u ON u.user_id = cm.user_id
            WHERE cm.role IN ("president", "vice_president", "public_relations", "treasurer", "director")
            ORDER BY c.club_code ASC, u.name ASC
        ');

        Helper::success('取得社團幹部名單成功', ['assignments' => $assignments]);
    }

    public static function upsertClubAdminAssignment($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['club_id', 'user_key', 'role']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $club_id = (int)$data['club_id'];
        $user_key = trim($data['user_key']);
        $allowedRoles = ['president', 'vice_president', 'public_relations', 'treasurer', 'director'];
        $role = trim((string)$data['role']);
        if (!in_array($role, $allowedRoles, true)) {
            Helper::error('無效的幹部職務', 400);
        }
        $is_active = isset($data['is_active']) ? (int)$data['is_active'] : 1;

        $club = Database::getInstance()->fetchOne('SELECT club_id FROM clubs WHERE club_id = ?', [$club_id]);
        if (!$club) Helper::error('社團不存在', 404);

        $user = Database::getInstance()->fetchOne(
            'SELECT user_id, role, is_active FROM users WHERE user_id = ? OR email = ? OR student_id = ?',
            [$user_key, $user_key, $user_key]
        );
        if (!$user) Helper::error('找不到對應帳號', 404);
        if (($user['role'] ?? '') === 'platform_admin') {
            Helper::error('平台管理員不能成為社團管理員', 403);
        }

        $member = Database::getInstance()->fetchOne(
            'SELECT member_id FROM club_members WHERE club_id = ? AND user_id = ?',
            [$club_id, $user['user_id']]
        );

        // 獨占職稱：同社團不可有兩人擔任同一職稱
        $exclusiveRoles = ['president', 'vice_president', 'public_relations', 'treasurer', 'director'];
        if ($is_active === 1 && in_array($role, $exclusiveRoles, true)) {
            $existing = Database::getInstance()->fetchOne(
                'SELECT user_id FROM club_members WHERE club_id = ? AND role = ? AND is_active = 1 AND user_id != ?',
                [$club_id, $role, (int)$user['user_id']]
            );
            if ($existing) {
                $roleNames = [
                    'president' => '社長', 'vice_president' => '副社長',
                    'public_relations' => '公關', 'treasurer' => '總務', 'director' => '幹事',
                ];
                Helper::error('此社團已有人擔任「' . ($roleNames[$role] ?? $role) . '」，請先移除或變更該成員的職稱', 409);
            }

            // 社長額外限制：一人只能擔任一個社團的社長
            if ($role === 'president') {
                $otherPresident = Database::getInstance()->fetchOne(
                    'SELECT cm.club_id, c.club_name FROM club_members cm
                     JOIN clubs c ON c.club_id = cm.club_id
                     WHERE cm.user_id = ? AND cm.role = "president" AND cm.is_active = 1 AND cm.club_id != ?',
                    [(int)$user['user_id'], $club_id]
                );
                if ($otherPresident) {
                    Helper::error('此帳號已是「' . $otherPresident['club_name'] . '」的社長，一人只能擔任一個社團的社長', 409);
                }
            }
        }

        $memberData = [
            'club_id' => $club_id,
            'user_id' => (int)$user['user_id'],
            'role' => $role,
            'is_active' => $is_active,
            'join_date' => date('Y-m-d H:i:s')
        ];

        if ($member) {
            $result = dbUpdate('club_members', [
                'role' => $role,
                'is_active' => $is_active
            ], 'member_id = ?', [$member['member_id']]);
        } else {
            $result = dbInsert('club_members', $memberData);
        }

        if (!$result) Helper::error('儲存幹部資格失敗', 500);

        if ($is_active === 1 && in_array($role, ['president', 'vice_president', 'public_relations', 'treasurer', 'director'], true)) {
            dbUpdate('users', ['role' => 'club_admin'], 'user_id = ?', [$user['user_id']]);
        }

        Helper::success($member ? '幹部資格已更新' : '幹部資格已新增');
    }

    public static function revokeClubAdminAssignment($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['member_id']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $member_id = (int)$data['member_id'];
        $member = Database::getInstance()->fetchOne(
            'SELECT member_id, club_id, user_id FROM club_members WHERE member_id = ?',
            [$member_id]
        );
        if (!$member) Helper::error('找不到幹部資料', 404);

        $result = dbUpdate('club_members', [
            'role' => 'member',
            'is_active' => 1
        ], 'member_id = ?', [$member_id]);
        if (!$result) Helper::error('撤銷幹部資格失敗', 500);

        self::syncUserRoleByClubAdminMembership((int)$member['user_id']);

        Helper::success('已撤銷幹部資格');
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

        if (ContentFilter::hasRestrictedInFields($data, ['club_name', 'description'])) {
            Helper::error('社團資料包含不適當字眼，請修改後再送出', 400);
        }

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

        if (ContentFilter::hasRestrictedInFields($data, ['club_name'])) {
            Helper::error('社團名稱包含不適當字眼，請修改後再送出', 400);
        }

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

    public static function getClubDetail($club_id) {
        self::requireAdmin();
        $club_id = (int)$club_id;
        if (!$club_id) Helper::error('無效的社團ID', 400);
        $club = Database::getInstance()->fetchOne('SELECT * FROM clubs WHERE club_id = ?', [$club_id]);
        if (!$club) Helper::error('社團不存在', 404);
        Helper::success('取得社團詳情成功', ['club' => $club]);
    }

    public static function updateClubDetail($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['club_id', 'club_code', 'club_name']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        if (ContentFilter::hasRestrictedInFields($data, ['club_name', 'description'])) {
            Helper::error('社團資料包含不適當字眼，請修改後再送出', 400);
        }

        $club_id = (int)$data['club_id'];
        $result = dbUpdate('clubs', [
            'club_code'          => trim($data['club_code']),
            'club_name'          => trim($data['club_name']),
            'category_id'        => isset($data['category_id']) && $data['category_id'] !== '' ? (int)$data['category_id'] : null,
            'description'        => $data['description'] ?? '',
            'founding_year'      => isset($data['founding_year']) && $data['founding_year'] !== '' ? (int)$data['founding_year'] : null,
            'meeting_day'        => $data['meeting_day'] ?? '',
            'meeting_time'       => $data['meeting_time'] ?? '',
            'meeting_location'   => $data['meeting_location'] ?? '',
            'contact_email'      => $data['contact_email'] ?? '',
            'contact_phone'      => $data['contact_phone'] ?? '',
            'club_fee'           => isset($data['club_fee']) && $data['club_fee'] !== '' ? (int)$data['club_fee'] : 0,
            'club_fee_semester'  => isset($data['club_fee_semester']) && $data['club_fee_semester'] !== '' ? (int)$data['club_fee_semester'] : null,
            'last_updated'       => date('Y-m-d H:i:s'),
        ], 'club_id = ?', [$club_id]);

        if (!$result) Helper::error('更新社團資料失敗', 500);
        Helper::success('更新社團資料成功');
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

    public static function updateUserProfile($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['user_id']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $user_id = (int)$data['user_id'];
        $update = [];

        if (isset($data['name'])) {
            $name = trim((string)$data['name']);
            if ($name === '') Helper::error('姓名不可為空', 400);
            if (ContentFilter::containsRestrictedLanguage($name)) Helper::error('姓名包含不適當字眼', 400);
            $update['name'] = $name;
        }

        if (isset($data['email'])) {
            $email = trim((string)$data['email']);
            if (!Helper::validateEmail($email)) Helper::error('郵箱格式不正確', 400);
            $dup = Database::getInstance()->fetchOne(
                'SELECT user_id FROM users WHERE email = ? AND user_id <> ?',
                [$email, $user_id]
            );
            if ($dup) Helper::error('此郵箱已被其他帳號使用', 409);
            $update['email'] = $email;
        }

        if (isset($data['student_id'])) {
            $sid = trim((string)$data['student_id']);
            if ($sid !== '') {
                $dup = Database::getInstance()->fetchOne(
                    'SELECT user_id FROM users WHERE student_id = ? AND user_id <> ?',
                    [$sid, $user_id]
                );
                if ($dup) Helper::error('學號已被其他帳號使用', 409);
                $update['student_id'] = $sid;
            } else {
                $update['student_id'] = null;
            }
        }

        if (!empty($update)) {
            dbUpdate('users', $update, 'user_id = ?', [$user_id]);
        }

        Helper::success('用戶資料更新成功');
    }

    public static function updateUserStatus($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['user_id', 'is_active']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $user_id = (int)$data['user_id'];
        $is_active = ((int)$data['is_active'] === 1) ? 1 : 0;

        if ($user_id === (int)Auth::getCurrentUserId() && $is_active === 0) {
            Helper::error('無法停權自己的帳號', 403);
        }

        dbUpdate('users', ['is_active' => $is_active], 'user_id = ?', [$user_id]);
        Helper::success('帳號狀態更新成功');
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

    public static function submitFeedback($data) {
        if (!Auth::isLoggedIn()) Helper::error('請先登入', 401);
        if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
        $uid     = Auth::getCurrentUserId();
        $type    = trim($data['feedback_type'] ?? 'other');
        $content = trim($data['content'] ?? '');
        $validTypes = ['suggestion', 'bug', 'other'];
        if (!in_array($type, $validTypes, true)) $type = 'other';
        if ($content === '') Helper::error('請填寫回饋內容', 400);
        if (mb_strlen($content) > 1000) Helper::error('內容不得超過 1000 字', 400);
        dbInsert('feedback', [
            'user_id'       => $uid,
            'feedback_type' => $type,
            'content'       => $content,
        ]);
        Helper::success('感謝您的回饋！');
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

    public static function getReports() {
        self::requireAdmin();

        $status = trim((string)($_GET['status'] ?? ''));
        $where = '';
        $params = [];
        if ($status !== '' && in_array($status, ['pending', 'reviewing', 'resolved', 'dismissed'], true)) {
            $where = 'WHERE r.status = ?';
            $params[] = $status;
        }

        $reports = Database::getInstance()->fetchAll(
            'SELECT r.*,
                u.name AS reported_by_name,
                u.student_id AS reported_by_student_id,
                CASE r.reported_content_type
                    WHEN \'qa_question\' THEN q.question_title
                    WHEN \'review\'      THEN rv.review_title
                    WHEN \'event\'       THEN e.event_name
                    WHEN \'club\'        THEN c.club_name
                    ELSE NULL
                END AS content_title,
                CASE r.reported_content_type
                    WHEN \'qa_question\' THEN q.question_content
                    WHEN \'qa_reply\'    THEN qr.reply_content
                    WHEN \'review\'      THEN rv.review_content
                    WHEN \'event\'       THEN e.description
                    WHEN \'club\'        THEN c.description
                    ELSE NULL
                END AS content_body,
                CASE r.reported_content_type
                    WHEN \'qa_question\' THEN qa_u.name
                    WHEN \'qa_reply\'    THEN qr_u.name
                    WHEN \'review\'      THEN rv_u.name
                    ELSE NULL
                END AS content_author,
                CASE r.reported_content_type
                    WHEN \'qa_question\' THEN q.is_anonymous
                    WHEN \'qa_reply\'    THEN qr.is_anonymous
                    WHEN \'review\'      THEN rv.is_anonymous
                    ELSE 0
                END AS content_is_anonymous,
                qr.qa_id AS reply_parent_qa_id,
                qr_q.question_title AS reply_parent_question_title,
                qr_q.question_content AS reply_parent_question_content,
                rv.club_id AS review_club_id,
                rv.rating AS review_rating,
                rv_club.club_name AS review_club_name,
                CASE r.reported_content_type
                    WHEN \'qa_question\' THEN q_club.club_name
                    WHEN \'qa_reply\'    THEN qr_q_club.club_name
                    ELSE NULL
                END AS content_club_name
             FROM reports r
             JOIN users u ON u.user_id = r.reported_by_user_id
             LEFT JOIN q_and_a q         ON r.reported_content_type = \'qa_question\' AND q.qa_id = r.reported_content_id
             LEFT JOIN users qa_u        ON q.user_id = qa_u.user_id
             LEFT JOIN clubs q_club      ON q.club_id = q_club.club_id
             LEFT JOIN qa_replies qr     ON r.reported_content_type = \'qa_reply\' AND qr.reply_id = r.reported_content_id
             LEFT JOIN users qr_u        ON qr.user_id = qr_u.user_id
             LEFT JOIN q_and_a qr_q      ON qr.qa_id = qr_q.qa_id
             LEFT JOIN clubs qr_q_club   ON qr_q.club_id = qr_q_club.club_id
             LEFT JOIN reviews rv        ON r.reported_content_type = \'review\' AND rv.review_id = r.reported_content_id
             LEFT JOIN users rv_u        ON rv.user_id = rv_u.user_id
             LEFT JOIN clubs rv_club     ON rv.club_id = rv_club.club_id
             LEFT JOIN events e          ON r.reported_content_type = \'event\' AND e.event_id = r.reported_content_id
             LEFT JOIN clubs c           ON r.reported_content_type = \'club\' AND c.club_id = r.reported_content_id
             ' . $where . '
             ORDER BY (r.status = "pending") DESC, r.created_at DESC',
            $params
        );

        // Always include per-status counts regardless of filter
        $countRows = Database::getInstance()->fetchAll(
            'SELECT status, COUNT(*) AS cnt FROM reports GROUP BY status'
        );
        $counts = ['all' => 0, 'pending' => 0, 'reviewing' => 0, 'resolved' => 0, 'dismissed' => 0];
        foreach ($countRows as $row) {
            $s = $row['status'];
            if (isset($counts[$s])) $counts[$s] = (int)$row['cnt'];
            $counts['all'] += (int)$row['cnt'];
        }

        Helper::success('取得檢舉列表成功', ['reports' => $reports, 'counts' => $counts]);
    }

    public static function reviewReport($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['report_id', 'decision']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $reportId = (int)$data['report_id'];
        $decision = trim((string)$data['decision']);
        $adminNotes = trim((string)($data['admin_notes'] ?? ''));
        $forceHide = isset($data['force_hide']) && (int)$data['force_hide'] === 1;

        if (!in_array($decision, ['resolved', 'dismissed'], true)) {
            Helper::error('decision 必須為 resolved 或 dismissed', 400);
        }

        $report = Database::getInstance()->fetchOne(
            'SELECT * FROM reports WHERE report_id = ? LIMIT 1',
            [$reportId]
        );
        if (!$report) {
            Helper::error('找不到檢舉工單', 404);
        }

        $actionTaken = $report['action_taken'] ?? null;
        if ($decision === 'resolved' && $forceHide) {
            $actionTaken = 'force_hide';
            self::forceHideReportedContent($report);
        } elseif ($decision === 'dismissed') {
            $actionTaken = 'no_action';
        }

        dbUpdate('reports', [
            'status' => $decision,
            'admin_notes' => $adminNotes,
            'action_taken' => $actionTaken,
            'resolved_at' => in_array($decision, ['resolved', 'dismissed'], true) ? date('Y-m-d H:i:s') : null,
            'resolved_by' => Auth::getCurrentUser()['user_id']
        ], 'report_id = ?', [$reportId]);

        Helper::success('檢舉工單已更新');
    }

    public static function getAnonymousContentIdentity() {
        self::requireAdmin();

        $contentType = trim((string)($_GET['content_type'] ?? ''));
        $contentId = (int)($_GET['content_id'] ?? 0);
        if ($contentId <= 0 || $contentType === '') {
            Helper::error('缺少 content_type 或 content_id', 400);
        }

        $row = null;
        if ($contentType === 'qa_question') {
            $row = Database::getInstance()->fetchOne(
                'SELECT qa.qa_id AS content_id, qa.user_id, u.name, u.student_id, qa.is_anonymous
                 FROM q_and_a qa
                 JOIN users u ON u.user_id = qa.user_id
                 WHERE qa.qa_id = ? LIMIT 1',
                [$contentId]
            );
        } elseif ($contentType === 'qa_reply') {
            $row = Database::getInstance()->fetchOne(
                'SELECT qr.reply_id AS content_id, qr.user_id, u.name, u.student_id, qr.is_anonymous
                 FROM qa_replies qr
                 JOIN users u ON u.user_id = qr.user_id
                 WHERE qr.reply_id = ? LIMIT 1',
                [$contentId]
            );
        } elseif ($contentType === 'review') {
            $row = Database::getInstance()->fetchOne(
                'SELECT r.review_id AS content_id, r.user_id, u.name, u.student_id, r.is_anonymous
                 FROM reviews r
                 JOIN users u ON u.user_id = r.user_id
                 WHERE r.review_id = ? LIMIT 1',
                [$contentId]
            );
        } else {
            Helper::error('不支援的 content_type', 400);
        }

        if (!$row) {
            Helper::error('內容不存在', 404);
        }

        Helper::success('取得匿名內容真實身分成功', [
            'content_type' => $contentType,
            'content_id' => (int)($row['content_id'] ?? $contentId),
            'is_anonymous' => (int)($row['is_anonymous'] ?? 0),
            'author' => [
                'user_id' => (int)($row['user_id'] ?? 0),
                'name' => $row['name'] ?? '',
                'student_id' => $row['student_id'] ?? ''
            ]
        ]);
    }

    public static function createAnnouncement($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['title', 'content', 'type']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        if (ContentFilter::hasRestrictedInFields($data, ['title', 'content'])) {
            Helper::error('公告內容包含不適當字眼，請修改後再送出', 400);
        }

        $announcement = [
            'title' => trim($data['title']),
            'content' => trim($data['content']),
            'announcement_type' => in_array($data['type'], ['event', 'maintenance', 'update', 'important']) ? $data['type'] : 'important',
            'is_pinned' => isset($data['is_sticky']) ? (int)$data['is_sticky'] : 0,
            'created_by' => Auth::getCurrentUser()['user_id'],
            'created_at' => date('Y-m-d H:i:s'),
            'start_date' => !empty($data['start_date']) ? $data['start_date'] : null,
            'end_date' => !empty($data['end_date']) ? $data['end_date'] : null
        ];

        $announcement_id = dbInsert('system_announcements', $announcement);
        if (!$announcement_id) Helper::error('創建公告失敗', 500);

        self::notifyAllUsersForAnnouncement($announcement_id, $announcement['title']);

        Helper::success('公告創建成功', ['announcement_id' => $announcement_id]);
    }

    public static function getAnnouncements() {
        if (Auth::isAdmin()) {
            $announcements = Database::getInstance()->fetchAll(
                'SELECT * FROM system_announcements
                 ORDER BY is_pinned DESC, display_priority DESC, created_at DESC'
            );
        } else {
            $announcements = Database::getInstance()->fetchAll(
                'SELECT * FROM system_announcements
                 WHERE (start_date IS NULL OR start_date <= NOW())
                   AND (
                       (end_date IS NULL OR end_date >= NOW())
                       OR (is_pinned = 1 AND end_date IS NOT NULL AND end_date < NOW())
                   )
                 ORDER BY is_pinned DESC, display_priority DESC, created_at DESC'
            );
        }
        Helper::success('取得公告列表成功', ['announcements' => $announcements]);
    }

    public static function deleteAnnouncement($id) {
        self::requireAdmin();
        $result = dbDelete('system_announcements', 'announcement_id = ?', [$id]);
        if (!$result) Helper::error('刪除公告失敗', 500);

        Helper::success('公告刪除成功');
    }

    public static function updateAnnouncement($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['announcement_id', 'title', 'content', 'type']);
        if (!empty($errors)) Helper::error('欄位驗證失敗: ' . implode(', ', $errors), 400);

        if (ContentFilter::hasRestrictedInFields($data, ['title', 'content'])) {
            Helper::error('公告內容包含不適當字眼，請修改後再送出', 400);
        }

        $announcementId = (int)$data['announcement_id'];
        if ($announcementId <= 0) {
            Helper::error('公告 ID 格式錯誤', 400);
        }

        $existing = Database::getInstance()->fetchOne(
            'SELECT announcement_id FROM system_announcements WHERE announcement_id = ? LIMIT 1',
            [$announcementId]
        );
        if (!$existing) {
            Helper::error('公告不存在', 404);
        }

        $updateData = [
            'title' => trim($data['title']),
            'content' => trim($data['content']),
            'announcement_type' => in_array($data['type'], ['event', 'maintenance', 'update', 'important']) ? $data['type'] : 'important',
            'is_pinned' => isset($data['is_sticky']) ? (int)$data['is_sticky'] : 0,
            'start_date' => !empty($data['start_date']) ? $data['start_date'] : null,
            'end_date' => !empty($data['end_date']) ? $data['end_date'] : null
        ];

        dbUpdate('system_announcements', $updateData, 'announcement_id = ?', [$announcementId]);
        Helper::success('公告更新成功');
    }

    public static function unpinAnnouncement($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['announcement_id']);
        if (!empty($errors)) Helper::error('欄位驗證失敗: ' . implode(', ', $errors), 400);

        $announcementId = (int)$data['announcement_id'];
        if ($announcementId <= 0) {
            Helper::error('公告 ID 格式錯誤', 400);
        }

        $existing = Database::getInstance()->fetchOne(
            'SELECT announcement_id FROM system_announcements WHERE announcement_id = ? LIMIT 1',
            [$announcementId]
        );
        if (!$existing) {
            Helper::error('公告不存在', 404);
        }

        dbUpdate('system_announcements', [
            'is_pinned' => 0,
            'display_priority' => 0
        ], 'announcement_id = ?', [$announcementId]);

        Helper::success('公告已取消置頂');
    }

    public static function getTransferRequests() {
        self::requireAdmin();
        $requests = Database::getInstance()->fetchAll(
            'SELECT r.request_id, r.club_id, c.club_code, c.club_name,
                    r.requester_user_id, ru.name AS requester_name, ru.student_id AS requester_student_id, ru.email AS requester_email,
                    r.target_user_id, tu.name AS target_name, tu.student_id AS target_student_id, tu.email AS target_email,
                    r.reason, r.handover_note, r.request_status, r.review_note,
                    r.requested_at, r.reviewed_at,
                    r.reviewed_by, rv.name AS reviewed_by_name
             FROM account_transfer_requests r
             JOIN clubs c ON r.club_id = c.club_id
             JOIN users ru ON r.requester_user_id = ru.user_id
             JOIN users tu ON r.target_user_id = tu.user_id
             LEFT JOIN users rv ON r.reviewed_by = rv.user_id
             ORDER BY (r.request_status = "pending") DESC, r.requested_at DESC'
        );

        Helper::success('取得轉讓申請佇列成功', ['requests' => $requests]);
    }

    public static function reviewTransferRequest($data) {
        self::requireAdmin();
        $errors = Helper::validateRequired($data, ['request_id', 'decision']);
        if (!empty($errors)) Helper::error('驗證失敗: ' . implode(', ', $errors), 400);

        $request_id = (int)$data['request_id'];
        $decision = trim($data['decision']);
        $review_note = trim($data['review_note'] ?? '');
        $admin_user_id = Auth::getCurrentUser()['user_id'];

        if (ContentFilter::hasRestrictedInFields($data, ['review_note'])) {
            Helper::error('審核意見包含不適當字眼，請修改後再送出', 400);
        }

        if (!in_array($decision, ['approved', 'rejected'], true)) {
            Helper::error('decision 必須為 approved 或 rejected', 400);
        }

        $request = Database::getInstance()->fetchOne(
            'SELECT request_id, club_id, requester_user_id, target_user_id, reason, handover_note, request_status
             FROM account_transfer_requests
             WHERE request_id = ?',
            [$request_id]
        );
        if (!$request) Helper::error('找不到申請單', 404);
        if ($request['request_status'] !== 'pending') {
            Helper::error('此申請單已處理，無法重複審核', 409);
        }
        $targetUserRole = Database::getInstance()->fetchOne(
            'SELECT role FROM users WHERE user_id = ? LIMIT 1',
            [$request['target_user_id']]
        );
        if (($targetUserRole['role'] ?? '') === 'platform_admin') {
            Helper::error('平台管理員不能成為社團管理員', 403);
        }

        if ($decision === 'rejected' && $review_note === '') {
            Helper::error('退回申請時請填寫審核意見', 400);
        }

        $db = Database::getInstance();

        try {
            $db->beginTransaction();

            if ($decision === 'approved') {
                $requesterMember = $db->fetchOne(
                    'SELECT member_id FROM club_members
                     WHERE club_id = ? AND user_id = ? AND is_active = 1
                     LIMIT 1',
                    [$request['club_id'], $request['requester_user_id']]
                );
                if (!$requesterMember) {
                    throw new Exception('申請者目前已不在該社團幹部名單中，無法核准');
                }

                $targetMember = $db->fetchOne(
                    'SELECT member_id FROM club_members WHERE club_id = ? AND user_id = ? LIMIT 1',
                    [$request['club_id'], $request['target_user_id']]
                );

                if ($targetMember) {
                    dbUpdate('club_members', [
                        'role' => 'president',
                        'is_active' => 1
                    ], 'member_id = ?', [$targetMember['member_id']]);
                } else {
                    dbInsert('club_members', [
                        'club_id' => $request['club_id'],
                        'user_id' => $request['target_user_id'],
                        'role' => 'president',
                        'is_active' => 1,
                        'join_date' => date('Y-m-d H:i:s')
                    ]);
                }

                dbUpdate('club_members', [
                    'role' => 'member'
                ], 'club_id = ? AND user_id = ?', [$request['club_id'], $request['requester_user_id']]);

                self::syncUserRoleByClubAdminMembership($request['requester_user_id']);
                dbUpdate('users', ['role' => 'club_admin'], 'user_id = ?', [$request['target_user_id']]);

                dbInsert('account_transfers', [
                    'club_id' => $request['club_id'],
                    'from_user_id' => $request['requester_user_id'],
                    'to_user_id' => $request['target_user_id'],
                    'transferred_roles' => json_encode([
                        'source' => 'request_review',
                        'request_id' => $request_id,
                        'handover_note' => $request['handover_note']
                    ], JSON_UNESCAPED_UNICODE),
                    'transferred_at' => date('Y-m-d H:i:s'),
                    'transferred_by' => $admin_user_id,
                    'reason' => $request['reason']
                ]);
            }

            dbUpdate('account_transfer_requests', [
                'request_status' => $decision,
                'review_note' => $review_note,
                'reviewed_by' => $admin_user_id,
                'reviewed_at' => date('Y-m-d H:i:s')
            ], 'request_id = ?', [$request_id]);

            dbInsert('notifications', [
                'user_id' => $request['requester_user_id'],
                'title' => '帳戶轉讓申請審核結果',
                'message' => $decision === 'approved' ? '你的社團帳戶轉讓申請已通過。' : '你的社團帳戶轉讓申請被退回：' . $review_note,
                'notification_type' => 'system',
                'related_type' => 'club',
                'related_id' => $request['club_id'],
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ]);

            if ($decision === 'approved') {
                dbInsert('notifications', [
                    'user_id' => $request['target_user_id'],
                    'title' => '你已成為社團幹部',
                    'message' => '你的社團幹部權限轉讓申請已核准，請登入後確認社團管理頁。',
                    'notification_type' => 'system',
                    'related_type' => 'club',
                    'related_id' => $request['club_id'],
                    'is_read' => 0,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }

            $db->commit();
        } catch (Exception $e) {
            $db->rollback();
            Helper::error('審核失敗：' . $e->getMessage(), 500);
        }

        Helper::success($decision === 'approved' ? '已核准帳戶轉讓申請' : '已退回帳戶轉讓申請');
    }

    public static function getTransferHistory() {
        self::requireAdmin();
        $transfers = Database::getInstance()->fetchAll('
            SELECT at.*, c.club_code, c.club_name, u1.name as from_user_name, u2.name as to_user_name, u3.name as admin_name
            FROM account_transfers at
            LEFT JOIN clubs c ON at.club_id = c.club_id
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
    } elseif ($action === 'club_detail') {
        AdminAPI::getClubDetail($_GET['id'] ?? 0);
    } elseif ($action === 'club_admin_assignments') {
        AdminAPI::getClubAdminAssignments();
    } elseif ($action === 'event_reports') {
        AdminAPI::getEventReports();
    } elseif ($action === 'reports') {
        AdminAPI::getReports();
    } elseif ($action === 'user_feedback') {
        AdminAPI::getUserFeedback();
    } elseif ($action === 'announcements') {
        AdminAPI::getAnnouncements();
    } elseif ($action === 'transfer_history') {
        AdminAPI::getTransferHistory();
    } elseif ($action === 'transfer_requests') {
        AdminAPI::getTransferRequests();
    } elseif ($action === 'report_identity') {
        AdminAPI::getAnonymousContentIdentity();
    }
}

if ($method === 'POST') {
    $data = Helper::getRequestInput();
    if ($action === 'update_user_profile') {
        AdminAPI::updateUserProfile($data);
    } elseif ($action === 'update_user_status') {
        AdminAPI::updateUserStatus($data);
    } elseif ($action === 'update_user_role') {
        AdminAPI::updateUserRole($data);
    } elseif ($action === 'upsert_club_admin_assignment') {
        AdminAPI::upsertClubAdminAssignment($data);
    } elseif ($action === 'revoke_club_admin_assignment') {
        AdminAPI::revokeClubAdminAssignment($data);
    } elseif ($action === 'update_club_status') {
        AdminAPI::updateClubStatus($data);
    } elseif ($action === 'create_club') {
        AdminAPI::createClubBase($data);
    } elseif ($action === 'update_club') {
        AdminAPI::updateClubBase($data);
    } elseif ($action === 'update_club_detail') {
        AdminAPI::updateClubDetail($data);
    } elseif ($action === 'soft_delete_club') {
        AdminAPI::softDeleteClub($data);
    } elseif ($action === 'create_announcement') {
        AdminAPI::createAnnouncement($data);
    } elseif ($action === 'update_announcement') {
        AdminAPI::updateAnnouncement($data);
    } elseif ($action === 'unpin_announcement') {
        AdminAPI::unpinAnnouncement($data);
    } elseif ($action === 'review_transfer_request') {
        AdminAPI::reviewTransferRequest($data);
    } elseif ($action === 'review_report') {
        AdminAPI::reviewReport($data);
    } elseif ($action === 'submit_feedback') {
        AdminAPI::submitFeedback($data);
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
