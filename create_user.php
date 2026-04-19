<?php
require_once './backend/config.php';
require_once './backend/db.php';
require_once './backend/auth.php';

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('此腳本僅允許在 CLI 執行。' . PHP_EOL);
}

$args = $_SERVER['argv'] ?? [];
if (!in_array('--force', $args, true)) {
    echo "Usage: php create_user.php --force" . PHP_EOL;
    exit(1);
}

function createUserIfNotExists($email, $plainPassword, $name, $role, $studentId = null) {
    $existing = Database::getInstance()->fetchOne('SELECT user_id FROM users WHERE email = ?', [$email]);
    if ($existing) {
        return $existing['user_id'];
    }

    $data = [
        'email' => $email,
        'password' => Helper::hashPassword($plainPassword),
        'name' => $name,
        'role' => $role,
        'is_active' => 1
    ];

    if (!empty($studentId)) {
        $data['student_id'] = $studentId;
    }

    return dbInsert('users', $data);
}

$studentId = createUserIfNotExists('test@example.com', 'password123', '測試用戶', 'student', '123456');
$adminId = createUserIfNotExists('admin@example.com', 'Admin1234', '平台管理員', 'platform_admin');
$clubAdminId = createUserIfNotExists('clubadmin@example.com', 'ClubAdmin1234', '社團幹部', 'club_admin');

echo "用戶建立完成：\n";
echo "- 學生/test:   user_id={$studentId}, email=test@example.com\n";
echo "- 管理員/admin: user_id={$adminId}, email=admin@example.com\n";
echo "- 幹部/clubadmin: user_id={$clubAdminId}, email=clubadmin@example.com\n";
echo "預設密碼請依需求於登入後立即重設。\n";
?>