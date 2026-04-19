<?php
/**
 * 用戶認證 API 端點
 */

require_once '../auth.php';
require_once '../content_filter.php';

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: http://localhost:8000');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');
    exit(0);
}

class UserAPI {
    
    /**
     * 用戶註冊
     * POST /api/auth.php?action=register
     */
    public static function register($data) {
        try {
            $errors = Helper::validateRequired($data, ['email', 'password', 'name']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }
            
            if (!Helper::validateEmail($data['email'])) {
                Helper::error('郵箱格式不正確', 400);
            }

            if (ContentFilter::hasRestrictedInFields($data, ['name'])) {
                Helper::error('姓名包含不適當字眼，請修改後再送出', 400);
            }
            
            // 檢查郵箱是否已存在
            $existing = Database::getInstance()->fetchOne(
                'SELECT user_id FROM users WHERE email = ?',
                [$data['email']]
            );
            
            if ($existing) {
                Helper::error('此郵箱已被註冊', 409);
            }

            // 檢查學號是否已存在（若輸入）
            if (!empty($data['student_id'])) {
                $existingStudent = Database::getInstance()->fetchOne(
                    'SELECT user_id FROM users WHERE student_id = ?',
                    [$data['student_id']]
                );
                if ($existingStudent) {
                    Helper::error('此學號已被註冊', 409);
                }
            }
            
            if (strlen($data['password']) < 6) {
                Helper::error('密碼至少需要6個字符', 400);
            }

            $register_data = [
                'email' => $data['email'],
                'password' => Helper::hashPassword($data['password']),
                'name' => $data['name'],
                'role' => 'student'
            ];

            if (!empty($data['student_id'])) {
                $register_data['student_id'] = $data['student_id'];
            }

            $user_id = dbInsert('users', $register_data);

            if (!$user_id) {
                Helper::error('註冊失敗', 500);
            }
            
            Helper::success('註冊成功', ['user_id' => $user_id]);
            
        } catch (Exception $e) {
            Helper::logError('註冊失敗: ' . $e->getMessage());
            Helper::error('註冊失敗', 500);
        }
    }
    
