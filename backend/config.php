<?php
// 共用設定：資料庫、上傳、會話與錯誤記錄。
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASSWORD', '12345678'); // 根據您的MySQL Workbench設置修改
define('DB_NAME', 'club_platform');
define('DB_PORT', 3306);

define('APP_NAME', '社團活動資訊統整平台');
define('APP_URL', 'http://localhost');
define('APP_ENV', 'development'); // development 或 production

define('SESSION_TIMEOUT', 3600); // 秒
define('CSRF_TOKEN_LENGTH', 32);

define('PROJECT_ROOT', dirname(__DIR__));
define('UPLOAD_DIR', PROJECT_ROOT . '/frontend/assets/uploads/');
define('MAX_FILE_SIZE', 5242880); // 5MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif']);

define('ITEMS_PER_PAGE', 15);

define('API_RESPONSE_FORMAT', 'json'); // json 或 xml

define('SMTP_HOST', '');
define('SMTP_PORT', 587);
define('SMTP_USER', '');
define('SMTP_PASSWORD', '');
define('FROM_EMAIL', '');

date_default_timezone_set('Asia/Taipei');

ini_set('session.cookie_path', '/');
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);

define('ERROR_LOG_FILE', PROJECT_ROOT . '/logs/error.log');
define('DEBUG_MODE', true);
