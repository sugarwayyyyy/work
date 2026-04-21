<?php
require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/config.php';

$eventPrefixes = ['US15-TS-', 'US22-PUB-', 'US22-LIST-'];
$seededUserEmails = ['admin@univ.edu', 'clubadmin@univ.edu', 'student@univ.edu'];
$seededFollowClubCodes = ['CSC001', '090'];
$seededEventNames = ['程式社期初說明會', '演算法工作坊', '羽球新生體驗日', '上學期舊活動（過期）'];
$seededAnnouncementTitles = ['社團博覽會公告', '平台維護通知'];
$fullCleanup = in_array('--full', $argv, true);

function fetchIdsByLike(mysqli $conn, string $table, string $column, array $prefixes): array {
    if (empty($prefixes)) {
        return [];
    }

    $conditions = [];
    $params = [];
    foreach ($prefixes as $prefix) {
        $conditions[] = "$column LIKE ?";
        $params[] = $prefix . '%';
    }

    $stmt = $conn->prepare('SELECT ' . $column . ' FROM ' . $table . ' WHERE ' . implode(' OR ', $conditions));
    if ($stmt === false) {
        throw new RuntimeException($conn->error);
    }

    $types = str_repeat('s', count($params));
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = (int)$row[$column];
    }
    $stmt->close();

    return $rows;
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

    $eventIds = fetchIdsByLike($db, 'events', 'event_id', $eventPrefixes);

    if (!empty($eventIds)) {
        deleteEventNotifications($db, $eventIds);
        deleteWhereIn($db, 'event_comments', 'event_id', $eventIds);
        deleteWhereIn($db, 'event_registrations', 'event_id', $eventIds);
        deleteWhereIn($db, 'collaborative_events', 'event_id', $eventIds);
        deleteWhereIn($db, 'event_tag_relations', 'event_id', $eventIds);
        deleteWhereIn($db, 'events', 'event_id', $eventIds);
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
            deleteWhereIn($db, 'event_comments', 'event_id', $seedEventIds);
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
            deleteWhereIn($db, 'event_comments', 'user_id', $fullSeededUserIds);
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
