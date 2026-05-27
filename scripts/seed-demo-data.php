<?php
/**
 * seed-demo-data.php
 * 填充教授展示用豐富示範資料。
 *
 * 執行方式：
 *   php scripts/seed-demo-data.php
 *
 * 前置條件：
 *   - 已執行 php run_migration.php
 *   - 已執行 php scripts/seed-e2e-test-data.php（需要測試帳號與核心社團）
 */
require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/config.php';

try {
    $db = Database::getInstance()->getConnection();

    $sqlFile = __DIR__ . '/../database/seeds/demo_enrichment.sql';
    $sql = file_get_contents($sqlFile);
    if ($sql === false) {
        throw new RuntimeException('Cannot read demo seed file: ' . $sqlFile);
    }
    if (substr($sql, 0, 3) === "\xEF\xBB\xBF") { $sql = substr($sql, 3); } // strip UTF-8 BOM

    // 分兩段執行：Section 1-6 與 Section 7（Q&A）
    // multi_query 在純 INSERT 大檔案中 more_results() 會提早回 false，分段可避免此問題
    $splitMarker = '-- Section 7:';
    $splitPos = strpos($sql, $splitMarker);
    $parts = ($splitPos !== false)
        ? [substr($sql, 0, $splitPos), substr($sql, $splitPos)]
        : [$sql];

    $statementCount = 0;
    foreach ($parts as $part) {
        $part = trim($part);
        if ($part === '') {
            continue;
        }
        if (!$db->multi_query($part)) {
            throw new RuntimeException('multi_query failed: ' . $db->error);
        }
        do {
            $statementCount++;
            if ($result = $db->store_result()) {
                $result->free();
            }
            if ($db->errno) {
                throw new RuntimeException('SQL error at statement #' . $statementCount . ': ' . $db->error);
            }
        } while ($db->more_results() && $db->next_result());
    }

    echo "✓ Demo data seeded successfully ({$statementCount} statements executed)\n";
    echo "\n";
    echo "展示資料包含：\n";
    echo "  • 20 個社團完整資料（描述、開會時間、聯絡資訊）\n";
    echo "  • 5 個 Demo 評論者帳號（demo_reviewer1-5@demo.edu）\n";
    echo "  • 12 個展示活動（含海報圖片路徑）\n";
    echo "  • 4 則系統公告\n";
    echo "  • 10 筆社團評價（已核准）\n";
    echo "  • 8 則 Q&A 提問（跨 5 個社團，含官方回覆與有幫助票）\n";
    echo "\n";
    echo "提醒：請將 24 張海報圖片放到 frontend/assets/uploads/events/\n";
} catch (Exception $e) {
    fwrite(STDERR, "✗ Demo seed failed: " . $e->getMessage() . "\n");
    exit(1);
}
