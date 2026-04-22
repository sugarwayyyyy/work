// 共用 JavaScript 工具與 API 入口。
function detectAppBasePath() {
    const path = window.location.pathname || '';
    const frontendIndex = path.indexOf('/frontend/');
    if (frontendIndex >= 0) {
        return path.substring(0, frontendIndex);
    }

    const backendIndex = path.indexOf('/backend/');
    if (backendIndex >= 0) {
        return path.substring(0, backendIndex);
    }

    return '';
}

const APP_BASE_PATH = detectAppBasePath();

function resolveFrontendHomeUrl() {
    const path = window.location.pathname || '';

    if (path.includes('/frontend/')) {
        return `${window.location.origin}${APP_BASE_PATH}/frontend/index.html`;
    }

    // 在 frontend 目錄直接啟動 php -S 時，首頁位於 /index.html。
    return `${window.location.origin}/index.html`;
}

function resolveApiBaseCandidates() {
    const candidates = [];
    const pathname = window.location.pathname || '';
    const sameOriginApi = `${window.location.origin}${APP_BASE_PATH}/backend/api`;

    const isFrontendDocRootMode = window.location.port === '8000'
        && !pathname.includes('/frontend/')
        && !pathname.includes('/backend/');

    // frontend 目錄直接啟動時不存在 /backend/api 路徑，避免先打到必定 404 的候選。
    if (!isFrontendDocRootMode) {
        candidates.push(sameOriginApi);
    }

    // PHP 內建伺服器跑在 frontend(:8000) 時，後端可能不在同一個 doc root。
    if (window.location.port === '8000') {
        // 一鍵啟動腳本預設後端在 :8080，先走同一來源可避免候選切換導致狀態錯讀。
        candidates.push('http://localhost:8080/api');
        candidates.push(`${window.location.protocol}//${window.location.hostname}/社團活動資訊統整平台/backend/api`);
    }

    return Array.from(new Set(candidates));
}

const API_BASE_CANDIDATES = resolveApiBaseCandidates();
const API_URL = API_BASE_CANDIDATES[0];
const FRONTEND_HOME_URL = resolveFrontendHomeUrl();

function resolveFrontendAssetUrl(relativePath) {
    const normalizedPath = String(relativePath || '').replace(/^\/+/, '');
    const path = window.location.pathname || '';

    if (path.includes('/frontend/')) {
        return `${window.location.origin}${APP_BASE_PATH}/frontend/${normalizedPath}`;
    }

    return `${window.location.origin}/${normalizedPath}`;
}

let csrfTokenCache = null;
let csrfTokenPromise = null;
let activeApiBaseUrl = null;

class APIClient {
    static getBaseUrl() {
        return activeApiBaseUrl || API_BASE_CANDIDATES[0] || API_URL;
    }

    static getOrderedCandidates() {
        const ordered = [];
        if (activeApiBaseUrl) {
            ordered.push(activeApiBaseUrl);
        }

        for (const candidate of API_BASE_CANDIDATES) {
            if (!ordered.includes(candidate)) {
                ordered.push(candidate);
            }
        }

        return ordered;
    }

    static async ensureCSRFToken() {
        if (csrfTokenCache) {
            return csrfTokenCache;
        }

        if (csrfTokenPromise) {
            return csrfTokenPromise;
        }

        csrfTokenPromise = (async () => {
            const response = await this.request('auth.php?action=csrf_token', {
                method: 'GET',
                skipCSRF: true
            });

            const token = response?.data?.csrf_token || null;
            csrfTokenCache = token;
            csrfTokenPromise = null;
            return token;
        })();

        return csrfTokenPromise;
    }

    static async getCSRFHeaders() {
        const token = await this.ensureCSRFToken();
        return token ? { 'X-CSRF-Token': token } : {};
    }

