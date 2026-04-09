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

    static getInitial(text) {
        const value = String(text || '').trim();
        return value ? value.charAt(0).toUpperCase() : '?';
    }

    static renderClubAvatar(club, size = 52) {
        const clubName = club?.club_name || club?.name || '';
        const clubCategory = club?.category_name || club?.category || club?.category_id || '';
        const clubDescription = club?.description || '';
        const logoUrl = PageUtils.resolveMediaUrl(club?.logo_path);
        const pixelLogoUrl = PageUtils.getClubPixelAvatarUrl(club);
        const emoji = PageUtils.getClubAvatarEmoji(clubName, clubCategory, clubDescription);
        const initials = PageUtils.getInitial(clubName);
        const dimension = `${size}px`;

        if (logoUrl) {
            const pixelLogoForAttr = pixelLogoUrl.replace(/'/g, '&#39;');
            const fallbackAttr = pixelLogoUrl
                ? ` onerror="this.onerror=null;this.src='${pixelLogoForAttr}';this.style.imageRendering='pixelated';"`
                : '';
            return `<span class="club-avatar" style="width: ${dimension}; height: ${dimension};"><img src="${logoUrl}" alt="${clubName || '社團'} logo" class="club-avatar__img"${fallbackAttr}></span>`;
        }

        if (pixelLogoUrl) {
            return `<span class="club-avatar" style="width: ${dimension}; height: ${dimension};"><img src="${pixelLogoUrl}" alt="${clubName || '社團'} 像素 logo" class="club-avatar__img" style="image-rendering: pixelated;"></span>`;
        }

        const fallbackContent = emoji || initials;
        const fallbackClass = emoji ? 'club-avatar--emoji' : 'club-avatar--fallback';
        return `<span class="club-avatar ${fallbackClass}" aria-hidden="true" style="width: ${dimension}; height: ${dimension};">${fallbackContent}</span>`;
    }

    static getClubPixelAvatarUrl(club) {
        const code = String(club?.club_code || '').trim();
        if (!/^\d{3}$/.test(code)) return '';
        // Bump this version when bulk-updating logos to avoid stale browser cache.
        const logoVersion = '20260410';
        return PageUtils.resolveMediaUrl(`frontend/assets/pixel-logos/clubs/${code}.svg?v=${logoVersion}`);
    }

    static getClubAvatarEmoji(clubName = '', clubCategory = '', clubDescription = '') {
        const normalizedName = String(clubName || '').toLowerCase();
        const normalizedCategory = String(clubCategory || '').toLowerCase();
        const normalizedDescription = String(clubDescription || '').toLowerCase();

        const strictKeywordMatch = (source, keyword) => {
            if (!keyword) return false;
            if (/^[a-z0-9_]+$/i.test(keyword)) {
                const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = new RegExp(`(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`, 'i');
                return pattern.test(source);
            }
            return source.includes(keyword);
        };

        // 名稱優先，避免分類過粗導致「看起來不對題」。
        const nameRules = [
            { keywords: ['吉他', '烏克麗麗', '爵士', '鋼琴', '音樂', '國樂', '管弦', 'band'], emoji: '🎵' },
            { keywords: ['舞蹈', '熱舞', '街舞', '標準舞'], emoji: '💃' },
            { keywords: ['籃球', '排球', '羽球', '桌球', '足球', '網球', '跆拳', '柔道', '劍道', '射箭', '武術', '潛水', '登山', '跑步', '袋棍'], emoji: '🏀' },
            { keywords: ['攝影', '影片', '影像', '相機', '廣播演藝'], emoji: '📷' },
            { keywords: ['程式', '資訊', '電腦', '軟體', '人工智慧', '機器人', 'robot'], emoji: '💻' },
            { keywords: ['設計', '美術', '繪畫', '插畫', '花藝', '書法'], emoji: '🎨' },
            { keywords: ['服務', '志工', '公益', '慈濟', '同舟共濟'], emoji: '🤝' },
            { keywords: ['飲料', '咖啡', '料理', '烘焙', '甜點', '美食'], emoji: '🍰' },
            { keywords: ['英文', '外語', '日文', '韓文', '語言', '僑生', '國際'], emoji: '🗣️' },
            { keywords: ['棋', '桌遊', '遊戲', '電競', '魔術', '動漫', '二輪'], emoji: '🎯' },
            { keywords: ['金融', '經濟', '投資', '商管', '租稅'], emoji: '📈' },
            { keywords: ['宗教', '聖經', '團契', '光鹽', '福智', '禪學', '信望愛'], emoji: '🕊️' }
        ];

        for (const rule of nameRules) {
            if (rule.keywords.some(keyword => strictKeywordMatch(normalizedName, keyword))) {
                return rule.emoji;
            }
        }

        for (const rule of nameRules) {
            if (rule.keywords.some(keyword => strictKeywordMatch(normalizedDescription, keyword))) {
                return rule.emoji;
            }
        }

        // 名稱無法辨識時，再用分類兜底；支援 category_id 與 category_name。
        const categoryId = Number(clubCategory);
        const categoryEmojiById = {
            1: '🏀',
            2: '📚',
            3: '🎭',
            4: '🤝',
            5: '🎯',
            6: '🕊️',
            7: '✨'
        };
        if (Number.isInteger(categoryId) && categoryEmojiById[categoryId]) {
            return categoryEmojiById[categoryId];
        }

        const categoryRules = [
            { keywords: ['體育', '運動'], emoji: '🏀' },
            { keywords: ['藝文', '音樂', '表演'], emoji: '🎭' },
            { keywords: ['服務', '公益'], emoji: '🤝' },
            { keywords: ['學術', '研究'], emoji: '📚' },
            { keywords: ['休閒', '聯誼'], emoji: '🎯' },
            { keywords: ['宗教'], emoji: '🕊️' },
            { keywords: ['綜合'], emoji: '✨' }
        ];

        for (const rule of categoryRules) {
            if (rule.keywords.some(keyword => normalizedCategory.includes(keyword))) {
                return rule.emoji;
            }
        }

        return '';
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
    renderAuthPromoBanner();
}

function shouldRenderAuthPromoBanner() {
    const path = window.location.pathname;
    return !path.endsWith('/login.html') && !path.endsWith('/register.html');
}

function isAuthPromoBannerDismissed() {
    try {
        const dismissedAt = Number(localStorage.getItem('auth-promo-banner-dismissed-at') || 0);
        if (!dismissedAt) return false;

        const cooldownMs = 5 * 60 * 1000;
        const now = Date.now();
        return (now - dismissedAt) < cooldownMs;
    } catch (error) {
        return false;
    }
}

function dismissAuthPromoBanner() {
    try {
        localStorage.setItem('auth-promo-banner-dismissed-at', String(Date.now()));
    } catch (error) {
    }

    const banner = document.getElementById('auth-promo-banner');
    if (banner) banner.remove();
}

function renderAuthPromoBanner() {
    if (!shouldRenderAuthPromoBanner() || StorageUtils.isLoggedIn() || isAuthPromoBannerDismissed()) return;

    if (document.getElementById('auth-promo-banner')) return;

    const banner = document.createElement('section');
    banner.id = 'auth-promo-banner';
    banner.className = 'auth-promo-banner';
    banner.innerHTML = `
        <div class="auth-promo-banner__mark">D</div>
        <div class="auth-promo-banner__body">
            <div class="auth-promo-banner__title">從校園到社群，都能找到共鳴</div>
            <div class="auth-promo-banner__text">登入後可以追蹤社團、收藏標籤、查看活動提醒，也能參與評價與提問。</div>
        </div>
        <div class="auth-promo-banner__actions">
            <a class="btn btn-primary btn-sm auth-promo-banner__login" href="${getPageLink('login.html')}">登入</a>
            <a class="btn btn-secondary btn-sm auth-promo-banner__register" href="${getPageLink('register.html')}">註冊</a>
            <button type="button" class="auth-promo-banner__close" aria-label="關閉提示" title="關閉提示">×</button>
        </div>
    `;

    const closeButton = banner.querySelector('.auth-promo-banner__close');
    if (closeButton) {
        closeButton.addEventListener('click', dismissAuthPromoBanner);
    }
    document.body.appendChild(banner);
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

function isUserProfilePage() {
    return window.location.pathname.endsWith('/frontend/pages/user-profile.html');
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

            if (isUserProfilePage() && user.role === 'platform_admin') {
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
