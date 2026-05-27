<?php
/**
 * cleanup-demo-data.php
 * 清除 seed-demo-data.php 插入的展示資料。
 * 不刪除社團本體，不還原社團的 description 與 meeting 欄位。
 *
 * 執行方式：
 *   php scripts/cleanup-demo-data.php
 */
require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/config.php';

$demoEventNames = [
    '熱舞社春季期末公演',
    '熱舞社新生招募說明會',
    '攝影社春季戶外外拍活動',
    '2026 黑白攝影聯展',
    '2026 春季國樂聯合音樂會',
    '登山社春季郊山健行：象山一日遊',
    '國術社招新體驗日',
    '2026 校際即席演講邀請賽',
    'CPR 急救技能認證訓練課程',
    '春季桌遊馬拉松 12 小時不間斷',
    'FPS 電競校內邀請賽（CS2）',
    'Startup Weekend 創業挑戰工作坊',
];

$demoAnnouncementTitles = [
    '🎪 2026 春季社團博覽會盛大登場！',
    '⚠️ 系統維護公告',
    '📬 私訊功能正式上線',
    '📋 學期社費繳納期限提醒',
];

$demoReviewerEmails = [
    'demo_reviewer1@demo.edu',
    'demo_reviewer2@demo.edu',
    'demo_reviewer3@demo.edu',
    'demo_reviewer4@demo.edu',
    'demo_reviewer5@demo.edu',
];

$demoQaTitles = [
    'Python 入門後該如何繼續進階學習？',
    '期末專題要怎麼找到合適的隊友？',
    '完全沒舞蹈基礎可以加入嗎？',
    '每週需要練習幾次？對課業影響大嗎？',
    '入社需要自備相機嗎？手機可以嗎？',
    '新生需要什麼體能程度才能參加行程？',
    '社員有機會參加校外演講或辯論比賽嗎？',
    '社費包含哪些費用？需要自備桌遊嗎？',
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function fetchIds(mysqli $conn, string $table, string $col, array $values): array
{
    if (empty($values)) {
        return [];
    }
    $ph = implode(',', array_fill(0, count($values), '?'));
    $stmt = $conn->prepare("SELECT {$col} AS id FROM {$table} WHERE {$col} IN ({$ph})");
    if ($stmt === false) {
        throw new RuntimeException($conn->error);
    }
    $stmt->bind_param(str_repeat('i', count($values)), ...$values);
    $stmt->execute();
    $rows = [];
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $rows[] = (int)$row['id'];
    }
    $stmt->close();
    return $rows;
}

function fetchIdsByValues(mysqli $conn, string $table, string $matchCol, string $returnCol, array $values, string $type = 's'): array
{
    if (empty($values)) {
        return [];
    }
    $ph = implode(',', array_fill(0, count($values), '?'));
    $stmt = $conn->prepare("SELECT {$returnCol} FROM {$table} WHERE {$matchCol} IN ({$ph})");
    if ($stmt === false) {
        throw new RuntimeException($conn->error);
    }
    $stmt->bind_param(str_repeat($type, count($values)), ...$values);
    $stmt->execute();
    $rows = [];
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row[$returnCol];
    }
    $stmt->close();
    return $rows;
}

function deleteWhereIn(mysqli $conn, string $table, string $col, array $ids, string $type = 'i'): int
{
    if (empty($ids)) {
        return 0;
    }
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $conn->prepare("DELETE FROM {$table} WHERE {$col} IN ({$ph})");
    if ($stmt === false) {
        throw new RuntimeException($conn->error);
    }
    $stmt->bind_param(str_repeat($type, count($ids)), ...$ids);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();
    return $affected;
}

function tableExists(mysqli $conn, string $table): bool
{
    $stmt = $conn->prepare(
        'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1'
    );
    if ($stmt === false) {
        return false;
    }
    $stmt->bind_param('s', $table);
    $stmt->execute();
    $exists = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    return $exists;
}

// ─── main ─────────────────────────────────────────────────────────────────────

