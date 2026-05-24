<?php
require __DIR__ . '/../backend/config.php';
if (file_exists(__DIR__ . '/../backend/config.local.php')) {
    require __DIR__ . '/../backend/config.local.php';
}
$conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
if ($conn->connect_error) { die('連線失敗: ' . $conn->connect_error . PHP_EOL); }

echo "=== 資料表清單 ===" . PHP_EOL;
$res = $conn->query('SHOW TABLES');
$tables = [];
while ($row = $res->fetch_row()) { $tables[] = $row[0]; echo $row[0] . PHP_EOL; }

echo PHP_EOL . "=== 各資料表欄位 ===" . PHP_EOL;
foreach ($tables as $t) {
    echo PHP_EOL . "[$t]" . PHP_EOL;
    $cols = $conn->query("SHOW COLUMNS FROM `$t`");
    while ($c = $cols->fetch_assoc()) {
        echo "  {$c['Field']} {$c['Type']}" . ($c['Null']==='NO'?' NOT NULL':'') . ($c['Default']!==null?" DEFAULT {$c['Default']}":'') . PHP_EOL;
    }
}
$conn->close();
