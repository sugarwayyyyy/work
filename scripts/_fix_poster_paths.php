<?php
require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/config.php';
$db = Database::getInstance()->getConnection();

$stmt = $db->prepare(
    "UPDATE event_posters
     SET image_path = REPLACE(image_path, 'assets/uploads/demo_', 'assets/uploads/events/demo_')
     WHERE image_path LIKE 'assets/uploads/demo_%'"
);
$stmt->execute();
echo "✓ 更新 {$stmt->affected_rows} 筆 event_posters 路徑\n";
$stmt->close();
