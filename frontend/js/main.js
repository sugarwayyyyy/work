// 共用 JavaScript 工具與 API 入口。
const API_URL = '/社團活動資訊統整平台/backend/api';
const FRONTEND_HOME_URL = '/社團活動資訊統整平台/frontend/index.html';

class APIClient {
    static async request(endpoint, options = {}) {
        const method = options.method || 'GET';
        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...options.headers
        };

        const response = await fetch(`${API_URL}/${endpoint}`, {
            method,
            headers,
            credentials: 'same-origin',
            body: method !== 'GET' ? JSON.stringify(options.data || {}) : undefined
        });

        return await response.json();
    }

    static get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static post(endpoint, data) {
        return this.request(endpoint, { method: 'POST', data });
    }

    static put(endpoint, data) {
        return this.request(endpoint, { method: 'PUT', data });
    }

    static delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    /**
     * 轉換為認證 header（如需 token）
     */
    static getAuthHeaders() {
        const token = StorageUtils.getToken();
        return token ? { 'Authorization': 'Bearer ' + token } : {};
    }
}

class PageUtils {
    static showAlert(message, type = 'success') {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;

        alertContainer.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    static showLoading(show = true) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + ' 年前';

        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + ' 月前';

        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + ' 天前';

        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + ' 小時前';

        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + ' 分鐘前';

        return '剛才';
    }

    static renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let html = '';

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                html += '<span class="rating">★</span>';
            } else if (i === fullStars && hasHalfStar) {
                html += '<span class="rating">✩</span>';
            } else {
                html += '<span class="rating" style="color: #d1d5db;">★</span>';
            }
        }

        return html;
    }

    static resolveMediaUrl(path) {
        if (!path) return '';

        const raw = String(path).trim();
        if (!raw) return '';

        if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:')) {
            return raw;
        }

        let normalized = raw.replace(/\\/g, '/').replace(/^\.?\//, '');

        if (normalized.startsWith('社團活動資訊統整平台/')) {
            return `/${normalized}`;
        }

        // 上傳 API 目前回傳 assets/uploads/*，實際檔案位於 frontend/assets/uploads/*。
        if (normalized.startsWith('assets/uploads/')) {
            normalized = `frontend/${normalized}`;
        }

        return `/社團活動資訊統整平台/${normalized}`;
    }
}

class Validator {
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePassword(password) {
        return password.length >= 6;
    }

    static validateRequired(value) {
        return value && value.trim() !== '';
    }
}

class StorageUtils {
    static setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    }

    static getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    static clearUser() {
        localStorage.removeItem('user');
    }

    static isLoggedIn() {
        return !!this.getUser();
    }

    static setToken(token) {
        localStorage.setItem('token', token);
    }

    static getToken() {
        return localStorage.getItem('token');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

async function initializePage() {
    await hydrateUserFromSession();
    updateNavigation();
}

async function hydrateUserFromSession() {
    try {
        const response = await APIClient.get('auth.php?action=current');
        if (response && response.success && response.data) {
            const user = response.data;
            StorageUtils.setUser({
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                student_id: user.student_id || null,
                avatar_path: user.avatar_path || null
            });
        } else {
            StorageUtils.clearUser();
        }
    } catch (error) {
        StorageUtils.clearUser();
    }
}

function isPagesDir() {
    return window.location.pathname.includes('/frontend/pages/');
}

function getPageLink(fileName) {
    return isPagesDir() ? fileName : `pages/${fileName}`;
}

function isAdminDashboardPage() {
    return window.location.pathname.endsWith('/frontend/pages/admin-dashboard.html');
}

function isClubAdminDashboardPage() {
    return window.location.pathname.endsWith('/frontend/pages/club-admin-dashboard.html');
}

function setRestrictedDashboardNav(role) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    if (role === 'platform_admin') {
        navLinks.innerHTML = `<li id="admin-dashboard-link"><a href="${getPageLink('admin-dashboard.html')}">管理員</a></li>`;
    } else if (role === 'club_admin') {
        navLinks.innerHTML = `<li id="club-admin-dashboard-link"><a href="${getPageLink('club-admin-dashboard.html')}">幹部</a></li>`;
    }
}

