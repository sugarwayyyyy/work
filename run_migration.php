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
        __DIR__ . '/database/migrations/2026_04_28_event_time_range.sql',
        __DIR__ . '/database/migrations/2026_05_10_club_fee_semester.sql',
        __DIR__ . '/database/migrations/2026_05_11_remove_categories_religion_misc.sql',
        __DIR__ . '/database/migrations/2026_05_21_google_oauth.sql',
        __DIR__ . '/database/migrations/2026_05_22_club_fee_per_session.sql',
        __DIR__ . '/database/migrations/2026_05_22_club_member_fee_paid.sql',
        __DIR__ . '/database/migrations/2026_05_22_club_member_join.sql',
        __DIR__ . '/database/migrations/2026_05_23_private_messages.sql',
        __DIR__ . '/database/migrations/2026_05_23_bot_messages.sql',
        __DIR__ . '/database/migrations/2026_05_23_club_join_applications.sql',
        __DIR__ . '/database/migrations/2026_05_23_user_notes.sql',
        __DIR__ . '/database/migrations/2026_05_24_event_posters.sql',
        __DIR__ . '/database/migrations/2026_05_24_message_reactions.sql',
        __DIR__ . '/database/migrations/2026_05_24_note_messages.sql',
        __DIR__ . '/database/migrations/2026_05_24_note_messages_recall.sql',
        __DIR__ . '/database/migrations/2026_05_24_private_message_recall.sql',
        __DIR__ . '/database/migrations/2026_05_24_private_message_reply.sql',
        __DIR__ . '/database/migrations/2026_05_26_clubs_enrich_data.sql',
        __DIR__ . '/database/migrations/2026_05_26_login_rate_limiting.sql',
        __DIR__ . '/database/migrations/2026_05_29_fix_join_application_fee_type.sql',
        __DIR__ . '/database/migrations/2026_05_29_cancel_kicked_member_applications.sql',
        __DIR__ . '/database/migrations/2026_05_29_join_code_expiry.sql',
        __DIR__ . '/database/migrations/2026_05_30_feedback.sql',
        __DIR__ . '/database/migrations/2026_05_30_message_reactions_emoji_bin_collation.sql',
        __DIR__ . '/database/migrations/2026_05_30_message_reactions_unique_per_user.sql',
        __DIR__ . '/database/migrations/2026_06_03_add_event_venue_applications.sql',
        __DIR__ . '/database/migrations/2026_06_04_category_assistant.sql',
        __DIR__ . '/database/migrations/2026_06_04_club_operation_logs.sql',
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
