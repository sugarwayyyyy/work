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
 *
 * 圖片處理：
 *   - database/seeds/demo-images/ 有圖片 → 永遠複製到 uploads/（覆蓋舊版）
 *   - demo-images/ 無對應檔案 → 略過（不生成 placeholder）
 */
require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/config.php';

// -----------------------------------------------------------------------
// Section A. 複製 demo 圖片到 uploads/
//   - source（demo-images/）有圖 → 永遠複製，覆蓋 uploads/ 舊版
//   - source 沒有 → 略過（不生成 placeholder）
// -----------------------------------------------------------------------

$uploadDir = rtrim(UPLOAD_DIR, '/\\') . DIRECTORY_SEPARATOR;
$sourceDir = __DIR__ . '/../database/seeds/demo-images/';

$demoImages = [
    'demo_dance_show_1.jpg', 'demo_dance_show_2.jpg', 'demo_dance_show_3.jpg',
    'demo_dance_recruit_1.jpg', 'demo_dance_recruit_2.jpg',
    'demo_photo_outing_1.jpg', 'demo_photo_outing_2.jpg',
    'demo_photo_exhibition_1.jpg', 'demo_photo_exhibition_2.jpg', 'demo_photo_exhibition_3.jpg',
    'demo_music_concert_1.jpg', 'demo_music_concert_2.jpg', 'demo_music_concert_3.jpg',
    'demo_hiking_1.jpg', 'demo_hiking_2.jpg',
    'demo_martial_arts_1.jpg', 'demo_speech_1.jpg', 'demo_firstaid_1.jpg',
    'demo_boardgame_1.jpg', 'demo_boardgame_2.jpg',
    'demo_esports_1.jpg', 'demo_esports_2.jpg',
    'demo_startup_1.jpg', 'demo_startup_2.jpg',
];

$copiedCount  = 0;
$skippedCount = 0;
$failedCount  = 0;

foreach ($demoImages as $filename) {
    $sourcePath = $sourceDir . $filename;
    $destPath   = $uploadDir . $filename;

    if (!file_exists($sourcePath)) {
        // demo-images/ 沒有此檔（尚未 git lfs pull），略過
        $skippedCount++;
        continue;
    }

    if (copy($sourcePath, $destPath)) {
        $copiedCount++;
    } else {
        fwrite(STDERR, "⚠ 無法複製 {$filename}\n");
        $failedCount++;
    }
}

if ($copiedCount > 0) {
    echo "✓ 已複製 {$copiedCount} 張示範圖片到 uploads/\n";
}
if ($skippedCount > 0) {
    echo "⚠ {$skippedCount} 張圖片在 demo-images/ 中找不到，請執行 git lfs pull 後重新執行此腳本。\n";
}
if ($failedCount > 0) {
    echo "✗ {$failedCount} 張複製失敗，請確認 uploads/ 目錄權限。\n";
}

// -----------------------------------------------------------------------
// Section B. 執行 demo_enrichment.sql
// -----------------------------------------------------------------------

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
    echo "  • 24 張示範活動照片（" . ($copiedCount > 0 ? "已從 demo-images/ 複製" : "未複製，請執行 git lfs pull 後重新執行此腳本") . "）\n";
} catch (Exception $e) {
    fwrite(STDERR, "✗ Demo seed failed: " . $e->getMessage() . "\n");
    exit(1);
}
