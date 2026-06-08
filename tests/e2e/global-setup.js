const { execFileSync, execSync } = require('child_process');
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

function runPhpScript(scriptPath, args = []) {
  if (process.env.E2E_BASE_URL) {
    // Docker 模式：透過 docker exec 在 container 內執行
    const containerPath = '/var/www/html/' + path.relative(path.resolve(__dirname, '../..'), scriptPath).replace(/\\/g, '/');
    const argsStr = args.map(a => `'${a}'`).join(' ');
    execSync(`docker exec club-platform-web php ${containerPath} ${argsStr}`, { stdio: 'inherit' });
  } else {
    execFileSync(resolvePhp(), [scriptPath, ...args], { stdio: 'inherit' });
  }
}

module.exports = async () => {
  const cleanupScript = path.resolve(__dirname, '../../scripts/cleanup-e2e-test-data.php');
  const seedScript = path.resolve(__dirname, '../../scripts/seed-e2e-test-data.php');
  runPhpScript(cleanupScript, ['--full']);
  runPhpScript(seedScript);
};
