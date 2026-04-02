<?php
/**
 * 配置文件 - 資料庫連接參數和應用程序設置
 */

// 資料庫設置
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASSWORD', '12345678'); // 根據您的MySQL Workbench設置修改
define('DB_NAME', 'club_platform');
define('DB_PORT', 3306);

// 應用程序設置
define('APP_NAME', '社團活動資訊統整平台');
define('APP_URL', 'http://localhost');
define('APP_ENV', 'development'); // development 或 production

// 會話設置
define('SESSION_TIMEOUT', 3600); // 秒
define('CSRF_TOKEN_LENGTH', 32);

// 上傳設置
define('UPLOAD_DIR', '../frontend/assets/uploads/');
define('MAX_FILE_SIZE', 5242880); // 5MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif']);

// 分頁設置
define('ITEMS_PER_PAGE', 15);

// 回復設置
define('API_RESPONSE_FORMAT', 'json'); // json 或 xml

// 郵件設置（如需要）
define('SMTP_HOST', '');
define('SMTP_PORT', 587);
define('SMTP_USER', '');
define('SMTP_PASSWORD', '');
define('FROM_EMAIL', '');

// 時區設置
date_default_timezone_set('Asia/Taipei');

// Session 配置
ini_set('session.cookie_path', '/');
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);

// 錯誤記錄
define('ERROR_LOG_FILE', '../logs/error.log');
define('DEBUG_MODE', true);
