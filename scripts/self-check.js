const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

function fail(message) {
  console.error(`SELF-CHECK FAILED: ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`SELF-CHECK OK: ${message}`);
}

function run() {
  const mainJs = read(path.join('frontend', 'js', 'main.js'));
  const clubDetail = read(path.join('frontend', 'pages', 'club-detail.html'));

  if (mainJs.includes('FRONTEND_HOME_URL}/index.html')) {
    fail('Logout redirect must not append /index.html to FRONTEND_HOME_URL.');
  } else {
    pass('Logout redirect does not duplicate index path.');
  }

  const logoutRedirectMatches = mainJs.match(/window\.location\.href\s*=\s*FRONTEND_HOME_URL\s*;/g) || [];
  if (logoutRedirectMatches.length < 2) {
    fail('Expected handleLogout to redirect to FRONTEND_HOME_URL in both success and fallback paths.');
  } else {
    pass('Logout success/fallback redirect targets are consistent.');
  }

  if (!mainJs.includes("credentials: 'include'")) {
    fail('API client must include credentials to keep session behavior consistent.');
  } else {
    pass('API client sends credentials for session-based auth.');
  }

  if (!clubDetail.includes('follow_state_known')) {
    fail('Club detail UI must handle unknown follow state from backend.');
  } else {
    pass('Club detail follow-state guard exists.');
  }

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  console.log('SELF-CHECK COMPLETED: all guardrails passed.');
}

run();
