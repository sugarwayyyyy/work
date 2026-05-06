<?php
/**
 * 平台儀表板摘要 API
 * GET dashboard.php  → 回傳全站統計摘要（僅限 platform_admin）
 */

require_once '../auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Helper::applyCorsHeaders();
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');
    exit(0);
}

Helper::applyCorsHeaders();

if (!Auth::isAdmin()) {
    Helper::error('您無權限執行此操作', 403);
}

$db = Database::getInstance();

// ── 1. 用戶統計 ──────────────────────────────────────────────
$userRows = $db->fetchAll('
    SELECT
        COUNT(*)                                                      AS total,
        SUM(role = "student")                                         AS students,
        (
            SELECT COUNT(DISTINCT cm.user_id)
            FROM club_members cm
            WHERE cm.is_active = 1
              AND cm.role IN ("president","vice_president","public_relations","treasurer","director")
        )                                                             AS club_admins,
        SUM(role = "platform_admin")                                  AS platform_admins,
        SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))           AS new_this_week
    FROM users
    WHERE is_active = 1
');
$u = $userRows[0] ?? [];

$users = [
    'total'           => (int)($u['total']           ?? 0),
    'students'        => (int)($u['students']        ?? 0),
    'club_admins'     => (int)($u['club_admins']     ?? 0),
    'platform_admins' => (int)($u['platform_admins'] ?? 0),
    'new_this_week'   => (int)($u['new_this_week']   ?? 0),
];

// ── 2. 社團統計 ──────────────────────────────────────────────
$clubRows = $db->fetchAll('
    SELECT
        COUNT(*)                                                AS total,
        SUM(activity_status = "active"  AND deleted_at IS NULL) AS active,
        SUM(activity_status = "inactive")                       AS inactive,
        SUM(deleted_at IS NOT NULL)                             AS hidden
    FROM clubs
');
$c = $clubRows[0] ?? [];

// 幽靈社團：無任何活躍幹部
$ghost = (int)($db->fetchOne('
    SELECT COUNT(*) AS cnt FROM clubs c
    WHERE deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM club_members cm
          WHERE cm.club_id = c.club_id
            AND cm.is_active = 1
            AND cm.role IN ("president","vice_president","public_relations","treasurer","director")
      )
')['cnt'] ?? 0);

// 久未更新社團：last_updated 超過 6 個月（且非隱藏）
$stale = (int)($db->fetchOne('
    SELECT COUNT(*) AS cnt FROM clubs
    WHERE deleted_at IS NULL
      AND last_updated < DATE_SUB(NOW(), INTERVAL 6 MONTH)
')['cnt'] ?? 0);

$clubs = [
    'total'   => (int)($c['total']    ?? 0),
    'active'  => (int)($c['active']   ?? 0),
    'inactive'=> (int)($c['inactive'] ?? 0),
    'hidden'  => (int)($c['hidden']   ?? 0),
    'ghost'   => $ghost,
    'stale'   => $stale,
];

// ── 3. 活動統計 ──────────────────────────────────────────────
$eventRows = $db->fetchAll('
    SELECT
        COUNT(*)                                                   AS total,
        SUM(event_status = "published" AND event_date > NOW())     AS upcoming,
        SUM(event_status = "published")                            AS published,
        SUM(event_status = "cancelled")                            AS cancelled
    FROM events
');
$e = $eventRows[0] ?? [];

$regRow = $db->fetchOne('
    SELECT COUNT(*) AS cnt FROM event_registrations WHERE status = "approved"
');
$totalRegistrations = (int)($regRow['cnt'] ?? 0);

$ratingRow = $db->fetchOne('
    SELECT ROUND(AVG(rating), 1) AS avg_rating FROM reviews WHERE review_status = "approved"
');
$avgRating = $ratingRow['avg_rating'] !== null ? (float)$ratingRow['avg_rating'] : null;

$events = [
    'total'               => (int)($e['total']     ?? 0),
    'upcoming'            => (int)($e['upcoming']  ?? 0),
    'published'           => (int)($e['published'] ?? 0),
    'cancelled'           => (int)($e['cancelled'] ?? 0),
    'total_registrations' => $totalRegistrations,
    'avg_rating'          => $avgRating,
];

// ── 4. 待處理事項 ─────────────────────────────────────────────
$pendingReports = (int)($db->fetchOne('
    SELECT COUNT(*) AS cnt FROM reports WHERE status = "pending"
')['cnt'] ?? 0);

$pendingTransfers = (int)($db->fetchOne('
    SELECT COUNT(*) AS cnt FROM account_transfer_requests WHERE request_status = "pending"
')['cnt'] ?? 0);

// 待審核評價：review_status 不是 approved / rejected 的
$pendingReviews = (int)($db->fetchOne('
    SELECT COUNT(*) AS cnt FROM reviews
    WHERE review_status NOT IN ("approved","rejected")
')['cnt'] ?? 0);

// 未回答 Q&A：開放狀態且尚無任何回覆
$unansweredQa = (int)($db->fetchOne('
    SELECT COUNT(*) AS cnt FROM q_and_a qa
    WHERE qa.status != "closed"
      AND NOT EXISTS (
          SELECT 1 FROM qa_replies qr WHERE qr.qa_id = qa.qa_id
      )
')['cnt'] ?? 0);

$pending = [
    'reports'    => $pendingReports,
    'transfers'  => $pendingTransfers,
    'reviews'    => $pendingReviews,
    'unanswered_qa' => $unansweredQa,
];

// ── 5. 公告統計 ──────────────────────────────────────────────
$annRows = $db->fetchAll('
    SELECT
        COUNT(*)                                                      AS active,
        SUM(is_pinned = 1)                                            AS pinned,
        SUM(end_date IS NOT NULL AND end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)) AS expiring_soon
    FROM system_announcements
    WHERE (start_date IS NULL OR start_date <= NOW())
      AND (end_date IS NULL OR end_date >= NOW())
');
$a = $annRows[0] ?? [];

$announcements = [
    'active'        => (int)($a['active']        ?? 0),
    'pinned'        => (int)($a['pinned']        ?? 0),
    'expiring_soon' => (int)($a['expiring_soon'] ?? 0),
];

Helper::success('取得儀表板摘要成功', [
    'users'         => $users,
    'clubs'         => $clubs,
    'events'        => $events,
    'pending'       => $pending,
    'announcements' => $announcements,
    'generated_at'  => date('Y-m-d H:i:s'),
]);
