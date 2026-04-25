<?php
require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/config.php';

try {
    $db = Database::getInstance()->getConnection();

    $sql = file_get_contents(__DIR__ . '/../database/seeds/test_accounts_and_story_data.sql');
    if ($sql === false) {
        throw new RuntimeException('Cannot read seed file');
    }

    if (!$db->multi_query($sql)) {
        throw new RuntimeException('multi_query failed: ' . $db->error);
    }

    do {
        if ($result = $db->store_result()) {
            $result->free();
        }
        if ($db->errno) {
            throw new RuntimeException($db->error);
        }
    } while ($db->more_results() && $db->next_result());

    echo "✓ E2E test data seeded\n";
} catch (Exception $e) {
    fwrite(STDERR, "✗ E2E seed failed: " . $e->getMessage() . "\n");
    exit(1);
}