try {
    $db = Database::getInstance()->getConnection();
    $db->begin_transaction();

    $totals = [];

    // 1. Demo 活動 ─────────────────────────────────────────────────────────────
    $ph = implode(',', array_fill(0, count($demoEventNames), '?'));
    $stmt = $db->prepare("SELECT event_id FROM events WHERE event_name IN ({$ph})");
    if ($stmt === false) {
        throw new RuntimeException($db->error);
    }
    $stmt->bind_param(str_repeat('s', count($demoEventNames)), ...$demoEventNames);
    $stmt->execute();
    $result = $stmt->get_result();
    $eventIds = [];
    while ($row = $result->fetch_assoc()) {
        $eventIds[] = (int)$row['event_id'];
    }
    $stmt->close();

    if (!empty($eventIds)) {
        // notifications
        $ph2 = implode(',', array_fill(0, count($eventIds), '?'));
        $nStmt = $db->prepare("DELETE FROM notifications WHERE related_type = 'event' AND related_id IN ({$ph2})");
        if ($nStmt === false) {
            throw new RuntimeException($db->error);
        }
        $nStmt->bind_param(str_repeat('i', count($eventIds)), ...$eventIds);
        $nStmt->execute();
        $totals['notifications'] = $nStmt->affected_rows;
        $nStmt->close();

        if (tableExists($db, 'event_comments')) {
            $totals['event_comments'] = deleteWhereIn($db, 'event_comments', 'event_id', $eventIds);
        }
        $totals['event_registrations'] = deleteWhereIn($db, 'event_registrations', 'event_id', $eventIds);
        $totals['collaborative_events'] = deleteWhereIn($db, 'collaborative_events', 'event_id', $eventIds);
        $totals['event_tag_relations'] = deleteWhereIn($db, 'event_tag_relations', 'event_id', $eventIds);
        if (tableExists($db, 'event_posters')) {
            $totals['event_posters'] = deleteWhereIn($db, 'event_posters', 'event_id', $eventIds);
        }
        $totals['events'] = deleteWhereIn($db, 'events', 'event_id', $eventIds);
    }

    // 2. Demo 公告 ──────────────────────────────────────────────────────────────
    $annIds = fetchIdsByValues($db, 'system_announcements', 'title', 'announcement_id', $demoAnnouncementTitles);
    if (!empty($annIds)) {
        $totals['system_announcements'] = deleteWhereIn($db, 'system_announcements', 'announcement_id', $annIds);
    }

    // 3. Demo Q&A 資料 ──────────────────────────────────────────────────────────
    $qaIds = fetchIdsByValues($db, 'q_and_a', 'question_title', 'qa_id', $demoQaTitles);
    $qaIds = array_map('intval', $qaIds);
    if (!empty($qaIds)) {
        // 先取得所有相關的 reply_id
        $ph3 = implode(',', array_fill(0, count($qaIds), '?'));
        $rStmt = $db->prepare("SELECT reply_id FROM qa_replies WHERE qa_id IN ({$ph3})");
        if ($rStmt === false) {
            throw new RuntimeException($db->error);
        }
        $rStmt->bind_param(str_repeat('i', count($qaIds)), ...$qaIds);
        $rStmt->execute();
        $rResult = $rStmt->get_result();
        $replyIds = [];
        while ($rRow = $rResult->fetch_assoc()) {
            $replyIds[] = (int)$rRow['reply_id'];
        }
        $rStmt->close();

        if (!empty($replyIds)) {
            $totals['qa_reply_helpful'] = deleteWhereIn($db, 'qa_reply_helpful', 'reply_id', $replyIds);
        }
        $totals['qa_tag_relations'] = deleteWhereIn($db, 'qa_tag_relations', 'qa_id', $qaIds);
        $totals['qa_replies']        = deleteWhereIn($db, 'qa_replies', 'qa_id', $qaIds);
        $totals['q_and_a']           = deleteWhereIn($db, 'q_and_a', 'qa_id', $qaIds);
    }

    // 4. Demo 評論者帳號的評價 ──────────────────────────────────────────────────
    $reviewerIds = fetchIdsByValues($db, 'users', 'email', 'user_id', $demoReviewerEmails);
    if (!empty($reviewerIds)) {
        $intIds = array_map('intval', $reviewerIds);
        $totals['reviews'] = deleteWhereIn($db, 'reviews', 'user_id', $intIds);

        // 5. Demo 評論者帳號本身 ────────────────────────────────────────────────
        $totals['users'] = deleteWhereIn($db, 'users', 'user_id', $intIds);
    }

    $db->commit();

    echo "✓ Demo data cleanup completed\n\n";
    $labels = [
        'events'              => '活動',
        'event_posters'       => '活動海報',
        'event_registrations' => '活動報名',
        'event_tag_relations' => '活動標籤',
        'event_comments'      => '活動評論',
        'collaborative_events'=> '協辦紀錄',
        'notifications'       => '通知',
        'system_announcements'=> '系統公告',
        'reviews'             => '社團評價',
        'qa_reply_helpful'    => 'Q&A 有幫助票',
        'qa_tag_relations'    => 'Q&A 標籤',
        'qa_replies'          => 'Q&A 回覆',
        'q_and_a'             => 'Q&A 提問',
        'users'               => 'Demo 帳號',
    ];
    foreach ($labels as $key => $label) {
        if (isset($totals[$key]) && $totals[$key] > 0) {
            echo "  - 刪除 {$label}：{$totals[$key]} 筆\n";
        }
    }
} catch (Exception $e) {
    if (isset($db) && $db instanceof mysqli) {
        $db->rollback();
    }
    fwrite(STDERR, "✗ Demo cleanup failed: " . $e->getMessage() . "\n");
    exit(1);
}
