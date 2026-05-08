<?php
require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/config.php';

$eventNamePrefixes = ['US15-TS-', 'US22-PUB-', 'US22-LIST-', 'US22 活動 '];
$eventDescriptionNeedles = ['E2E 自動化建立活動：', 'Automated E2E event ', 'US22 活動內容'];
$seededUserEmails = ['admin@univ.edu', 'clubadmin@univ.edu', 'student@univ.edu'];
$seededFollowClubCodes = ['CSC001', '090'];
$seededEventNames = ['程式社期初說明會', '演算法工作坊', '羽球新生體驗日', '上學期舊活動（過期）'];
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
        deleteWhereIn($db, 'events', 'event_id', $eventIds);
    }

    // Only reset club pollution in full cleanup (global teardown) to avoid racing
    // with AR-28/AR-35 tests that are still verifying their updates mid-run.
    if ($fullCleanup) {
        cleanupAcceptanceStoryClubPollution($db);
    }

    $userStmt = $db->prepare('SELECT user_id, email FROM users WHERE email IN (?, ?, ?)');
    if ($userStmt === false) {
        throw new RuntimeException($db->error);
    }
    $userStmt->bind_param('sss', ...$seededUserEmails);
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
            deleteWhereIn($db, 'events', 'event_id', $seedEventIds);
        }

        $announcementIds = fetchColumnValues($db, 'system_announcements', 'title', 'announcement_id', $seededAnnouncementTitles);
        if (!empty($announcementIds)) {
            deleteWhereIn($db, 'system_announcements', 'announcement_id', $announcementIds);
        }

        $userStmt = $db->prepare('SELECT user_id, email FROM users WHERE email IN (?, ?, ?)');
        if ($userStmt === false) {
            throw new RuntimeException($db->error);
        }
        $userStmt->bind_param('sss', ...$seededUserEmails);
        $userStmt->execute();
        $userResult = $userStmt->get_result();
        $userIds = [];
        while ($row = $userResult->fetch_assoc()) {
            $userIds[(string)$row['email']] = (int)$row['user_id'];
        }
        $userStmt->close();

        $fullSeededUserIds = array_values(array_filter([
            $userIds['admin@univ.edu'] ?? null,
            $userIds['clubadmin@univ.edu'] ?? null,
            $userIds['student@univ.edu'] ?? null,
        ]));

        if (!empty($fullSeededUserIds)) {
            deleteWhereIn($db, 'notifications', 'user_id', $fullSeededUserIds);
            deleteWhereIn($db, 'club_followers', 'user_id', $fullSeededUserIds);
            deleteWhereIn($db, 'club_members', 'user_id', $fullSeededUserIds);
            deleteWhereIn($db, 'event_registrations', 'user_id', $fullSeededUserIds);
            if (tableExists($db, 'event_comments')) {
                deleteWhereIn($db, 'event_comments', 'user_id', $fullSeededUserIds);
            }
            deleteWhereIn($db, 'reviews', 'user_id', $fullSeededUserIds);
        }

        $clubIds = fetchColumnValues($db, 'clubs', 'club_code', 'club_id', ['090']);
        if (!empty($clubIds)) {
            deleteWhereIn($db, 'club_followers', 'club_id', $clubIds);
            deleteWhereIn($db, 'club_members', 'club_id', $clubIds);
            deleteWhereIn($db, 'events', 'club_id', $clubIds);
            deleteWhereIn($db, 'clubs', 'club_id', $clubIds);
        }

        if (!empty($fullSeededUserIds)) {
            deleteWhereIn($db, 'users', 'user_id', $fullSeededUserIds);
        }
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
