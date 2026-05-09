const { execFileSync } = require('child_process');
const path = require('path');

module.exports = async () => {
  const cleanupScript = path.resolve(__dirname, '../../scripts/cleanup-e2e-test-data.php');
  const seedScript = path.resolve(__dirname, '../../scripts/seed-e2e-test-data.php');
  execFileSync('php', [cleanupScript, '--full'], { stdio: 'inherit' });
  execFileSync('php', [seedScript], { stdio: 'inherit' });
};
