<?php
require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/config.php';

$eventNamePrefixes = ['US15-TS-', 'US22-PUB-', 'US22-LIST-', 'US22 活動 '];
$eventDescriptionNeedles = ['E2E 自動化建立活動：', 'Automated E2E event ', 'US22 活動內容'];
$seededUserEmails = ['admin@univ.edu', 'clubadmin@univ.edu', 'student@univ.edu', 'student_ff@univ.edu', 'student_wk@univ.edu', 'caassist@univ.edu'];
$seededFollowClubCodes = ['CSC001', '090'];
$seededEventNames = ['程式社期初說明會', '演算法工作坊', '羽球新生體驗日', '上學期舊活動（過期）', '健言社公開演講賽'];
$seededAnnouncementTitles = ['社團博覽會公告', '平台維護通知'];
$fullCleanup = in_array('--full', $argv, true);

function fetchIdsByLike(mysqli $conn, string $table, string $matchColumn, string $returnColumn, array $prefixes): array {
    if (empty($prefixes)) {
        return [];
    }

    $conditions = [];
    $params = [];
    foreach ($prefixes as $prefix) {
        $conditions[] = "$matchColumn LIKE ?";
        $params[] = $prefix . '%';
    }

    $stmt = $conn->prepare('SELECT ' . $returnColumn . ' FROM ' . $table . ' WHERE ' . implode(' OR ', $conditions));
    if ($stmt === false) {
        throw new RuntimeException($conn->error);
    }

    $types = str_repeat('s', count($params));
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = (int)$row[$returnColumn];
    }
    $stmt->close();

    return $rows;
}

function fetchEventIdsByDescriptionNeedles(mysqli $conn, array $needles): array {
    $normalized = array_values(array_filter(array_map(static function ($needle) {
        return trim((string)$needle);
    }, $needles)));
    if (empty($normalized)) {
        return [];
    }

    $conditions = [];
    $params = [];
    foreach ($normalized as $needle) {
        $conditions[] = 'description LIKE ?';
        $params[] = '%' . $needle . '%';
    }

    $stmt = $conn->prepare('SELECT event_id FROM events WHERE ' . implode(' OR ', $conditions));
    if ($stmt === false) {
        throw new RuntimeException($conn->error);
    }

    $types = str_repeat('s', count($params));
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = (int)$row['event_id'];
    }
    $stmt->close();

    return $rows;
}

function cleanupAcceptanceStoryClubPollution(mysqli $conn): void {
    $fallbackName = '程式社';
    $fallbackDescription = '介紹本學期課程與專題方向';
    $stmt = $conn->prepare(
        'UPDATE clubs
         SET club_name = ?,
             description = ?,
             last_updated = NOW()
         WHERE club_code = "CSC001"
           AND (
             club_name LIKE "US21 Valid %"
             OR club_name LIKE "US21 Invalid %"
             OR description LIKE "US21 更新內文%"
             OR description LIKE "%[AR-28-A-%"
             OR description LIKE "%[AR-35-%"
           )'
    );
    if ($stmt === false) {
        throw new RuntimeException($conn->error);
    }
    $stmt->bind_param('ss', $fallbackName, $fallbackDescription);
    $stmt->execute();
    $stmt->close();

    // TST001 is used by webkit AR-28; reset description if polluted
    $fallbackNameTst = '測試社';
    $fallbackDescriptionTst = 'E2E 測試用社團';
    $stmtTst = $conn->prepare(
        'UPDATE clubs
         SET club_name = ?,
             description = ?,
             last_updated = NOW()
         WHERE club_code = "TST001"
           AND description LIKE "%[AR-28-%"'
    );
    if ($stmtTst === false) {
        throw new RuntimeException($conn->error);
    }
    $stmtTst->bind_param('ss', $fallbackNameTst, $fallbackDescriptionTst);
    $stmtTst->execute();
    $stmtTst->close();
}

