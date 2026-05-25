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
  const mysql = resolveMysql();
  const cleanupScript = path.resolve(__dirname, '../../scripts/cleanup-e2e-test-data.php');
  const seedFile = path.resolve(__dirname, '../../database/seeds/test_accounts_and_story_data.sql');

  // 清除 E2E 產生的測試資料
  execFileSync(php, [cleanupScript, '--full'], { stdio: 'inherit' });

  // 重新 seed 還原測試帳號與基礎社團，讓網站在測試後仍可正常使用
  execFileSync(mysql, ['-u', 'root', '-p12345678', '--default-character-set=utf8mb4', 'club_platform'], {
    stdio: ['pipe', 'inherit', 'inherit'],
    input: fs.readFileSync(seedFile),
  });
  console.log('✓ Base seed restored after E2E teardown');
};
