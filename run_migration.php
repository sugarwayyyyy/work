<?php
require_once(__DIR__ . '/backend/db.php');
require_once(__DIR__ . '/backend/config.php');

try {
    $db = Database::getInstance();
    $files = [
        __DIR__ . '/database/migrations/2026_04_03_qa_urgency.sql',
        __DIR__ . '/database/migrations/2026_04_03_event_tags.sql',
        __DIR__ . '/database/migrations/2026_04_04_qa_reply_helpful.sql'
    ];

    foreach ($files as $file) {
        $sql = file_get_contents($file);
        $statements = array_filter(array_map('trim', explode(';', $sql)));

        foreach ($statements as $statement) {
            if (!empty($statement)) {
                $db->query($statement);
            }
        }
    }
    
    echo "✓ Migration completed successfully\n";
} catch (Exception $e) {
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