function deleteWhereIn(mysqli $conn, string $table, string $column, array $ids): int {
    if (empty($ids)) {
        return 0;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $conn->prepare("DELETE FROM {$table} WHERE {$column} IN ({$placeholders})");
    if ($stmt === false) {
        throw new RuntimeException($conn->error);
    }

    $types = str_repeat('i', count($ids));
    $stmt->bind_param($types, ...$ids);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    return $affected;
}

function tableExists(mysqli $conn, string $table): bool {
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

function deleteEventNotifications(mysqli $conn, array $eventIds): int {
    if (empty($eventIds)) {
        return 0;
    }

    $placeholders = implode(',', array_fill(0, count($eventIds), '?'));
    $stmt = $conn->prepare("DELETE FROM notifications WHERE related_type = 'event' AND related_id IN ({$placeholders})");
    if ($stmt === false) {
        throw new RuntimeException($conn->error);
    }

    $types = str_repeat('i', count($eventIds));
    $stmt->bind_param($types, ...$eventIds);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    return $affected;
}

function fetchColumnValues(mysqli $conn, string $table, string $matchColumn, string $returnColumn, array $values): array {
    if (empty($values)) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($values), '?'));
    $stmt = $conn->prepare('SELECT ' . $returnColumn . ' AS value FROM ' . $table . ' WHERE ' . $matchColumn . ' IN (' . $placeholders . ')');
    if ($stmt === false) {
        throw new RuntimeException($conn->error);
    }

    $types = str_repeat('s', count($values));
    $stmt->bind_param($types, ...$values);
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row['value'];
    }
    $stmt->close();

    return $rows;
}

