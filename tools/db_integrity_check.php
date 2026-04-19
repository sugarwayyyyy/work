<?php

declare(strict_types=1);

$dsn = 'mysql:host=localhost;dbname=club_platform;charset=utf8mb4';
$user = 'root';
$pass = '12345678';

$checks = [
    'dup_club_followers' => "SELECT COUNT(*) FROM (SELECT club_id,user_id,COUNT(*) n FROM club_followers GROUP BY club_id,user_id HAVING n>1) t",
    'dup_event_registrations' => "SELECT COUNT(*) FROM (SELECT event_id,user_id,COUNT(*) n FROM event_registrations GROUP BY event_id,user_id HAVING n>1) t",
    'dup_reviews_same_user_club' => "SELECT COUNT(*) FROM (SELECT club_id,user_id,COUNT(*) n FROM reviews GROUP BY club_id,user_id HAVING n>1) t",
    'dup_collaborative_events' => "SELECT COUNT(*) FROM (SELECT event_id,created_by_club_id,participated_club_id,COUNT(*) n FROM collaborative_events GROUP BY event_id,created_by_club_id,participated_club_id HAVING n>1) t",
    'orphan_club_members_club' => "SELECT COUNT(*) FROM club_members cm LEFT JOIN clubs c ON c.club_id=cm.club_id WHERE c.club_id IS NULL",
    'orphan_club_members_user' => "SELECT COUNT(*) FROM club_members cm LEFT JOIN users u ON u.user_id=cm.user_id WHERE u.user_id IS NULL",
    'orphan_followers_club' => "SELECT COUNT(*) FROM club_followers f LEFT JOIN clubs c ON c.club_id=f.club_id WHERE c.club_id IS NULL",
    'orphan_followers_user' => "SELECT COUNT(*) FROM club_followers f LEFT JOIN users u ON u.user_id=f.user_id WHERE u.user_id IS NULL",
    'orphan_events_club' => "SELECT COUNT(*) FROM events e LEFT JOIN clubs c ON c.club_id=e.club_id WHERE c.club_id IS NULL",
    'orphan_registrations_event' => "SELECT COUNT(*) FROM event_registrations r LEFT JOIN events e ON e.event_id=r.event_id WHERE e.event_id IS NULL",
    'orphan_registrations_user' => "SELECT COUNT(*) FROM event_registrations r LEFT JOIN users u ON u.user_id=r.user_id WHERE u.user_id IS NULL",
    'orphan_reviews_club' => "SELECT COUNT(*) FROM reviews r LEFT JOIN clubs c ON c.club_id=r.club_id WHERE c.club_id IS NULL",
    'orphan_reviews_user' => "SELECT COUNT(*) FROM reviews r LEFT JOIN users u ON u.user_id=r.user_id WHERE u.user_id IS NULL",
    'orphan_reviews_event' => "SELECT COUNT(*) FROM reviews r LEFT JOIN events e ON e.event_id=r.event_attended_id WHERE r.event_attended_id IS NOT NULL AND e.event_id IS NULL",
];

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    echo "DB integrity checks (club_platform)\n";
    echo str_repeat('-', 48) . "\n";

    $hasIssue = false;
    foreach ($checks as $name => $sql) {
        $count = (int)$pdo->query($sql)->fetchColumn();
        printf("%-32s : %d\n", $name, $count);
        if ($count > 0) {
            $hasIssue = true;
        }
    }

    echo str_repeat('-', 48) . "\n";
    if ($hasIssue) {
        echo "RESULT: ISSUES_FOUND\n";
        exit(2);
    }

    echo "RESULT: CLEAN\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'DB integrity check failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
