<?php

declare(strict_types=1);

$apply = in_array('--apply', $argv, true);

$pdo = new PDO(
    'mysql:host=localhost;dbname=club_platform;charset=utf8mb4',
    'root',
    '12345678',
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]
);

$dupSql = "
SELECT
  club_id,
  user_id,
  COUNT(*) AS cnt,
  GROUP_CONCAT(review_id ORDER BY COALESCE(updated_at, created_at) DESC, review_id DESC) AS review_ids
FROM reviews
GROUP BY club_id, user_id
HAVING COUNT(*) > 1
";

$dups = $pdo->query($dupSql)->fetchAll();

echo "Duplicate review groups: " . count($dups) . PHP_EOL;
foreach ($dups as $row) {
    echo sprintf(
        "- club_id=%d user_id=%d cnt=%d ids=%s\n",
        (int)$row['club_id'],
        (int)$row['user_id'],
        (int)$row['cnt'],
        (string)$row['review_ids']
    );
}

if (!$apply) {
    echo "\nDry run only. Use --apply to clean duplicates and add unique index.\n";
    exit(0);
}

$pdo->beginTransaction();
try {
    // Keep newest row per (club_id,user_id), delete older ones.
    $deleteSql = "
    DELETE r
    FROM reviews r
    JOIN reviews keep
      ON r.club_id = keep.club_id
     AND r.user_id = keep.user_id
     AND (
        COALESCE(r.updated_at, r.created_at) < COALESCE(keep.updated_at, keep.created_at)
        OR (
          COALESCE(r.updated_at, r.created_at) = COALESCE(keep.updated_at, keep.created_at)
          AND r.review_id < keep.review_id
        )
     )
    ";
    $deleted = $pdo->exec($deleteSql);
    echo "Deleted duplicate review rows: " . (int)$deleted . PHP_EOL;

    $indexExists = (int)$pdo->query("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name='reviews' AND index_name='uniq_reviews_club_user'")->fetchColumn();
    if ($indexExists === 0) {
        $pdo->exec("ALTER TABLE reviews ADD CONSTRAINT uniq_reviews_club_user UNIQUE (club_id, user_id)");
        echo "Added unique constraint: uniq_reviews_club_user (club_id, user_id)" . PHP_EOL;
    } else {
        echo "Unique constraint already exists: uniq_reviews_club_user" . PHP_EOL;
    }

    $pdo->commit();
    echo "Apply completed.\n";
} catch (Throwable $e) {
    $pdo->rollBack();
    fwrite(STDERR, "Apply failed: " . $e->getMessage() . PHP_EOL);
    exit(1);
}