try {
    $db = Database::getInstance()->getConnection();
    $db->begin_transaction();

    $eventIds = array_values(array_unique(array_merge(
        fetchIdsByLike($db, 'events', 'event_name', 'event_id', $eventNamePrefixes),
        fetchEventIdsByDescriptionNeedles($db, $eventDescriptionNeedles)
    )));

    if (!empty($eventIds)) {
        deleteEventNotifications($db, $eventIds);
        if (tableExists($db, 'event_comments')) {
            deleteWhereIn($db, 'event_comments', 'event_id', $eventIds);
        }
        deleteWhereIn($db, 'event_registrations', 'event_id', $eventIds);
        deleteWhereIn($db, 'collaborative_events', 'event_id', $eventIds);
        deleteWhereIn($db, 'event_tag_relations', 'event_id', $eventIds);
        // reviews.event_attended_id 參照 events 但無 ON DELETE CASCADE，需先清除以免 FK 阻擋刪除
        deleteWhereIn($db, 'reviews', 'event_attended_id', $eventIds);
        deleteWhereIn($db, 'events', 'event_id', $eventIds);
    }

    // Only reset club pollution in full cleanup (global teardown) to avoid racing
    // with AR-28/AR-35 tests that are still verifying their updates mid-run.
    if ($fullCleanup) {
        cleanupAcceptanceStoryClubPollution($db);
    }

    $userPlaceholders = implode(',', array_fill(0, count($seededUserEmails), '?'));
    $userStmt = $db->prepare("SELECT user_id, email FROM users WHERE email IN ({$userPlaceholders})");
    if ($userStmt === false) {
        throw new RuntimeException($db->error);
    }
    $userStmt->bind_param(str_repeat('s', count($seededUserEmails)), ...$seededUserEmails);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    $userIds = [];
    while ($row = $userResult->fetch_assoc()) {
        $userIds[(string)$row['email']] = (int)$row['user_id'];
    }
    $userStmt->close();

    $studentId = $userIds['student@univ.edu'] ?? null;
    if ($studentId) {
        $clubPlaceholders = implode(',', array_fill(0, count($seededFollowClubCodes), '?'));
        $clubStmt = $db->prepare('SELECT club_id, club_code FROM clubs WHERE club_code IN (' . $clubPlaceholders . ')');
        if ($clubStmt === false) {
            throw new RuntimeException($db->error);
        }
        $clubStmt->bind_param(str_repeat('s', count($seededFollowClubCodes)), ...$seededFollowClubCodes);
        $clubStmt->execute();
        $clubResult = $clubStmt->get_result();
        $clubIds = [];
        while ($row = $clubResult->fetch_assoc()) {
            $clubIds[(string)$row['club_code']] = (int)$row['club_id'];
        }
        $clubStmt->close();

        dbDelete('club_followers', 'user_id = ?', [$studentId]);

        foreach ($seededFollowClubCodes as $clubCode) {
            $clubId = $clubIds[$clubCode] ?? null;
            if ($clubId) {
                dbInsert('club_followers', [
                    'club_id' => $clubId,
                    'user_id' => $studentId,
                    'is_subscribing_notifications' => true
                ]);
            }
        }
    }

    if ($fullCleanup) {
        $seedEventIds = fetchColumnValues($db, 'events', 'event_name', 'event_id', $seededEventNames);
        if (!empty($seedEventIds)) {
            deleteEventNotifications($db, $seedEventIds);
            if (tableExists($db, 'event_comments')) {
                deleteWhereIn($db, 'event_comments', 'event_id', $seedEventIds);
            }
            deleteWhereIn($db, 'event_registrations', 'event_id', $seedEventIds);
            deleteWhereIn($db, 'collaborative_events', 'event_id', $seedEventIds);
            deleteWhereIn($db, 'event_tag_relations', 'event_id', $seedEventIds);
            // reviews.event_attended_id 參照 events 但無 ON DELETE CASCADE，需先清除以免 FK 阻擋刪除
            deleteWhereIn($db, 'reviews', 'event_attended_id', $seedEventIds);
            deleteWhereIn($db, 'events', 'event_id', $seedEventIds);
        }

        $announcementIds = fetchColumnValues($db, 'system_announcements', 'title', 'announcement_id', $seededAnnouncementTitles);
        if (!empty($announcementIds)) {
            deleteWhereIn($db, 'system_announcements', 'announcement_id', $announcementIds);
        }

        $userPlaceholders2 = implode(',', array_fill(0, count($seededUserEmails), '?'));
        $userStmt = $db->prepare("SELECT user_id, email FROM users WHERE email IN ({$userPlaceholders2})");
        if ($userStmt === false) {
            throw new RuntimeException($db->error);
        }
        $userStmt->bind_param(str_repeat('s', count($seededUserEmails)), ...$seededUserEmails);
        $userStmt->execute();
        $userResult = $userStmt->get_result();
        $userIds = [];
        while ($row = $userResult->fetch_assoc()) {
            $userIds[(string)$row['email']] = (int)$row['user_id'];
        }
        $userStmt->close();

        $fullSeededUserIds = array_values(array_filter(array_values($userIds)));

        if (!empty($fullSeededUserIds)) {
            deleteWhereIn($db, 'notifications', 'user_id', $fullSeededUserIds);
            deleteWhereIn($db, 'club_followers', 'user_id', $fullSeededUserIds);
            deleteWhereIn($db, 'club_members', 'user_id', $fullSeededUserIds);
            deleteWhereIn($db, 'event_registrations', 'user_id', $fullSeededUserIds);
            if (tableExists($db, 'event_comments')) {
                deleteWhereIn($db, 'event_comments', 'user_id', $fullSeededUserIds);
            }
            deleteWhereIn($db, 'reviews', 'user_id', $fullSeededUserIds);
            // messaging tables
            if (tableExists($db, 'message_reactions')) {
                $msgIds = fetchColumnValues($db, 'private_messages', 'sender_id', 'message_id', array_map('strval', $fullSeededUserIds));
                $msgIds2 = fetchColumnValues($db, 'private_messages', 'receiver_id', 'message_id', array_map('strval', $fullSeededUserIds));
                $allMsgIds = array_values(array_unique(array_merge($msgIds, $msgIds2)));
                if (!empty($allMsgIds)) {
                    deleteWhereIn($db, 'message_reactions', 'message_id', $allMsgIds);
                }
            }
            if (tableExists($db, 'private_messages')) {
                deleteWhereIn($db, 'private_messages', 'sender_id', $fullSeededUserIds);
                deleteWhereIn($db, 'private_messages', 'receiver_id', $fullSeededUserIds);
            }
            if (tableExists($db, 'note_messages')) {
                deleteWhereIn($db, 'note_messages', 'user_id', $fullSeededUserIds);
            }
            if (tableExists($db, 'bot_messages')) {
                deleteWhereIn($db, 'bot_messages', 'user_id', $fullSeededUserIds);
            }
            if (tableExists($db, 'club_join_applications')) {
                deleteWhereIn($db, 'club_join_applications', 'user_id', $fullSeededUserIds);
            }
            // 類別助教指派 + 幹部操作紀錄（新功能 E2E 殘留清理）
            if (tableExists($db, 'category_assistant_assignments')) {
                deleteWhereIn($db, 'category_assistant_assignments', 'user_id', $fullSeededUserIds);
                $idsList = implode(',', array_map('intval', $fullSeededUserIds));
                $db->query("UPDATE users SET role = 'student' WHERE user_id IN ($idsList) AND role = 'category_assistant'");
            }
            if (tableExists($db, 'club_operation_logs')) {
                deleteWhereIn($db, 'club_operation_logs', 'actor_user_id', $fullSeededUserIds);
            }
        }

        // 不刪除 club 090（羽球社）和測試帳號，由 teardown 重 seed 還原基礎狀態
    }

    $db->commit();
    echo $fullCleanup ? "✓ E2E full cleanup completed\n" : "✓ E2E test data cleanup completed\n";
} catch (Exception $e) {
    if (isset($db) && $db instanceof mysqli) {
        $db->rollback();
    }
    fwrite(STDERR, "✗ E2E test data cleanup failed: " . $e->getMessage() . "\n");
    exit(1);
}
