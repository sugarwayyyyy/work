<?php
/**
 * 用戶認證 API 端點
 */

require_once '../auth.php';
require_once '../content_filter.php';

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Helper::applyCorsHeaders();
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');
    exit(0);
}

class UserAPI {
    private static function checkLoginRateLimit(string $email): void {
        $r = Database::getInstance()->fetchOne(
            'SELECT COUNT(*) AS c, MIN(attempted_at) AS oldest
             FROM login_attempts
             WHERE email = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)',
            [$email]
        );
        if ((int)($r['c'] ?? 0) >= 10) {
            $lockUntil = strtotime($r['oldest']) + 300;
            $remaining = max(1, (int)ceil(($lockUntil - time()) / 60));
            Helper::error('登入嘗試次數過多，請等待 ' . $remaining . ' 分鐘後再試', 429);
        }
    }

    private static function recordLoginFailure(string $email): void {
        try {
            dbInsert('login_attempts', ['email' => $email]);
        } catch (Exception $e) {
            Helper::logError('Rate limit insert failed: ' . $e->getMessage());
        }
    }

    private static function clearLoginAttempts(string $email): void {
        try {
            dbDelete('login_attempts', 'email = ?', [$email]);
        } catch (Exception $e) {
            // non-critical
        }
    }

    private static function getClubManagementSummary($user_id) {
        $row = Database::getInstance()->fetchOne(
            'SELECT COUNT(*) AS managed_club_count
             FROM club_members
             WHERE user_id = ?
               AND is_active = 1
               AND role IN ("president", "vice_president", "public_relations", "treasurer", "director")',
            [(int)$user_id]
        );

        $count = (int)($row['managed_club_count'] ?? 0);
        return [
            'can_manage_clubs' => $count > 0,
            'managed_club_count' => $count
        ];
    }
    
    
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

            $email = $data['email'];
            self::checkLoginRateLimit($email);

            $user = Database::getInstance()->fetchOne(
                'SELECT * FROM users WHERE email = ?',
                [$email]
            );

            if (!$user) {
                self::recordLoginFailure($email);
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
                self::recordLoginFailure($email);
                Helper::error('郵箱或密碼錯誤', 401);
            }

            Auth::setLogin($user['user_id'], [
                'role' => $user['role'],
                'name' => $user['name']
            ]);
            self::clearLoginAttempts($email);
            $clubSummary = self::getClubManagementSummary((int)$user['user_id']);
            $csrfToken = Helper::generateCSRFToken();
            session_write_close();

            Helper::success('登入成功', [
                'user_id' => $user['user_id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'can_manage_clubs' => $clubSummary['can_manage_clubs'],
                'managed_club_count' => $clubSummary['managed_club_count'],
                'csrf_token' => $csrfToken
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
        $clubSummary = self::getClubManagementSummary((int)($user['user_id'] ?? 0));
        $user['can_manage_clubs'] = $clubSummary['can_manage_clubs'];
        $user['managed_club_count'] = $clubSummary['managed_club_count'];
        
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
            $current_user = Auth::getCurrentUser();
            if (!$current_user) {
                Helper::error('使用者不存在', 404);
            }
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
                if (($current_user['role'] ?? '') === 'student') {
                    Helper::error('學生帳號不可修改學號', 403);
                }
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
     * 刪除帳號（硬刪除，不可回復）
     * POST /api/auth.php?action=deactivate_account
     */
    public static function deactivateAccount($data) {
        if (!Auth::isLoggedIn()) {
            Helper::error('請先登入', 401);
        }

        $errors = Helper::validateRequired($data, ['password']);
        if (!empty($errors)) {
            Helper::error('請輸入目前密碼', 400);
        }

        $user = Auth::getCurrentUser();

        if (($user['role'] ?? '') === 'platform_admin') {
            Helper::error('平台管理員帳號無法自行刪除，請聯繫系統維護人員', 403);
        }

        if (!Helper::verifyPassword($data['password'], $user['password'])) {
            Helper::error('密碼錯誤，無法執行刪除', 401);
        }

        $db  = Database::getInstance();
        $uid = (int)$user['user_id'];

        // 輔助：帶參數的 prepared statement 執行（user_id 皆為整數）
        $exec = function (string $sql, array $params) use ($db) {
            $stmt = $db->prepare($sql);
            if (!$stmt) throw new Exception('SQL prepare failed: ' . $sql);
            if ($params) {
                $types = str_repeat('i', count($params));
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $stmt->close();
        };

        try {
            $db->beginTransaction();

            // ── 1. NULL 掉 nullable 審計欄位，保留記錄但移除個人身分 ──
            $exec('UPDATE reports                  SET resolved_by   = NULL WHERE resolved_by        = ?', [$uid]);
            $exec('UPDATE system_announcements     SET created_by    = NULL WHERE created_by         = ?', [$uid]);
            $exec('UPDATE account_transfers        SET transferred_by = NULL WHERE transferred_by    = ?', [$uid]);
            $exec('UPDATE account_transfer_requests SET reviewed_by  = NULL WHERE reviewed_by        = ?', [$uid]);
            $exec('UPDATE activity_logs            SET triggered_by  = NULL WHERE triggered_by       = ?', [$uid]);

            // ── 2. 刪除不可 NULL 的關聯資料 ──

            // 轉讓申請（申請者或目標為此用戶）
            $exec('DELETE FROM account_transfer_requests WHERE requester_user_id = ? OR target_user_id = ?', [$uid, $uid]);
            // 轉讓記錄（from/to 為此用戶）
            $exec('DELETE FROM account_transfers WHERE from_user_id = ? OR to_user_id = ?', [$uid, $uid]);
            // 此用戶提出的檢舉
            $exec('DELETE FROM reports WHERE reported_by_user_id = ?', [$uid]);
            // 通知
            $exec('DELETE FROM notifications WHERE user_id = ?', [$uid]);
            // 參與證明
            $exec('DELETE FROM participation_certificates WHERE user_id = ?', [$uid]);

            // ── 3. QA（子表優先）──
            // 用戶對他人回覆的「有幫助」投票
            $exec('DELETE FROM qa_reply_helpful WHERE user_id = ?', [$uid]);
            // 他人對此用戶問題的回覆（子回覆透過 parent_reply_id ON DELETE CASCADE 自動清除）
            $exec('DELETE qr FROM qa_replies qr JOIN q_and_a qa ON qr.qa_id = qa.qa_id WHERE qa.user_id = ?', [$uid]);
            // 此用戶對他人問題的回覆
            $exec('DELETE FROM qa_replies WHERE user_id = ?', [$uid]);
            // 此用戶問題的標籤關聯
            $exec('DELETE qtr FROM qa_tag_relations qtr JOIN q_and_a qa ON qtr.qa_id = qa.qa_id WHERE qa.user_id = ?', [$uid]);
            // 此用戶的問題
            $exec('DELETE FROM q_and_a WHERE user_id = ?', [$uid]);

            // ── 4. 評價（子表優先）──
            $exec('DELETE rtr FROM review_tag_relations rtr JOIN reviews r ON rtr.review_id = r.review_id WHERE r.user_id = ?', [$uid]);
            $exec('DELETE FROM reviews WHERE user_id = ?', [$uid]);

            // ── 5. 活動相關 ──
            $exec('DELETE FROM event_registrations WHERE user_id = ?', [$uid]);
            $exec('DELETE FROM event_attendance   WHERE user_id = ?', [$uid]);
            $exec('DELETE FROM event_comments     WHERE user_id = ?', [$uid]);

            // ── 6. 社團關係 ──
            $exec('DELETE FROM club_members   WHERE user_id = ?', [$uid]);
            $exec('DELETE FROM club_followers WHERE user_id = ?', [$uid]);

            // ── 7. 刪除用戶本體 ──
            $exec('DELETE FROM users WHERE user_id = ?', [$uid]);

            $db->commit();
            Auth::logout();
            Helper::success('帳號已成功刪除');
        } catch (Exception $e) {
            $db->rollback();
            Helper::logError('帳號刪除失敗: ' . $e->getMessage());
            Helper::error('帳號刪除失敗，請稍後再試', 500);
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
    case 'deactivate_account':
        UserAPI::deactivateAccount($data);
        break;
    default:
        Helper::error('無效的操作', 400);
}
