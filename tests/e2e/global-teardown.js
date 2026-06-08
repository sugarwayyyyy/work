const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function resolvePhp() {
  const candidates = [
    'C:\\xampp\\php\\php.exe',
    'C:\\AppServ\\php8\\php.exe',
    'C:\\AppServ\\php7\\php.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return 'php';
}

function resolveMysql() {
  const candidates = [
    'C:\\xampp\\mysql\\bin\\mysql.exe',
    'D:\\app\\AppServ\\MySQL\\bin\\mysql.exe',
    'C:\\AppServ\\MySQL\\bin\\mysql.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return 'mysql';
}

module.exports = async () => {
  const php = resolvePhp();
  const cleanupScript = path.resolve(__dirname, '../../scripts/cleanup-e2e-test-data.php');
  const seedScript = path.resolve(__dirname, '../../scripts/seed-e2e-test-data.php');

  // 清除 E2E 產生的測試資料
  execFileSync(php, [cleanupScript, '--full'], { stdio: 'inherit' });

  // 重新 seed 還原測試帳號與基礎社團（用 PHP seed 腳本，讀 config 連線，不寫死 DB 密碼，環境無關）
  execFileSync(php, [seedScript], { stdio: 'inherit' });
  console.log('✓ Base seed restored after E2E teardown');
};
