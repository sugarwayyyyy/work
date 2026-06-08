<?php
// 共用設定：資料庫、上傳、會話與錯誤記錄。
// 本地環境覆蓋設定（此檔案不進 git，各電腦自行建立）
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

defined('DB_HOST')     or define('DB_HOST',     getenv('DB_HOST')     ?: 'localhost');
defined('DB_USER')     or define('DB_USER',     getenv('DB_USER')     ?: 'root');
defined('DB_PASSWORD') or define('DB_PASSWORD', getenv('DB_PASSWORD') ?: '12345678');
defined('DB_NAME')     or define('DB_NAME',     getenv('DB_NAME')     ?: 'club_platform');
defined('DB_PORT')     or define('DB_PORT',     (int)(getenv('DB_PORT') ?: 3306));

define('APP_NAME', '社團活動資訊統整平台');
define('APP_URL', getenv('APP_URL') ?: 'http://localhost');
define('APP_ENV', getenv('APP_ENV') ?: 'development'); // development 或 production

define('SESSION_TIMEOUT', 3600); // 秒
define('CSRF_TOKEN_LENGTH', 32);

define('PROJECT_ROOT', dirname(__DIR__));
define('UPLOAD_DIR', PROJECT_ROOT . '/frontend/assets/uploads/');
define('MAX_FILE_SIZE', 10485760); // 10MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

define('ITEMS_PER_PAGE', 15);

define('API_RESPONSE_FORMAT', 'json'); // json 或 xml

define('SMTP_HOST', '');
define('SMTP_PORT', 587);
define('SMTP_USER', '');
define('SMTP_PASSWORD', '');
define('FROM_EMAIL', '');

defined('GOOGLE_CLIENT_ID') or define('GOOGLE_CLIENT_ID', getenv('GOOGLE_CLIENT_ID') ?: '');

// 自動偵測 Windows AppServ / XAMPP 常見 cacert.pem 位置（解決 curl error 60）
// 可在 config.local.php 用 define('GOOGLE_CA_BUNDLE', 'path') 覆蓋
if (!defined('GOOGLE_CA_BUNDLE')) {
    $certCandidates = [
        'D:/app/appserv/php7/cacert.pem',
        'D:/app/appserv/php8/cacert.pem',
        'C:/app/appserv/php7/cacert.pem',
        'C:/app/appserv/php8/cacert.pem',
        'C:/AppServ/php7/cacert.pem',
        'C:/AppServ/php8/cacert.pem',
        'C:/xampp/php/extras/ssl/cacert.pem',
        'C:/xampp/php/cacert.pem',
        __DIR__ . '/cacert.pem',
    ];
    foreach ($certCandidates as $cert) {
        if (is_readable($cert)) {
            define('GOOGLE_CA_BUNDLE', $cert);
            break;
        }
    }
}

date_default_timezone_set('Asia/Taipei');
ini_set('default_charset', 'UTF-8');
if (function_exists('mb_internal_encoding')) {
    mb_internal_encoding('UTF-8');
}

ini_set('session.cookie_path', '/');
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);

define('ERROR_LOG_FILE', PROJECT_ROOT . '/logs/error.log');
define('DEBUG_MODE', APP_ENV !== 'production');
