<?php
/**
 * 通用工具和輔助函數
 */

require_once 'config.php';
require_once 'db.php';
require_once 'content_filter.php';

class Helper {
    private static function getCorsAllowedOrigins() {
        $configured = getenv('CORS_ALLOWED_ORIGINS') ?: '';
        $origins = array_values(array_filter(array_map('trim', explode(',', (string)$configured))));

        $appUrl = defined('APP_URL') ? trim((string)APP_URL) : '';
        if ($appUrl !== '') {
            $scheme = parse_url($appUrl, PHP_URL_SCHEME);
            $host = parse_url($appUrl, PHP_URL_HOST);
            $port = parse_url($appUrl, PHP_URL_PORT);
            if (!empty($scheme) && !empty($host)) {
                $appOrigin = $scheme . '://' . $host;
                if (!empty($port)) {
                    $appOrigin .= ':' . $port;
                }
                $origins[] = $appOrigin;
            }
        }

        return array_values(array_unique($origins));
    }

    private static function isAllowedCorsOrigin($origin) {
        if (!is_string($origin) || trim($origin) === '') {
            return false;
        }

        $origin = trim($origin);
        foreach (self::getCorsAllowedOrigins() as $allowed) {
            if (strcasecmp($origin, $allowed) === 0) {
                return true;
            }
        }

        return preg_match('#^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$#i', $origin) === 1;
    }

    public static function applyCorsHeaders() {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (self::isAllowedCorsOrigin($origin)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        }
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-CSRF-Token');
        header('Access-Control-Allow-Credentials: true');
    }

    // 返回JSON格式響應
    public static function response($success, $message = '', $data = null, $http_code = 200) {
        http_response_code($http_code);
        header('Content-Type: application/json; charset=utf-8');
        self::applyCorsHeaders();
        
        $response = [
            'success' => $success,
            'message' => $message,
            'data' => $data
        ];
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    // 成功響應
    public static function success($message = '', $data = null) {
        self::response(true, $message, $data, 200);
    }
    
    // 錯誤響應
    public static function error($message = '', $http_code = 400, $data = null) {
        self::response(false, $message, $data, $http_code);
    }
    
    // 驗證必填欄位
    public static function validateRequired($data, $required_fields) {
        $errors = [];
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $errors[] = "$field 為必填欄位";
            }
        }
        return $errors;
    }
    
    // 驗證郵件格式
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    // 驗證電話格式
    public static function validatePhone($phone) {
        return preg_match('/^[0-9\-\+\(\)]{9,}$/', $phone) === 1;
    }
    
    // 生成安全的雜湊密碼
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }
    
    // 驗證密碼
    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
    
    // 生成CSRF Token
    public static function generateCSRFToken() {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(CSRF_TOKEN_LENGTH));
        }
        return $_SESSION['csrf_token'];
    }
    
    // 驗證CSRF Token
    public static function verifyCSRFToken($token) {
        return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
    }

    private static function shouldSkipCSRFFCheck() {
        $uri = $_SERVER['REQUEST_URI'] ?? '';
        if (strpos($uri, '/api/auth.php') !== false) {
            $action = $_GET['action'] ?? '';
            if (in_array($action, ['login', 'register', 'csrf_token'], true)) {
                return true;
            }
        }
        return false;
    }

    public static function enforceCSRFIfNeeded($requestData = null) {
        $method = strtoupper(self::getRequestMethod());
        if (!in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH'], true)) {
            return;
        }

        if (self::shouldSkipCSRFFCheck()) {
            return;
        }

        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
        if (!$token && is_array($requestData) && isset($requestData['csrf_token'])) {
            $token = $requestData['csrf_token'];
        }

        if (!is_string($token) || !self::verifyCSRFToken($token)) {
            self::error('CSRF 驗證失敗，請重新整理後再試', 403);
        }
    }
    
    // 清理用戶輸入
    public static function sanitize($input) {
        if (is_array($input)) {
            return array_map([self::class, 'sanitize'], $input);
        }
        return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
    }
    
    // 記錄錯誤
    public static function logError($message, $severity = 'ERROR') {
        $log_message = '[' . date('Y-m-d H:i:s') . '] [' . $severity . '] ' . $message . PHP_EOL;
        error_log($log_message, 3, ERROR_LOG_FILE);
    }
    
    // 生成令牌
    public static function generateToken($length = 32) {
        return bin2hex(random_bytes($length / 2));
    }
    
    // 檢查是否是AJAX請求
    public static function isAjax() {
        return isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
               strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    }
    
    // 取得請求方法
    public static function getRequestMethod() {
        return $_SERVER['REQUEST_METHOD'];
    }
    
    // 取得JSON POST數據
    public static function getJsonInput() {
        $input = file_get_contents('php://input');
        if ($input === false || trim($input) === '') {
            return null;
        }

        $decoded = json_decode($input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        return $decoded;
    }

    // 取得請求內容並做基本安全攔截
    public static function getRequestInput() {
        $jsonInput = self::getJsonInput();
        if (is_array($jsonInput)) {
            $data = $jsonInput;
        } elseif (is_array($_POST) && !empty($_POST)) {
            $data = $_POST;
        } else {
            $data = [];
        }

        self::enforceCSRFIfNeeded($data);
        self::rejectDangerousCommandPayload($data);
        return $data;
    }

    public static function rejectDangerousCommandPayload($data) {
        if (ContentFilter::hasDangerousCommandPayload($data)) {
            self::error('請求內容包含疑似危險指令片段，已拒絕處理', 400);
        }
    }
    
    // 格式化日期時間
    public static function formatDateTime($datetime, $format = 'Y-m-d H:i:s') {
        if (!$datetime) return '';
        return date($format, strtotime($datetime));
    }
    
    // 計算時間差（人性化）
    public static function timeAgo($datetime) {
        $time = strtotime($datetime);
        $now = time();
        $diff = $now - $time;
        
        if ($diff < 60) return '剛才';
        if ($diff < 3600) return floor($diff / 60) . '分鐘前';
        if ($diff < 86400) return floor($diff / 3600) . '小時前';
        if ($diff < 604800) return floor($diff / 86400) . '天前';
        if ($diff < 2592000) return floor($diff / 604800) . '週前';
        if ($diff < 31536000) return floor($diff / 2592000) . '月前';
        return floor($diff / 31536000) . '年前';
    }
}

