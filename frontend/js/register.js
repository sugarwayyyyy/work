FormUtils.bindPasswordToggles();
initLogoCarousel();
initGoogleOAuth({
    formSelector: '#register-form',
    loadingText: '處理中…',
    failText: '建立帳號',
    onSuccess: (data) => {
        const role = data.role;
        const canManageClubs = Boolean(data.can_manage_clubs);
        if (role === 'platform_admin') window.location.href = 'admin-users.html';
        else if (canManageClubs) window.location.href = 'club-admin-club-manage.html?v=20260508a';
        else window.location.href = '../index.html';
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name             = document.getElementById('name').value;
    const student_id       = document.getElementById('student_id').value;
    const email            = document.getElementById('email').value;
    const password         = document.getElementById('password').value;
    const confirm_password = document.getElementById('confirm_password').value;

    if (!Validator.validateRequired(name)) {
        PageUtils.showAlert('請輸入姓名', 'error');
        return;
    }
    if (!Validator.validateEmail(email)) {
        PageUtils.showAlert('請輸入有效的郵箱', 'error');
        return;
    }
    if (!Validator.validatePassword(password)) {
        PageUtils.showAlert('密碼至少需要6個字符', 'error');
        return;
    }
    if (password !== confirm_password) {
        PageUtils.showAlert('兩次輸入的密碼不一致', 'error');
        return;
    }

    try {
        const response = await APIClient.post('auth.php?action=register', { name, student_id, email, password });
        if (response.success) {
            PageUtils.showAlert('註冊成功，正在重定向…', 'success');
            setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        } else {
            PageUtils.showAlert(response.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        PageUtils.showAlert('註冊失敗，請稍後重試', 'error');
    }
});
