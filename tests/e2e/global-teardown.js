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

module.exports = async () => {
  const php = resolvePhp();
  const cleanupScript = path.resolve(__dirname, '../../scripts/cleanup-e2e-test-data.php');
  execFileSync(php, [cleanupScript, '--full'], { stdio: 'inherit' });
};
