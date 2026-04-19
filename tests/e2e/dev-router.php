<?php
// E2E local router: serve frontend routes and backend API under one host.
$root = realpath(__DIR__ . '/../../');
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');

if ($uri === '/') {
    $uri = '/index.html';
}

$resolvePath = function (string $path) use ($root): ?string {
    $full = realpath($path);
    if ($full === false) {
        return null;
    }
    if (strpos($full, $root) !== 0 || !is_file($full)) {
        return null;
    }
    return $full;
};

$candidates = [];

// Direct backend/api and backend resources
if (strpos($uri, '/backend/') === 0) {
    $candidates[] = $root . $uri;
}

// Frontend routes exposed as root-level paths during E2E.
if (preg_match('#^/(pages|css|js|assets)/#', $uri) === 1 || $uri === '/index.html') {
    $candidates[] = $root . '/frontend' . $uri;
}

// Handle absolute app-prefixed media URLs like /社團活動資訊統整平台/frontend/assets/...
$projectPrefix = '/社團活動資訊統整平台/';
if (strpos($uri, $projectPrefix) === 0) {
    $stripped = '/' . ltrim(substr($uri, strlen($projectPrefix)), '/');
    $candidates[] = $root . $stripped;
}

// Fallback to project-root relative path.
$candidates[] = $root . $uri;

$target = null;
foreach ($candidates as $candidate) {
    $resolved = $resolvePath($candidate);
    if ($resolved !== null) {
        $target = $resolved;
        break;
    }
}

if ($target === null) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Not Found';
    exit;
}

$ext = strtolower(pathinfo($target, PATHINFO_EXTENSION));
$mimeMap = [
    'css' => 'text/css; charset=UTF-8',
    'js' => 'application/javascript; charset=UTF-8',
    'json' => 'application/json; charset=UTF-8',
    'svg' => 'image/svg+xml',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'gif' => 'image/gif',
    'webp' => 'image/webp',
    'html' => 'text/html; charset=UTF-8',
    'php' => 'text/html; charset=UTF-8'
];

if (isset($mimeMap[$ext])) {
    header('Content-Type: ' . $mimeMap[$ext]);
}

if ($ext === 'php') {
    $_SERVER['SCRIPT_FILENAME'] = $target;
    chdir(dirname($target));
    include $target;
    exit;
}

if (!is_readable($target)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Not Found';
    exit;
}

readfile($target);