class Auth {
    private static $currentRoleCache = null;
    private static $clubAdminMembershipCache = [];

    private static function syncCSRFCookie() {
        $token = Helper::generateCSRFToken();
        $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        setcookie('csrf_token', $token, [
            'expires' => 0,
            'path' => '/',
            'secure' => $isHttps,
            'httponly' => false,
            'samesite' => 'Lax'
        ]);
    }

    private static function getCurrentRole() {
        if (!self::isLoggedIn()) {
            self::$currentRoleCache = null;
            return null;
        }

        if (self::$currentRoleCache !== null) {
            return self::$currentRoleCache;
        }

        $row = Database::getInstance()->fetchOne(
            'SELECT role FROM users WHERE user_id = ?',
            [self::getCurrentUserId()]
        );

        $role = $row['role'] ?? ($_SESSION['role'] ?? null);
        $_SESSION['role'] = $role;
        self::$currentRoleCache = $role;

        return $role;
    }

    // 開始會話
    public static function startSession() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        self::syncCSRFCookie();
    }
    
    // 檢查用戶是否登入
    public static function isLoggedIn() {
        self::startSession();
        return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
    }
    
    // 取得當前用戶信息
    public static function getCurrentUser() {
        self::startSession();
        if (!self::isLoggedIn()) {
            return null;
        }
        
        $user = Database::getInstance()->fetchOne(
            'SELECT * FROM users WHERE user_id = ?',
            [$_SESSION['user_id']]
        );
        
        return $user;
    }
    
    // 取得當前用戶ID
    public static function getCurrentUserId() {
        self::startSession();
        return $_SESSION['user_id'] ?? null;
    }
    
    // 設置登入會話
    public static function setLogin($user_id, $user_data = []) {
        self::startSession();
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user_id;
        $_SESSION['role'] = $user_data['role'] ?? 'student';
        $_SESSION['name'] = $user_data['name'] ?? '';
        $_SESSION['login_time'] = time();
        self::$currentRoleCache = $_SESSION['role'];
        self::syncCSRFCookie();
    }
    
    // 登出
    public static function logout() {
        self::startSession();
        self::$currentRoleCache = null;
        self::$clubAdminMembershipCache = [];
        session_destroy();
    }
    
    // 檢查是否是特定角色
    public static function hasRole($role) {
        self::startSession();
        if (!self::isLoggedIn()) return false;
        return self::getCurrentRole() === $role;
    }
    
    // 檢查是否是管理員
    public static function isAdmin() {
        return self::hasRole('platform_admin');
    }
    
    // 檢查是否是社團幹部
    public static function isClubAdmin() {
        if (!self::isLoggedIn()) return false;
        if (self::isAdmin()) return true;
        return self::hasActiveClubAdminMembership(self::getCurrentUserId());
    }

    public static function hasActiveClubAdminMembership($user_id) {
        $uid = (int)$user_id;
        if ($uid <= 0) return false;

        if (array_key_exists($uid, self::$clubAdminMembershipCache)) {
            return (bool)self::$clubAdminMembershipCache[$uid];
        }

        $membership = Database::getInstance()->fetchOne(
            'SELECT 1
             FROM club_members
             WHERE user_id = ?
               AND is_active = 1
               AND role IN ("president", "vice_president", "public_relations", "treasurer", "director")
             LIMIT 1',
            [$uid]
        );

        self::$clubAdminMembershipCache[$uid] = (bool)$membership;
        return (bool)$membership;
    }

    public static function canManageClub($club_id, $user_id = null) {
        $clubId = (int)$club_id;
        if ($clubId <= 0) return false;

        $uid = $user_id !== null ? (int)$user_id : (int)self::getCurrentUserId();
        if ($uid <= 0) return false;
        if (self::isAdmin()) return true;

        $membership = Database::getInstance()->fetchOne(
            'SELECT 1
             FROM club_members
             WHERE club_id = ?
               AND user_id = ?
               AND is_active = 1
               AND role IN ("president", "vice_president", "public_relations", "treasurer", "director")
             LIMIT 1',
            [$clubId, $uid]
        );
        return (bool)$membership;
    }
    
    // 檢查會話是否過期
    public static function isSessionExpired() {
        self::startSession();
        if (!isset($_SESSION['login_time'])) {
            return true;
        }
        
        if (time() - $_SESSION['login_time'] > SESSION_TIMEOUT) {
            return true;
        }
        
        return false;
    }
}

// 初始化會話
Auth::startSession();
