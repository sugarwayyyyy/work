<?php
require_once(__DIR__ . '/backend/db.php');
require_once(__DIR__ . '/backend/config.php');

function executeSqlFile(mysqli $conn, string $sql): void {
    $trimmedSql = trim($sql);
    if ($trimmedSql === '') {
        return;
    }

    if (!$conn->multi_query($trimmedSql)) {
        throw new RuntimeException($conn->error);
    }

    do {
        if ($result = $conn->store_result()) {
            $result->free();
        }
    } while ($conn->more_results() && $conn->next_result());

    if ($conn->errno) {
        throw new RuntimeException($conn->error);
    }
}

try {
    $db = Database::getInstance()->getConnection();
    $files = [
        __DIR__ . '/database/migrations/2026_04_01_user_stories_core.sql',
        __DIR__ . '/database/migrations/2026_04_03_event_tags.sql',
        __DIR__ . '/database/migrations/2026_04_03_qa_urgency.sql',
        __DIR__ . '/database/migrations/2026_04_03_transfer_request_workflow.sql',
        __DIR__ . '/database/migrations/2026_04_04_event_poster_path.sql',
        __DIR__ . '/database/migrations/2026_04_04_qa_reply_helpful.sql',
        __DIR__ . '/database/migrations/2026_04_09_qa_reply_threads.sql',
        __DIR__ . '/database/migrations/2026_04_19_event_comments.sql',
        __DIR__ . '/database/migrations/2026_04_19_reviews_unique_user_club.sql',
        __DIR__ . '/database/migrations/2026_04_22_event_timeline_windows.sql'
    ];

    foreach ($files as $file) {
        if (!file_exists($file)) {
            throw new RuntimeException('Migration file not found: ' . $file);
        }

        $sql = file_get_contents($file);
        if ($sql === false) {
            throw new RuntimeException('Unable to read migration file: ' . $file);
        }

        executeSqlFile($db, $sql);
    }
    
    echo "✓ Migration completed successfully\n";
} catch (Exception $e) {
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
