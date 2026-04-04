<?php
/**
 * 用戶認證 API 端點
 */

require_once '../auth.php';

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
            Helper::error('註冊失敗: ' . $e->getMessage(), 500);
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
                'role' => $user['role']
            ]);
            
        } catch (Exception $e) {
            Helper::error('登入失敗: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 用戶登出
     * GET /api/auth.php?action=logout
     */
    public static function logout() {
        Auth::logout();
        Helper::success('登出成功');
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
            Helper::error('更新失敗: ' . $e->getMessage(), 500);
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
            Helper::error('變更失敗: ' . $e->getMessage(), 500);
        }
    }
}

// 路由處理
$method = Helper::getRequestMethod();
$action = $_GET['action'] ?? 'current';

$data = ($method === 'POST' || $method === 'PUT') 
    ? (Helper::getJsonInput() ?? $_POST) 
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
