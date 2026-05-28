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
 * 此腳本會自動在 frontend/assets/uploads/ 生成 placeholder 示範圖片（若尚未存在），
 * 不需手動複製圖片檔案，可直接在任何環境部署。
 */
require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/config.php';

// -----------------------------------------------------------------------
// Section A. 確保 demo 圖片存在
//   優先順序：
//   1. database/seeds/demo-images/ 有真實圖片 → 複製到 uploads/
//   2. 否則用 PHP GD 生成 placeholder（確保 demo 頁面不破圖）
// -----------------------------------------------------------------------

$uploadDir   = rtrim(UPLOAD_DIR, '/\\') . DIRECTORY_SEPARATOR;
$sourceDir   = __DIR__ . '/../database/seeds/demo-images/';

// 每張 demo 圖片的背景色 (RGB hex) 與標題
$demoImages = [
    'demo_dance_show_1.jpg'        => [0x6C3483, '熱舞社期末公演 1'],
    'demo_dance_show_2.jpg'        => [0x7D3C98, '熱舞社期末公演 2'],
    'demo_dance_show_3.jpg'        => [0x8E44AD, '熱舞社期末公演 3'],
    'demo_dance_recruit_1.jpg'     => [0x1A5276, '熱舞社招募 1'],
    'demo_dance_recruit_2.jpg'     => [0x21618C, '熱舞社招募 2'],
    'demo_photo_outing_1.jpg'      => [0x0E6655, '攝影社外拍 1'],
    'demo_photo_outing_2.jpg'      => [0x148F77, '攝影社外拍 2'],
    'demo_photo_exhibition_1.jpg'  => [0x1E8449, '攝影聯展 1'],
    'demo_photo_exhibition_2.jpg'  => [0x27AE60, '攝影聯展 2'],
    'demo_photo_exhibition_3.jpg'  => [0x2ECC71, '攝影聯展 3'],
    'demo_music_concert_1.jpg'     => [0x7E5109, '國樂音樂會 1'],
    'demo_music_concert_2.jpg'     => [0x9A6108, '國樂音樂會 2'],
    'demo_music_concert_3.jpg'     => [0xB7950B, '國樂音樂會 3'],
    'demo_hiking_1.jpg'            => [0x1A5276, '登山社郊山 1'],
    'demo_hiking_2.jpg'            => [0x154360, '登山社郊山 2'],
    'demo_martial_arts_1.jpg'      => [0x922B21, '國術社招新'],
    'demo_speech_1.jpg'            => [0x784212, '即席演講邀請賽'],
    'demo_firstaid_1.jpg'          => [0xC0392B, 'CPR 急救訓練'],
    'demo_boardgame_1.jpg'         => [0x117A65, '桌遊馬拉松 1'],
    'demo_boardgame_2.jpg'         => [0x0E6655, '桌遊馬拉松 2'],
    'demo_esports_1.jpg'           => [0x1B2631, 'FPS 電競邀請賽 1'],
    'demo_esports_2.jpg'           => [0x212F3D, 'FPS 電競邀請賽 2'],
    'demo_startup_1.jpg'           => [0x2C3E50, '創業工作坊 1'],
    'demo_startup_2.jpg'           => [0x1C2833, '創業工作坊 2'],
];

$copiedCount    = 0;
$generatedCount = 0;
$skippedCount   = 0;
$gdAvailable    = function_exists('imagecreatetruecolor') && function_exists('imagejpeg');

foreach ($demoImages as $filename => [$hexColor, $label]) {
    $destPath   = $uploadDir . $filename;
    $sourcePath = $sourceDir . $filename;

    if (file_exists($destPath)) {
        $skippedCount++;
        continue;
    }

    // 優先：從 demo-images/ 複製真實圖片
    if (file_exists($sourcePath)) {
        if (!copy($sourcePath, $destPath)) {
            fwrite(STDERR, "⚠ 無法複製 {$filename}\n");
        } else {
            $copiedCount++;
        }
        continue;
    }

    // 備援：PHP GD 生成 placeholder
    if (!$gdAvailable) {
        continue;
    }

    {

        $img = imagecreatetruecolor(800, 450);

        $r  = ($hexColor >> 16) & 0xFF;
        $g  = ($hexColor >> 8)  & 0xFF;
        $b  = $hexColor & 0xFF;
        $bg = imagecolorallocate($img, $r, $g, $b);
        $fg = imagecolorallocate($img, 240, 240, 240);
        $dim = imagecolorallocate($img, $r + 20 > 255 ? 255 : $r + 20,
                                        $g + 20 > 255 ? 255 : $g + 20,
                                        $b + 20 > 255 ? 255 : $b + 20);

        imagefill($img, 0, 0, $bg);
        imagefilledrectangle($img, 0, 180, 800, 270, $dim);

        $asciiLabel = '[Demo Placeholder] ' . pathinfo($filename, PATHINFO_FILENAME);
        $charWidth  = 9;
        $x = (int)((800 - strlen($asciiLabel) * $charWidth) / 2);
        imagestring($img, 5, $x, 205, $asciiLabel, $fg);

        imagejpeg($img, $destPath, 80);
        imagedestroy($img);
        $generatedCount++;
    }
}

if ($copiedCount > 0) {
    echo "✓ 已從 database/seeds/demo-images/ 複製 {$copiedCount} 張真實示範圖片\n";
}
if ($generatedCount > 0) {
    $gdMsg = $gdAvailable ? '' : '（GD 未啟用，略過 placeholder 生成）';
    echo "✓ 已生成 {$generatedCount} 張 placeholder 圖片（demo-images/ 中無對應檔案）{$gdMsg}\n";
}
if ($skippedCount > 0) {
    echo "  （{$skippedCount} 張已存在，略過）\n";
}
if (!$gdAvailable && $generatedCount === 0 && $copiedCount === 0 && $skippedCount < count($demoImages)) {
    echo "⚠ PHP GD 未啟用且 demo-images/ 無圖片，部分活動照片將顯示破圖。\n";
    echo "  請執行 git lfs pull 後重新執行此腳本。\n";
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
    echo "  • 24 張示範活動照片（" . ($copiedCount > 0 ? "已從 demo-images/ 複製真實圖片" : ($gdAvailable ? "已生成 placeholder，執行 git lfs pull 後可取得真實圖片" : "需執行 git lfs pull")) . "）\n";
} catch (Exception $e) {
    fwrite(STDERR, "✗ Demo seed failed: " . $e->getMessage() . "\n");
    exit(1);
}
