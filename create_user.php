<?php
require_once './backend/config.php';
require_once './backend/db.php';
require_once './backend/auth.php';

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
echo "- 學生/test:   user_id={$studentId}, email=test@example.com, pw=password123\n";
echo "- 管理員/admin: user_id={$adminId}, email=admin@example.com, pw=Admin1234\n";
echo "- 幹部/clubadmin: user_id={$clubAdminId}, email=clubadmin@example.com, pw=ClubAdmin1234\n";
?>