const { execFileSync } = require('child_process');
const path = require('path');

module.exports = async () => {
  const seedScript = path.resolve(__dirname, '../../scripts/seed-e2e-test-data.php');
  execFileSync('php', [seedScript], { stdio: 'inherit' });
};