    static async request(endpoint, options = {}) {
        const method = options.method || 'GET';
        const isCurrentSessionProbe = endpoint === 'auth.php?action=current';
        const shouldAttachCSRF = !options.skipCSRF && method !== 'GET';

        if (shouldAttachCSRF && !csrfTokenCache) {
            await this.ensureCSRFToken();
        }

        const headers = {
            ...options.headers
        };

        if (method !== 'GET') {
            headers['Content-Type'] = 'application/json';
            headers['X-Requested-With'] = 'XMLHttpRequest';
        }

        if (shouldAttachCSRF && csrfTokenCache) {
            headers['X-CSRF-Token'] = csrfTokenCache;
        }

        const requestBody = method !== 'GET' ? JSON.stringify(options.data || {}) : undefined;
        let lastError = null;
        let lastFailurePayload = null;
        let authFailurePayload = null;

        const candidateBaseUrls = this.getOrderedCandidates();

        for (const baseUrl of candidateBaseUrls) {
            try {
                const response = await fetch(`${baseUrl}/${endpoint}`, {
                    method,
                    headers,
                    credentials: 'include',
                    body: requestBody
                });

                let payload = null;
                try {
                    payload = await response.json();
                } catch (parseError) {
                    // 404 HTML 或非 JSON 回應視為此候選不可用，繼續嘗試下一個。
                    continue;
                }

                if (response.ok) {
                    activeApiBaseUrl = baseUrl;
                    return payload;
                }

                if (payload?.success === true) {
                    activeApiBaseUrl = baseUrl;
                    return payload;
                }

                if (payload?.success === false) {
                    if (response.status === 401 || response.status === 403) {
                        if (isCurrentSessionProbe) {
                            // current probe 可能先打到沒有共享 session 的候選主機，
                            // 必須繼續試完其他候選後再決定是否真的未登入。
                            lastFailurePayload = lastFailurePayload || payload;
                            continue;
                        }

                        // 若首個候選配置錯誤，保留認證失敗結果但持續嘗試其他候選。
                        authFailurePayload = authFailurePayload || payload;
                        continue;
                    }

                    // same-origin 候選通常為正確後端，優先採納以降低跨域噪音。
                    if (baseUrl === API_BASE_CANDIDATES[0]) {
                        return payload;
                    }

                    // 其餘候選再保留最後一個失敗回應。
                    lastFailurePayload = payload;
                    continue;
                }
            } catch (error) {
                if (activeApiBaseUrl === baseUrl) {
                    activeApiBaseUrl = null;
                }
                lastError = error;
            }
        }

        if (lastFailurePayload) {
            return lastFailurePayload;
        }

        if (authFailurePayload) {
            return authFailurePayload;
        }

        if (lastError) throw lastError;
        throw new Error('API request failed: no reachable backend endpoint');
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
    static escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    static escapeAttribute(value) {
        return PageUtils.escapeHtml(String(value ?? '')).replace(/`/g, '&#96;');
    }

    static ensureAlertContainer() {
        let alertContainer = document.getElementById('alert-container');
        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.id = 'alert-container';
        }

        if (alertContainer.parentElement !== document.body) {
            document.body.appendChild(alertContainer);
        }

        alertContainer.classList.add('global-alert-container');
        return alertContainer;
    }

    static showAlert(message, type = 'success') {
        const alertContainer = PageUtils.ensureAlertContainer();

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

        const pathname = window.location.pathname || '';
        const isFrontendDocRootMode = window.location.port === '8000'
            && !pathname.includes('/frontend/')
            && !pathname.includes('/backend/');

        if (normalized.startsWith('社團活動資訊統整平台/')) {
            normalized = normalized.replace(/^社團活動資訊統整平台\//, '');
        }

        if (normalized.startsWith(`${APP_BASE_PATH.replace(/^\//, '')}/`)) {
            normalized = normalized.replace(new RegExp(`^${APP_BASE_PATH.replace(/^\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\/`), '');
        }

        if (normalized.startsWith('frontend/')) {
            normalized = normalized.replace(/^frontend\//, '');
        }

        // 兼容舊資料：若 DB 只存上傳檔名（無路徑），自動補到 uploads 目錄。
        const isBareFilename = !normalized.includes('/') && /\.(jpg|jpeg|png|gif|webp)$/i.test(normalized);
        if (isBareFilename) {
            normalized = `assets/uploads/${normalized}`;
        }

        if (isFrontendDocRootMode) {
            if (normalized.startsWith('assets/uploads/')) {
                // 某些本機環境下，舊上傳檔 ACL 會導致 php -S 無法直接讀取 uploads；
                // 開發模式優先走 Apache 靜態路徑，避免頁面持續 404。
                return `${window.location.protocol}//${window.location.hostname}/社團活動資訊統整平台/frontend/${normalized}`;
            }
            return resolveFrontendAssetUrl(normalized);
        }

        if (normalized.startsWith('assets/uploads/')) {
            normalized = `frontend/${normalized}`;
        }

        return `${window.location.origin}${APP_BASE_PATH}/${normalized}`;
    }

    static getAlternateUploadsUrl(url) {
        if (!url) return '';

        try {
            const parsed = new URL(url, window.location.origin);
            const path = parsed.pathname || '';

            if (path.includes('/frontend/assets/uploads/')) {
                return `${parsed.origin}${path.replace('/frontend/assets/uploads/', '/assets/uploads/')}${parsed.search}`;
            }

            if (path.includes('/assets/uploads/')) {
                return `${parsed.origin}${path.replace('/assets/uploads/', '/frontend/assets/uploads/')}${parsed.search}`;
            }
        } catch (error) {
            return '';
        }

        return '';
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
        const safeClubName = PageUtils.escapeAttribute(clubName || '社團');

        if (logoUrl) {
            const safeLogoUrl = PageUtils.escapeAttribute(logoUrl);
            const alternateLogoUrl = PageUtils.getAlternateUploadsUrl(logoUrl);
            const safeAlternateLogoUrl = PageUtils.escapeAttribute(alternateLogoUrl || '');
            const pixelLogoForAttr = PageUtils.escapeAttribute(pixelLogoUrl);
            const fallbackSteps = [];

            if (alternateLogoUrl) {
                fallbackSteps.push(`if(!this.dataset.uploadFallbackTried){this.dataset.uploadFallbackTried='1';this.src='${safeAlternateLogoUrl}';return;}`);
            }

            if (pixelLogoUrl) {
                fallbackSteps.push(`this.onerror=null;this.src='${pixelLogoForAttr}';this.style.imageRendering='pixelated';`);
            }

            const fallbackAttr = fallbackSteps.length > 0
                ? ` onerror="${fallbackSteps.join('')}"`
                : '';
            return `<span class="club-avatar" style="width: ${dimension}; height: ${dimension};"><img src="${safeLogoUrl}" alt="${safeClubName} logo" class="club-avatar__img"${fallbackAttr}></span>`;
        }

        if (pixelLogoUrl) {
            const safePixelUrl = PageUtils.escapeAttribute(pixelLogoUrl);
            return `<span class="club-avatar" style="width: ${dimension}; height: ${dimension};"><img src="${safePixelUrl}" alt="${safeClubName} 像素 logo" class="club-avatar__img" style="image-rendering: pixelated;"></span>`;
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

class FormUtils {
    static bindPasswordToggles(scope = document) {
        const toggles = scope.querySelectorAll('[data-toggle-password]');
        toggles.forEach((toggle) => {
            if (toggle.dataset.passwordToggleBound === 'true') return;

            const targetId = toggle.getAttribute('data-toggle-password');
            const input = targetId ? document.getElementById(targetId) : null;
            if (!input) return;

            const syncLabel = () => {
                const isHidden = input.type === 'password';
                toggle.textContent = isHidden ? 'Show' : 'Hide';
                toggle.setAttribute('aria-label', isHidden ? 'Show password' : 'Hide password');
            };

            toggle.addEventListener('click', () => {
                input.type = input.type === 'password' ? 'text' : 'password';
                syncLabel();
            });

            toggle.dataset.passwordToggleBound = 'true';
            syncLabel();
        });
    }
}

class StorageUtils {
    static setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    }

    static getUser() {
        const user = localStorage.getItem('user');
        if (!user) return null;

        try {
            return JSON.parse(user);
        } catch (error) {
            // Corrupted localStorage should not break all pages.
            localStorage.removeItem('user');
            return null;
        }
    }

    static clearUser() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('csrf_token');
        sessionStorage.clear();
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
    ensureSiteFavicon();
    await hydrateUserFromSession();
    updateNavigation();
    await renderGlobalFollowSidebar();
    renderAuthPromoBanner();
}

function ensureSiteFavicon() {
    if (document.querySelector('link[data-managed-favicon="true"]')) return;

    const iconHref = resolveFrontendAssetUrl('favicon.svg');
    const link = document.createElement('link');
    link.setAttribute('data-managed-favicon', 'true');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = iconHref;
    document.head.appendChild(link);
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
    // 沒有本地登入快照時，先不主動探測 current，避免未登入首頁持續出現 401 噪音。
    if (!StorageUtils.isLoggedIn()) {
        return;
    }

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
            // 僅在後端明確回傳未登入時清除，避免暫時性網路錯誤造成 UI 狀態跳動。
            StorageUtils.clearUser();
        }
    } catch (error) {
        // Keep existing local session snapshot on transient request failures.
    }
}

function isPagesDir() {
    const path = window.location.pathname || '';
    return path.includes('/frontend/pages/') || path.includes('/pages/');
}

function getPageLink(fileName) {
    return isPagesDir() ? fileName : `pages/${fileName}`;
}

function shouldRenderGlobalFollowSidebar() {
    const pathname = window.location.pathname || '';
    const isPagesPath = pathname.includes('/frontend/pages/') || pathname.includes('/pages/');
    if (!isPagesPath) return false;

    const blockedPageSuffixes = [
        '/frontend/pages/login.html',
        '/frontend/pages/register.html',
        '/frontend/pages/admin-dashboard.html',
        '/frontend/pages/club-admin-dashboard.html',
        '/pages/login.html',
        '/pages/register.html',
        '/pages/admin-dashboard.html',
        '/pages/club-admin-dashboard.html'
    ];

    return !blockedPageSuffixes.some(page => pathname.endsWith(page));
}

function ensureGlobalFollowSidebarStyles() {
    if (document.getElementById('global-follow-sidebar-style')) return;

    const style = document.createElement('style');
    style.id = 'global-follow-sidebar-style';
    style.textContent = `
        body.has-global-follow-sidebar {
            --global-follow-sidebar-width: 96px;
        }

        body.has-global-follow-sidebar #followed-clubs-section {
            position: fixed;
            top: 5.25rem;
            left: 0;
            bottom: 0;
            width: 96px;
            z-index: 90;
            overflow: visible;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-sidebar-card {
            height: calc(100vh - 5.25rem);
            background: linear-gradient(180deg, #f4f6fa 0%, #eef2f7 100%);
            border-right: 1px solid rgba(148, 163, 184, 0.35);
            box-shadow: 4px 0 18px rgba(15, 23, 42, 0.06);
            border-radius: 0;
            border-top: 0;
            border-left: 0;
            border-bottom: 0;
            padding: 0.5rem 0.35rem 0.75rem;
            overflow-y: auto;
            overflow-x: visible;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-sidebar-card::-webkit-scrollbar,
        body.has-global-follow-sidebar #followed-clubs-container::-webkit-scrollbar {
            width: 0;
            height: 0;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-sidebar-card__header {
            display: none;
        }

        body.has-global-follow-sidebar #followed-clubs-container {
            display: flex;
            flex-direction: column;
            gap: 0.45rem;
            max-height: 100%;
            overflow-y: auto;
            overflow-x: visible;
            padding: 0.15rem 0.1rem;
            margin: 0;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-sidebar-item {
            display: flex;
            position: relative;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0;
            width: 100%;
            text-decoration: none;
            color: inherit;
            border-radius: 0.8rem;
            padding: 0.3rem 0.15rem;
            background: transparent;
            border: 1px solid transparent;
            box-shadow: none;
            transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-sidebar-item:hover {
            transform: translateY(-1px);
            background: rgba(51, 65, 85, 0.1);
            border-color: rgba(51, 65, 85, 0.18);
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-sidebar-item__body {
            display: none;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-sidebar-empty {
            color: var(--text-light);
            font-size: 0.8rem;
            line-height: 1.45;
            padding: 0.7rem 0.1rem 0.4rem;
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
            text-align: left;
        }

        body.has-global-follow-sidebar .container {
            padding-left: calc(2rem + var(--global-follow-sidebar-width));
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-sidebar-empty a {
            display: inline-block;
            font-size: 0.78rem;
        }

        @media (max-width: 1024px) {
            body.has-global-follow-sidebar #followed-clubs-section {
                display: none;
            }

            body.has-global-follow-sidebar .container {
                padding-left: 1rem;
            }
        }
    `;
    document.head.appendChild(style);
}

function getGlobalFollowSidebarMarkup() {
    return `
        <section class="home-sidebar-card card">
            <div class="home-sidebar-card__header">
                <div>
                    <h2 id="followed-clubs-title">我追蹤的社團</h2>
                    <p id="followed-clubs-subtitle">像訂閱頻道一樣，從左側快速進入你常看的社團。</p>
                </div>
                <span id="followed-clubs-count" class="badge">載入中</span>
            </div>
            <div id="followed-clubs-container" class="home-sidebar-list">
                <div class="home-sidebar-empty">載入追蹤社團中...</div>
            </div>
        </section>
    `;
}

function renderGlobalFollowSidebarMessage(html) {
    const container = document.getElementById('followed-clubs-container');
    const title = document.getElementById('followed-clubs-title');
    const subtitle = document.getElementById('followed-clubs-subtitle');
    const countBadge = document.getElementById('followed-clubs-count');

    if (title) title.textContent = '我追蹤的社團';
    if (subtitle) subtitle.textContent = '像訂閱頻道一樣，從左側快速進入你常看的社團。';
    if (countBadge) countBadge.textContent = '提醒';
    if (container) container.innerHTML = `<div class="home-sidebar-empty">${html}</div>`;
}

async function renderGlobalFollowSidebar() {
    if (!shouldRenderGlobalFollowSidebar()) return;

    ensureGlobalFollowSidebarStyles();

    let section = document.getElementById('followed-clubs-section');
    if (!section) {
        section = document.createElement('aside');
        section.id = 'followed-clubs-section';
        section.className = 'home-sidebar';
        section.style.display = 'block';
        section.innerHTML = getGlobalFollowSidebarMarkup();
        document.body.appendChild(section);
    }

    document.body.classList.add('has-global-follow-sidebar');

    if (!StorageUtils.isLoggedIn()) {
        const countBadge = document.getElementById('followed-clubs-count');
        if (countBadge) countBadge.textContent = '未登入';
        renderGlobalFollowSidebarMessage(`登入後即可把你追蹤的社團固定在左側。<br><a href="${getPageLink('login.html')}" class="btn btn-primary btn-sm">前往登入</a>`);
        return;
    }

    try {
        const response = await APIClient.get('clubs.php?action=my_follows');
        if (!response.success) {
            renderGlobalFollowSidebarMessage('追蹤社團載入失敗，請稍後再試。');
            return;
        }

        const clubs = response?.data?.clubs || [];
        const title = document.getElementById('followed-clubs-title');
        const subtitle = document.getElementById('followed-clubs-subtitle');
        const countBadge = document.getElementById('followed-clubs-count');
        if (title) title.textContent = '我追蹤的社團';
        if (subtitle) subtitle.textContent = '像訂閱頻道一樣，從左側快速進入你常看的社團。';
        if (countBadge) countBadge.textContent = `${clubs.length} 個社團`;

        if (clubs.length === 0) {
            renderGlobalFollowSidebarMessage(`你目前尚未追蹤任何社團。<br><a href="${getPageLink('club-list.html')}" class="btn btn-secondary btn-sm">前往社團列表</a>`);
            return;
        }

        const container = document.getElementById('followed-clubs-container');
        if (!container) return;
        container.innerHTML = '';

        clubs.forEach((club) => {
            const item = document.createElement('a');
            item.className = 'home-sidebar-item';
            item.href = `${getPageLink('club-detail.html')}?id=${Number(club.club_id) || 0}`;
            item.title = club.club_name || '社團';
            const safeClubName = PageUtils.escapeHtml(club.club_name || '-');
            item.innerHTML = `
                ${PageUtils.renderClubAvatar(club, 44)}
                <span class="home-sidebar-item__body">
                    <span class="home-sidebar-item__title">${safeClubName}</span>
                </span>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        renderGlobalFollowSidebarMessage('載入時發生錯誤。');
    }
}

function isAdminDashboardPage() {
    const path = window.location.pathname || '';
    return path.endsWith('/frontend/pages/admin-dashboard.html') || path.endsWith('/pages/admin-dashboard.html');
}

function isClubAdminDashboardPage() {
    const path = window.location.pathname || '';
    return path.endsWith('/frontend/pages/club-admin-dashboard.html') || path.endsWith('/pages/club-admin-dashboard.html');
}

function isUserProfilePage() {
    const path = window.location.pathname || '';
    return path.endsWith('/frontend/pages/user-profile.html') || path.endsWith('/pages/user-profile.html');
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
            const safeAvatarUrl = PageUtils.escapeAttribute(avatarUrl || '');
            const safeInitial = PageUtils.escapeHtml(initial || '?');
            userDropdown.innerHTML = avatarUrl
                ? `<img src="${safeAvatarUrl}" alt="個人資料" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #e5e7eb;">`
                : `<span style="display: inline-flex; width: 32px; height: 32px; border-radius: 50%; background: var(--primary-color); color: #fff; align-items: center; justify-content: center; font-weight: 700; border: 2px solid #e5e7eb;">${safeInitial}</span>`;
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
        const response = await APIClient.post('auth.php?action=logout', {});
        if (response.success) {
            StorageUtils.clearUser();
            csrfTokenCache = null;
            window.location.href = FRONTEND_HOME_URL;
            return;
        }
    } catch (e) {
    }

    StorageUtils.clearUser();
    csrfTokenCache = null;
    window.location.href = FRONTEND_HOME_URL;
}

window.APIClient = APIClient;
window.PageUtils = PageUtils;
window.Validator = Validator;
window.FormUtils = FormUtils;
window.StorageUtils = StorageUtils;
window.refreshGlobalFollowSidebar = renderGlobalFollowSidebar;
