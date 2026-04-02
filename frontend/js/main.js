// 共用 JavaScript 工具與 API 入口。
const API_URL = '/社團活動資訊統整平台/backend/api';

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

function initializePage() {
    updateNavigation();
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

    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userDropdown) {
            userDropdown.textContent = user.name;
            userDropdown.style.display = 'inline-block';
        }

        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            if (isAdminDashboardPage()) {
                setRestrictedDashboardNav('platform_admin');
                return;
            }

            if (isClubAdminDashboardPage()) {
                setRestrictedDashboardNav('club_admin');
                return;
            }

            if (user.role === 'platform_admin' && !document.getElementById('admin-dashboard-link')) {
                const li = document.createElement('li');
                li.id = 'admin-dashboard-link';
                li.innerHTML = `<a href="${getPageLink('admin-dashboard.html')}">管理員</a>`;
                navLinks.appendChild(li);
            }
            if ((user.role === 'club_admin' || user.role === 'platform_admin') && !document.getElementById('club-admin-dashboard-link')) {
                const li = document.createElement('li');
                li.id = 'club-admin-dashboard-link';
                li.innerHTML = `<a href="${getPageLink('club-admin-dashboard.html')}">幹部</a>`;
                navLinks.appendChild(li);
            }
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userDropdown) userDropdown.style.display = 'none';
        const adminLink = document.getElementById('admin-dashboard-link');
        const clubAdminLink = document.getElementById('club-admin-dashboard-link');
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