    /**
     * 用戶登入
     * POST /api/auth.php?action=login
     */
    public static function login($data) {
        try {
            $errors = Helper::validateRequired($data, ['email', 'password']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }
            
            $user = Database::getInstance()->fetchOne(
                'SELECT * FROM users WHERE email = ?',
                [$data['email']]
            );
            
            if (!$user) {
                Helper::error('郵箱或密碼錯誤', 401);
            }
            
            // is_active 兼容舊資料
            if (isset($user['is_active']) && !$user['is_active']) {
                Helper::error('帳戶已被停用', 403);
            }
            
            // 密碼驗證：優先 bcrypt，兼容純文字歷史密碼（若存在）
            $passwordValid = Helper::verifyPassword($data['password'], $user['password']);
            if (!$passwordValid) {
                if ($user['password'] === $data['password']) {
                    // 升級為 bcrypt 存儲
                    dbUpdate('users', ['password' => Helper::hashPassword($data['password'])], 'user_id = ?', [$user['user_id']]);
                    $passwordValid = true;
                }
            }
            
            if (!$passwordValid) {
                Helper::error('郵箱或密碼錯誤', 401);
            }
            
            Auth::setLogin($user['user_id'], [
                'role' => $user['role'],
                'name' => $user['name']
            ]);
            
            Helper::success('登入成功', [
                'user_id' => $user['user_id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'csrf_token' => Helper::generateCSRFToken()
            ]);
            
        } catch (Exception $e) {
            Helper::logError('登入失敗: ' . $e->getMessage());
            Helper::error('登入失敗', 500);
        }
    }
    
    /**
     * 用戶登出
     * POST /api/auth.php?action=logout
     */
    public static function logout() {
        if (Helper::getRequestMethod() !== 'POST') {
            Helper::error('登出僅支援 POST', 405);
        }
        Auth::logout();
        Helper::success('登出成功');
    }

    public static function getCSRFToken() {
        Helper::success('取得 CSRF Token 成功', [
            'csrf_token' => Helper::generateCSRFToken()
        ]);
    }
    
    /**
     * 取得當前用戶信息
     * GET /api/auth.php?action=current
     */
    public static function getCurrentUserInfo() {
        if (!Auth::isLoggedIn()) {
            Helper::error('未登入', 401);
        }
        
        $user = Auth::getCurrentUser();
        unset($user['password']);
        
        Helper::success('取得用戶信息成功', $user);
    }
    
    /**
     * 更新用戶資料
     * PUT /api/auth.php?action=update
     */
    public static function updateProfile($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }
        
        try {
            $user_id = Auth::getCurrentUserId();
            $update_data = [];
            
            if (isset($data['name'])) {
                $name = trim((string)$data['name']);
                if ($name === '') {
                    Helper::error('姓名不可為空', 400);
                }
                if (ContentFilter::containsRestrictedLanguage($name)) {
                    Helper::error('姓名包含不適當字眼，請修改後再送出', 400);
                }
                $update_data['name'] = $name;
            }

            if (isset($data['student_id'])) {
                $student_id = trim((string)$data['student_id']);
                if ($student_id !== '') {
                    $existing = Database::getInstance()->fetchOne(
                        'SELECT user_id FROM users WHERE student_id = ? AND user_id <> ?',
                        [$student_id, $user_id]
                    );
                    if ($existing) {
                        Helper::error('學號已被其他帳號使用', 409);
                    }
                    $update_data['student_id'] = $student_id;
                } else {
                    // 允許清空學號
                    $update_data['student_id'] = null;
                }
            }
            
            if (isset($data['phone'])) {
                $phone = trim((string)$data['phone']);
                if ($phone !== '' && !Helper::validatePhone($phone)) {
                    Helper::error('電話格式不正確', 400);
                }
                $update_data['phone'] = $phone === '' ? null : $phone;
            }

            if (isset($data['avatar_path'])) {
                $update_data['avatar_path'] = $data['avatar_path'];
            }
            
            if (!empty($update_data)) {
                dbUpdate('users', $update_data, 'user_id = ?', [$user_id]);
            }
            
            Helper::success('更新成功');
            
        } catch (Exception $e) {
            Helper::logError('更新失敗: ' . $e->getMessage());
            Helper::error('更新失敗', 500);
        }
    }
    
    /**
     * 變更密碼
     * POST /api/auth.php?action=change_password
     */
    public static function changePassword($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }
        
        try {
            $errors = Helper::validateRequired($data, ['old_password', 'new_password']);
            if (!empty($errors)) {
                Helper::error('驗證失敗: ' . implode(', ', $errors), 400);
            }
            
            $user = Auth::getCurrentUser();
            
            if (!Helper::verifyPassword($data['old_password'], $user['password'])) {
                Helper::error('舊密碼錯誤', 401);
            }
            
            if (strlen($data['new_password']) < 6) {
                Helper::error('新密碼至少需要6個字符', 400);
            }
            
            dbUpdate('users', [
                'password' => Helper::hashPassword($data['new_password'])
            ], 'user_id = ?', [$user['user_id']]);
            
            Helper::success('密碼變更成功');
            
        } catch (Exception $e) {
            Helper::logError('變更失敗: ' . $e->getMessage());
            Helper::error('變更失敗', 500);
        }
    }
}

// 路由處理
$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'current';

$data = ($method === 'POST' || $method === 'PUT') 
    ? Helper::getRequestInput() 
    : [];

switch ($action) {
    case 'register':
        UserAPI::register($data);
        break;
    case 'login':
        UserAPI::login($data);
        break;
    case 'logout':
        UserAPI::logout();
        break;
    case 'csrf_token':
        UserAPI::getCSRFToken();
        break;
    case 'current':
        UserAPI::getCurrentUserInfo();
        break;
    case 'update':
        UserAPI::updateProfile($data);
        break;
    case 'change_password':
        UserAPI::changePassword($data);
        break;
    default:
        Helper::error('無效的操作', 400);
}