function updateNavigation() {
    const user = StorageUtils.getUser();
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userDropdown = document.getElementById('user-dropdown');

    const avatarUrl = user && user.avatar_path
        ? PageUtils.resolveMediaUrl(user.avatar_path)
        : null;

    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userDropdown) {
            const initial = (user.name || '?').charAt(0).toUpperCase();
            userDropdown.innerHTML = avatarUrl
                ? `<img src="${avatarUrl}" alt="個人資料" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #e5e7eb;">`
                : `<span style="display: inline-flex; width: 32px; height: 32px; border-radius: 50%; background: var(--primary-color); color: #fff; align-items: center; justify-content: center; font-weight: 700; border: 2px solid #e5e7eb;">${initial}</span>`;
            userDropdown.style.display = 'inline-block';
            userDropdown.style.cursor = 'pointer';
            userDropdown.title = '前往個人資料';
            userDropdown.onclick = () => {
                window.location.href = getPageLink('user-profile.html');
            };

            // 幹部頁要求：頭像在登出按鈕右側
            if (isClubAdminDashboardPage() && logoutBtn && logoutBtn.parentNode) {
                logoutBtn.insertAdjacentElement('afterend', userDropdown);
            }
        }

        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            if (isAdminDashboardPage()) {
                navLinks.innerHTML = `<li id="admin-dashboard-link"><a href="${getPageLink('admin-dashboard.html')}">管理員</a></li>`;
            }

            if (isClubAdminDashboardPage()) {
                navLinks.innerHTML = `
                    <li><a href="${FRONTEND_HOME_URL}">首頁</a></li>
                    <li><a href="${getPageLink('club-list.html')}">社團</a></li>
                    <li><a href="${getPageLink('events.html')}">活動</a></li>
                    <li><a href="${getPageLink('qa.html')}">提問</a></li>
                    <li id="club-admin-dashboard-link"><a href="${getPageLink('club-admin-dashboard.html')}">幹部</a></li>
                `;
            }

            const staleProfileLink = document.getElementById('user-profile-link');
            if (staleProfileLink) staleProfileLink.remove();

            if (user.role === 'platform_admin' && !document.getElementById('admin-dashboard-link')) {
                const li = document.createElement('li');
                li.id = 'admin-dashboard-link';
                li.innerHTML = `<a href="${getPageLink('admin-dashboard.html')}">管理員</a>`;
                navLinks.appendChild(li);
            }
            if (user.role === 'club_admin' && !document.getElementById('club-admin-dashboard-link')) {
                const li = document.createElement('li');
                li.id = 'club-admin-dashboard-link';
                li.innerHTML = `<a href="${getPageLink('club-admin-dashboard.html')}">幹部</a>`;
                navLinks.appendChild(li);
            }
        }

        if (isAdminDashboardPage() && logoutBtn && logoutBtn.parentNode && userDropdown) {
            logoutBtn.insertAdjacentElement('afterend', userDropdown);
        }

        const profileShortcut = document.getElementById('user-profile-shortcut');
        if (profileShortcut) profileShortcut.remove();
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userDropdown) {
            userDropdown.style.display = 'none';
            userDropdown.innerHTML = '';
            userDropdown.onclick = null;
        }
        const profileLink = document.getElementById('user-profile-link');
        const profileShortcut = document.getElementById('user-profile-shortcut');
        const adminLink = document.getElementById('admin-dashboard-link');
        const clubAdminLink = document.getElementById('club-admin-dashboard-link');
        if (profileLink) profileLink.remove();
        if (profileShortcut) profileShortcut.remove();
        if (adminLink) adminLink.remove();
        if (clubAdminLink) clubAdminLink.remove();
    }
}

async function handleLogout() {
    try {
        const response = await APIClient.get('auth.php?action=logout');
        if (response.success) {
            StorageUtils.clearUser();
            window.location.href = '/社團活動資訊統整平台/frontend/index.html';
            return;
        }
    } catch (e) {
    }

    StorageUtils.clearUser();
    window.location.href = '/社團活動資訊統整平台/frontend/index.html';
}

window.APIClient = APIClient;
window.PageUtils = PageUtils;
window.Validator = Validator;
window.StorageUtils = StorageUtils;
