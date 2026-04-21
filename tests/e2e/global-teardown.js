const { execFileSync } = require('child_process');
const path = require('path');

module.exports = async () => {
  const cleanupScript = path.resolve(__dirname, '../../scripts/cleanup-e2e-test-data.php');
  execFileSync('php', [cleanupScript, '--full'], { stdio: 'inherit' });
};
