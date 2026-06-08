FormUtils.bindPasswordToggles();
initLogoCarousel();
initGoogleOAuth({
    formSelector: '#login-form',
    loadingText: '登入中…',
    failText: '登入',
    onSuccess: (data) => {
        if (data.role === 'platform_admin') window.location.href = 'admin-users.html?_reload=1';
        else if (data.role === 'category_assistant') window.location.href = 'admin-clubs.html?_reload=1';
        else window.location.href = '../index.html?_reload=1';
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return;

    const email    = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!Validator.validateEmail(email)) {
        PageUtils.showAlert('請輸入有效的郵箱', 'error');
        return;
    }
    if (!Validator.validatePassword(password)) {
        PageUtils.showAlert('密碼至少需要6個字符', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '登入中…';

    try {
        const response = await APIClient.post('auth.php?action=login', { email, password });
        if (response.success) {
            StorageUtils.setUser(response.data);
            PageUtils.showAlert('登入成功，正在重定向...', 'success');
            setTimeout(() => {
                if (response.data.role === 'platform_admin') window.location.href = 'admin-users.html?_reload=1';
                else if (response.data.role === 'category_assistant') window.location.href = 'admin-clubs.html?_reload=1';
                else window.location.href = '../index.html?_reload=1';
            }, 1000);
        } else {
            PageUtils.showAlert(response.message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = '登入';
        }
    } catch (error) {
        console.error('Error:', error);
        PageUtils.showAlert('登入失敗，請稍後重試', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '登入';
    }
});
