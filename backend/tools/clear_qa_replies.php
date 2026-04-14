<?php

declare(strict_types=1);

require_once __DIR__ . '/../db.php';

$db = Database::getInstance()->getConnection();

if (!$db) {
    fwrite(STDERR, "資料庫連線失敗\n");
    exit(1);
}

$db->begin_transaction();

try {
    if (!$db->query('DELETE FROM qa_reply_helpful')) {
        throw new RuntimeException('刪除 qa_reply_helpful 失敗: ' . $db->error);
    }

    if (!$db->query('DELETE FROM qa_replies')) {
        throw new RuntimeException('刪除 qa_replies 失敗: ' . $db->error);
    }

    $countResult = $db->query('SELECT COUNT(*) AS total FROM qa_replies');
    if (!$countResult) {
        throw new RuntimeException('查詢 qa_replies 數量失敗: ' . $db->error);
    }

    $countRow = $countResult->fetch_assoc();
    $count = isset($countRow['total']) ? (int)$countRow['total'] : -1;

    $db->commit();
    echo "已清空回覆，qa_replies 目前筆數: {$count}\n";
} catch (Throwable $e) {
    $db->rollback();
    fwrite(STDERR, '清理失敗: ' . $e->getMessage() . "\n");
    exit(1);
}
