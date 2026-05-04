// ?璇? JavaScript ?????API ?鈭??
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

    // ??frontend ?獢??皝??賹? php -S ?蹇?????選?謘?/index.html??
    return `${window.location.origin}/index.html`;
}

function resolveApiBaseCandidates() {
    const candidates = [];
    const pathname = window.location.pathname || '';
    const sameOriginApi = `${window.location.origin}${APP_BASE_PATH}/backend/api`;

    const isFrontendDocRootMode = window.location.port === '8000'
        && !pathname.includes('/frontend/')
        && !pathname.includes('/backend/');

    // frontend ?獢??皝??賹??蹇??殉朱謓?/backend/api ???蹓?????伐??對? 404 ??謕???
    if (!isFrontendDocRootMode) {
        candidates.push(sameOriginApi);
    }

    // PHP ??寥?∠捂??????frontend(:8000) ?蹇??綽???迎???謓?????doc root??
    if (window.location.port === '8000') {
        // ??????ｇ?蟡??桀???∟謓?:8080??
        candidates.push(`${window.location.protocol}//${window.location.hostname}:8080/api`);
        // dev-router ???2e ??撗怠??? /backend/api ???? origin???蝞??瘞玲?
        if (!candidates.includes(sameOriginApi)) {
            candidates.push(sameOriginApi);
        }
    }

    return Array.from(new Set(candidates));
}

const API_BASE_CANDIDATES = resolveApiBaseCandidates();
const API_URL = API_BASE_CANDIDATES[0];
const FRONTEND_HOME_URL = resolveFrontendHomeUrl();

function resolveFrontendAssetUrl(relativePath) {
    const normalizedPath = String(relativePath || '').replace(/^\/+/, '');
    return (isPagesDir() ? '../' : '') + normalizedPath;
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
                const fetchOptions = {
                    method,
                    headers,
                    credentials: 'include',
                    body: requestBody
                };

                if (method === 'GET') {
                    fetchOptions.cache = 'no-store';
                }

                const response = await fetch(`${baseUrl}/${endpoint}`, fetchOptions);

                let payload = null;
                try {
                    payload = await response.json();
                } catch (parseError) {
                    // 404 HTML ?謖? JSON ?豯??秋▽蹌剔??謕???????????謅疵??????
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
                            // current probe ??迎????????????session ??謕??????
                            // ?對?????啗??????謕??綽??????秋??賹???堊貝?銋?
                            lastFailurePayload = lastFailurePayload || payload;
                            continue;
                        }

                        // ?隞???謕?????芰????謕??隞?謅??謚??蹓??謅疵????謕???
                        authFailurePayload = authFailurePayload || payload;
                        continue;
                    }

                    // same-origin ?謕??謍啗??蝞貉縣?????∟?????????遛??遴?璆?賹????
                    if (baseUrl === API_BASE_CANDIDATES[0]) {
                        return payload;
                    }

                    // ????謕?????謕??綽?????謅???¯?
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
     * ?改??蝞???header????? token??
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

    static parseDate(dateString) {
        // MySQL datetime uses a space separator ('YYYY-MM-DD HH:MM:SS') which Safari
        // and Firefox reject. Normalize to ISO 8601 ('T' separator) before parsing.
        const normalized = String(dateString || '').trim().replace(' ', 'T');
        return new Date(normalized);
    }

    static formatDate(dateString) {
        const date = PageUtils.parseDate(dateString);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static timeAgo(dateString) {
        const date = PageUtils.parseDate(dateString);
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
            normalized = normalized.replace(/^社團活動資訊統整平台\//, '');
        }

        const basePart = APP_BASE_PATH.replace(/^\//, '');
        if (basePart && normalized.startsWith(basePart + '/')) {
            normalized = normalized.slice(basePart.length + 1);
        }

        if (normalized.startsWith('frontend/')) {
            normalized = normalized.replace(/^frontend\//, '');
        }

        // 兼容舊資料：若 DB 只存上傳檔名（無路徑），自動補到 uploads 目錄。
        const isBareFilename = !normalized.includes('/') && /\.(jpg|jpeg|png|gif|webp)$/i.test(normalized);
        if (isBareFilename) {
            normalized = `assets/uploads/${normalized}`;
        }

        return (isPagesDir() ? '../' : '') + normalized;
    }
    static getAlternateUploadsUrl(url) {
        if (!url) return '';

        // Relative path: swap ../assets/uploads ↔ assets/uploads as a cross-environment fallback.
        if (!url.startsWith('http')) {
            if (url.startsWith('../assets/uploads/')) {
                return 'assets/uploads/' + url.slice('../assets/uploads/'.length);
            }
            if (url.startsWith('assets/uploads/')) {
                return '../assets/uploads/' + url.slice('assets/uploads/'.length);
            }
            return '';
        }

        // Legacy: absolute URLs stored in cache or returned by older code paths.
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
        const safeClubName = PageUtils.escapeAttribute(clubName || '?瑟??');

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
            return `<span class="club-avatar" style="width: ${dimension}; height: ${dimension};"><img src="${safePixelUrl}" alt="${safeClubName} logo" class="club-avatar__img" style="image-rendering: pixelated;" onerror="this.onerror=null;this.style.display='none'"></span>`;
        }

        const fallbackContent = emoji || initials;
        const fallbackClass = emoji ? 'club-avatar--emoji' : 'club-avatar--fallback';
        return `<span class="club-avatar ${fallbackClass}" aria-hidden="true" style="width: ${dimension}; height: ${dimension};">${fallbackContent}</span>`;
    }

    static renderFollowRailAvatar(club, size = 38) {
        return PageUtils.renderClubAvatar(club, size)
            .replace('club-avatar', 'club-avatar home-follow-rail__icon followed-club-float__icon')
            .replace('club-avatar__img', 'club-avatar__img home-follow-rail__icon-img followed-club-float__icon-img');
    }

    static getFollowRailActiveClubId() {
        const params = new URLSearchParams(window.location.search);
        return Number(params.get('club_id') || params.get('club') || params.get('id') || 0);
    }

    static createFollowRailClubItem(club, href, isActive = false) {
        const clubName = String(club?.club_name || '').trim() || 'Followed club';
        const item = document.createElement('a');
        item.className = `home-follow-rail__item followed-club-float__item${isActive ? ' home-follow-rail__item--active followed-club-float__item--active' : ''}`;
        item.href = href;
        item.title = clubName;
        item.setAttribute('aria-label', clubName);
        item.innerHTML = PageUtils.renderFollowRailAvatar(club, 38);
        return item;
    }

    static createFollowRailActionItem({ href, label, title, ariaLabel, modifier = 'action' }) {
        const item = document.createElement('a');
        item.className = `home-follow-rail__item followed-club-float__item home-follow-rail__item--${modifier} followed-club-float__item--${modifier}`;
        item.href = href;
        item.title = title;
        item.setAttribute('aria-label', ariaLabel || title);
        const text = document.createElement('span');
        text.className = modifier === 'more'
            ? 'home-follow-rail__more-label followed-club-float__more-label'
            : 'home-follow-rail__message followed-club-float__message';
        text.textContent = label;
        item.appendChild(text);
        return item;
    }

    static createFollowRailMessage(label, title = '') {
        const message = document.createElement('div');
        message.className = 'home-follow-rail__message followed-club-float__message';
        message.textContent = label;
        if (title) message.title = title;
        message.setAttribute('aria-hidden', 'true');
        return message;
    }

    static replaceFollowRailChildren(container, nodes = []) {
        if (!container) return;
        container.innerHTML = '';
        nodes.forEach((node) => {
            if (node) container.appendChild(node);
        });
    }

    static getClubPixelAvatarUrl(club) {
        const code = String(club?.club_code || '').trim();
        if (!/^\d{3}$/.test(code)) return '';
        // Bump this version when bulk-updating logos to avoid stale browser cache.
        const logoVersion = '20260410';
        return resolveFrontendAssetUrl(`assets/pixel-logos/clubs/${code}.svg?v=${logoVersion}`);
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
    applyActiveNavLink();
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
    const isHomePath = pathname === '/'
        || pathname.endsWith('/index.html')
        || pathname.endsWith('/frontend')
        || pathname.endsWith('/frontend/')
        || pathname.endsWith('/frontend/index.html');
    const isHomeDocument = !!document.querySelector('.home-shell');
    if (!isPagesPath && !isHomePath && !isHomeDocument) return false;

    const blockedPageSuffixes = [
        '/login.html',
        '/register.html',
        '/admin-dashboard.html',
        '/club-admin-dashboard.html',
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
            --sidebar-icon-size: 38px;
            --sidebar-avatar-size: 34px;
            --sidebar-collapsed-w: 58px;
            --sidebar-expanded-w: 212px;
            --sidebar-left: 0.45rem;
            --sidebar-top: 5.35rem;
            --sidebar-gap: 0.22rem;
        }

        body.has-global-follow-sidebar .container {
            padding-left: calc(var(--sidebar-left) + var(--sidebar-collapsed-w) + 0.9rem);
            transition: padding-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        body.has-global-follow-sidebar.sidebar-expanded .container {
            padding-left: calc(var(--sidebar-left) + var(--sidebar-expanded-w) + 0.9rem);
        }

        body.has-global-follow-sidebar #followed-clubs-section {
            position: fixed;
            top: var(--sidebar-top);
            left: var(--sidebar-left);
            width: var(--sidebar-collapsed-w);
            z-index: 95;
            overflow: hidden;
            border-radius: 0.8rem;
            background: var(--surface);
            border: 1px solid var(--color-border-light);
            box-shadow: 0 1px 4px rgba(15, 23, 42, 0.07);
            padding: 0.45rem 0.3rem;
            transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        body.has-global-follow-sidebar #followed-clubs-section.sidebar-expanded {
            width: var(--sidebar-expanded-w);
        }

        body.has-global-follow-sidebar .sidebar-toggle-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 var(--sidebar-icon-size);
            width: var(--sidebar-icon-size);
            height: var(--sidebar-icon-size);
            border: 0;
            background: transparent;
            border-radius: 0.5rem;
            cursor: pointer;
            color: var(--text-default);
            font-size: 1.05rem;
            line-height: 1;
            transition: background-color 0.15s ease, transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        }

        body.has-global-follow-sidebar .sidebar-toggle-btn:hover {
            background: var(--surface-subtle);
        }

        body.has-global-follow-sidebar .sidebar-toggle-btn:active {
            transform: scale(0.82);
            background: var(--color-border-light);
        }

        body.sidebar-expanded .sidebar-toggle-btn:active {
            transform: scale(0.82);
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-follow-rail__toolbar {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 0;
            margin: 0 0 0.45rem;
            padding: 0;
            border: 0;
            background: transparent;
            box-shadow: none;
            overflow: hidden;
            min-height: var(--sidebar-icon-size);
            transition: gap 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        body.has-global-follow-sidebar #followed-clubs-section.sidebar-expanded .home-follow-rail__toolbar {
            justify-content: flex-start;
            gap: 0.3rem;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-follow-rail__toolbar-title {
            opacity: 0;
            max-width: 0;
            overflow: hidden;
            white-space: nowrap;
            pointer-events: none;
            color: var(--text-default);
            font-size: 0.86rem;
            font-weight: 700;
            line-height: 1.15;
            transition: opacity 0.18s ease, max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        body.has-global-follow-sidebar #followed-clubs-section.sidebar-expanded .home-follow-rail__toolbar-title {
            opacity: 1;
            max-width: 130px;
            pointer-events: auto;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-follow-rail__list {
            display: grid;
            gap: var(--sidebar-gap);
            max-height: calc(100vh - 12rem);
            overflow-y: auto;
            overflow-x: hidden;
            padding: 0.05rem 0;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-follow-rail__list::-webkit-scrollbar {
            display: none;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-follow-rail__item,
        body.has-global-follow-sidebar #followed-clubs-section .home-follow-rail__item--action {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 0;
            width: 100%;
            height: auto;
            min-height: var(--sidebar-icon-size);
            padding: 0.18rem 0.22rem;
            border-radius: 0.5rem;
            border: 0;
            background: transparent;
            box-shadow: none;
            text-decoration: none;
            color: inherit;
            font-size: 0.81rem;
            transition: background-color 0.15s ease, gap 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        body.has-global-follow-sidebar #followed-clubs-section.sidebar-expanded .home-follow-rail__item,
        body.has-global-follow-sidebar #followed-clubs-section.sidebar-expanded .home-follow-rail__item--action {
            justify-content: flex-start;
            gap: 0.4rem;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-follow-rail__item:hover,
        body.has-global-follow-sidebar #followed-clubs-section .home-follow-rail__item--action:hover {
            background: var(--surface-subtle);
            border-color: transparent;
            box-shadow: none;
            transform: none;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-follow-rail__item--active {
            background: var(--brand-soft);
            border: 0;
            box-shadow: none;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-follow-rail__icon {
            flex: 0 0 var(--sidebar-avatar-size);
            width: var(--sidebar-avatar-size);
            height: var(--sidebar-avatar-size);
            margin-left: auto;
            margin-right: auto;
        }

        body.has-global-follow-sidebar #followed-clubs-section.sidebar-expanded .home-follow-rail__icon {
            margin-left: 0;
            margin-right: 0;
        }

        body.has-global-follow-sidebar .sidebar-club-name {
            opacity: 0;
            max-width: 0;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            font-size: 0.8rem;
            color: var(--text-default);
            pointer-events: none;
            transition: opacity 0.18s ease 0.04s, max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        body.has-global-follow-sidebar #followed-clubs-section.sidebar-expanded .sidebar-club-name {
            opacity: 1;
            max-width: 118px;
            pointer-events: auto;
        }

        body.has-global-follow-sidebar .sidebar-club-dot {
            flex-shrink: 0;
            flex-grow: 0;
            width: 0;
            height: 7px;
            border-radius: 50%;
            background: #3B82F6;
            margin-left: 0;
            opacity: 0;
            overflow: hidden;
            transition: opacity 0.18s ease, width 0.25s cubic-bezier(0.4, 0, 0.2, 1), margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        body.has-global-follow-sidebar #followed-clubs-section.sidebar-expanded .sidebar-club-dot {
            width: 7px;
            margin-left: auto;
            opacity: 1;
        }

        body.has-global-follow-sidebar #followed-clubs-section .home-follow-rail__message {
            opacity: 0;
            max-width: 0;
            overflow: hidden;
            white-space: nowrap;
            font-size: 0.8rem;
            transition: opacity 0.18s ease, max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        body.has-global-follow-sidebar #followed-clubs-section.sidebar-expanded .home-follow-rail__message {
            opacity: 1;
            max-width: 130px;
        }

        body.has-global-follow-sidebar .sidebar-footer {
            overflow: hidden;
            max-height: 0;
            opacity: 0;
            margin-top: 0.3rem;
            transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
        }

        body.has-global-follow-sidebar #followed-clubs-section.sidebar-expanded .sidebar-footer {
            max-height: 2.5rem;
            opacity: 1;
        }

        body.has-global-follow-sidebar .sidebar-footer .home-follow-rail__all-link {
            display: block;
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.74rem;
            font-weight: 600;
            white-space: nowrap;
            padding: 0.28rem 0.3rem;
            border-radius: 0.45rem;
            transition: color 0.15s ease, background-color 0.15s ease;
        }

        body.has-global-follow-sidebar .sidebar-footer .home-follow-rail__all-link:hover {
            color: var(--brand-hover);
            background: var(--surface-subtle);
        }

        @media (max-width: 1280px) {
            body.has-global-follow-sidebar {
                --sidebar-icon-size: 36px;
                --sidebar-avatar-size: 30px;
                --sidebar-collapsed-w: 54px;
                --sidebar-expanded-w: 196px;
                --sidebar-left: 0.35rem;
            }
        }

        @media (max-width: 900px) {
            body.has-global-follow-sidebar .container,
            body.has-global-follow-sidebar.sidebar-expanded .container {
                padding-left: 1rem;
                transition: none;
            }

            body.has-global-follow-sidebar #followed-clubs-section {
                left: 0.5rem;
                width: var(--sidebar-collapsed-w);
            }

            body.has-global-follow-sidebar #followed-clubs-section:not(.sidebar-expanded) .home-follow-rail__list {
                display: none;
            }

            body.has-global-follow-sidebar #followed-clubs-section:not(.sidebar-expanded) .home-follow-rail__toolbar {
                margin-bottom: 0;
            }

            body.has-global-follow-sidebar #followed-clubs-section.sidebar-expanded {
                width: var(--sidebar-expanded-w);
                z-index: 96;
            }

            #sidebar-mobile-backdrop {
                display: none;
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.32);
                z-index: 94;
                cursor: pointer;
            }

            #sidebar-mobile-backdrop.is-visible {
                display: block;
            }
        }
    `;
    document.head.appendChild(style);
}

function getGlobalFollowSidebarMarkup() {
    const allFollowedClubsHref = `${window.location.origin}${APP_BASE_PATH}/frontend/pages/user-profile.html`;
    return `
        <div class="home-follow-rail__toolbar followed-club-float__toolbar">
            <button type="button" class="sidebar-toggle-btn" aria-label="&#x5207;&#x63DB;&#x5074;&#x6B04;" title="&#x5207;&#x63DB;&#x5074;&#x6B04;">&#9776;</button>
            <span class="home-follow-rail__toolbar-title followed-club-float__toolbar-title">&#x8FFD;&#x8E64;&#x793E;&#x5718;</span>
        </div>
        <div id="followed-clubs-container" class="home-follow-rail__list followed-club-float__list" aria-label="Followed clubs rail">
            <div class="home-follow-rail__message followed-club-float__message" aria-hidden="true">...</div>
        </div>
        <div class="sidebar-footer">
            <a id="followed-clubs-all-link" class="home-follow-rail__all-link followed-club-float__all-link" href="${allFollowedClubsHref}" title="&#x67E5;&#x770B;&#x5168;&#x90E8;" aria-label="&#x67E5;&#x770B;&#x5168;&#x90E8;">&#x67E5;&#x770B;&#x5168;&#x90E8; &rarr;</a>
        </div>
    `;
}
function renderGlobalFollowSidebarMessage(nodes) {
    const container = document.getElementById('followed-clubs-container');
    if (!container) return;
    PageUtils.replaceFollowRailChildren(container, Array.isArray(nodes) ? nodes : [nodes]);
}

const SIDEBAR_STORAGE_KEY = 'followSidebarExpanded';

function setupSidebarToggle(section) {
    if (section.dataset.toggleSetup) return;
    section.dataset.toggleSetup = 'true';

    const isMobile = () => window.innerWidth <= 900;

    function setSidebarBtnIcon(btn, isExpanded) {
        btn.innerHTML = isExpanded ? '&#x2715;' : '&#9776;';
        btn.setAttribute('aria-label', isExpanded ? '收合側欄' : '展開側欄');
        btn.title = isExpanded ? '收合側欄' : '展開側欄';
    }

    // Restore desktop state only
    const savedExpanded = localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    if (savedExpanded && !isMobile()) {
        section.classList.add('sidebar-expanded');
        document.body.classList.add('sidebar-expanded');
    }

    // Backdrop for mobile overlay
    let backdrop = document.getElementById('sidebar-mobile-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'sidebar-mobile-backdrop';
        document.body.appendChild(backdrop);
    }

    function closeMobileSidebar() {
        section.classList.remove('sidebar-expanded');
        document.body.classList.remove('sidebar-expanded');
        backdrop.classList.remove('is-visible');
        if (btn) setSidebarBtnIcon(btn, false);
    }

    const btn = section.querySelector('.sidebar-toggle-btn');
    if (!btn) return;

    setSidebarBtnIcon(btn, savedExpanded && !isMobile());

    btn.addEventListener('click', () => {
        const isExpanded = section.classList.toggle('sidebar-expanded');
        document.body.classList.toggle('sidebar-expanded', isExpanded);
        setSidebarBtnIcon(btn, isExpanded);
        if (isMobile()) {
            backdrop.classList.toggle('is-visible', isExpanded);
        } else {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, isExpanded ? 'true' : 'false');
        }
    });

    backdrop.addEventListener('click', closeMobileSidebar);
}

async function renderGlobalFollowSidebar() {
    const user = StorageUtils.getUser();
    const shouldHideForPlatformAdminProfile = !!(user && user.role === 'platform_admin' && isUserProfilePage());
    if (shouldHideForPlatformAdminProfile) {
        const existingSection = document.getElementById('followed-clubs-section');
        if (existingSection) {
            existingSection.remove();
        }
        document.body.classList.remove('has-global-follow-sidebar');
        document.body.classList.remove('sidebar-expanded');
        return;
    }

    if (!shouldRenderGlobalFollowSidebar()) return;

    ensureGlobalFollowSidebarStyles();

    let section = document.getElementById('followed-clubs-section');
    if (!section) {
        section = document.createElement('aside');
        section.id = 'followed-clubs-section';
        section.className = 'home-follow-rail followed-club-float';
        section.style.display = 'block';
        section.innerHTML = getGlobalFollowSidebarMarkup();
    }

    const alertContainer = document.getElementById('alert-container');
    const header = document.querySelector('header');
    const preferredAnchor = alertContainer || header;
    if (preferredAnchor && preferredAnchor.parentNode) {
        const expectedPrev = preferredAnchor;
        const isMountedAfterAnchor = section.previousElementSibling === expectedPrev;
        if (!isMountedAfterAnchor) {
            preferredAnchor.insertAdjacentElement('afterend', section);
        }
    } else if (section.parentNode !== document.body) {
        document.body.appendChild(section);
    }

    document.body.classList.add('has-global-follow-sidebar');
    setupSidebarToggle(section);

    if (!StorageUtils.isLoggedIn()) {
        renderGlobalFollowSidebarMessage(
            PageUtils.createFollowRailActionItem({
                href: getPageLink('login.html'),
                label: '前往登入',
                title: 'Login to view followed clubs',
                ariaLabel: 'Login to view followed clubs',
                modifier: 'action'
            })
        );
        return;
    }

    try {
        const response = await APIClient.get('clubs.php?action=my_follows');
        if (!response.success) {
            renderGlobalFollowSidebarMessage(PageUtils.createFollowRailMessage('!', 'Load failed'));
            return;
        }

        const clubs = response?.data?.clubs || [];

        if (clubs.length === 0) {
            renderGlobalFollowSidebarMessage(
                PageUtils.createFollowRailActionItem({
                    href: `${window.location.origin}${APP_BASE_PATH}/frontend/pages/club-list.html`,
                    label: '+',
                    title: 'Explore club list',
                    ariaLabel: 'Explore club list',
                    modifier: 'action'
                })
            );
            return;
        }

        const container = document.getElementById('followed-clubs-container');
        if (!container) return;
        const activeClubId = PageUtils.getFollowRailActiveClubId();
        const nodes = clubs.map((club) => {
            const clubId = Number(club.club_id) || 0;
            const href = `${getPageLink('club-detail.html')}?id=${clubId}`;
            const isActive = activeClubId > 0 && activeClubId === clubId;
            const item = PageUtils.createFollowRailClubItem(club, href, isActive);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'sidebar-club-name';
            nameSpan.textContent = String(club.club_name || '').trim() || 'Club';
            item.appendChild(nameSpan);

            if (club.activity_badge === 'high_active') {
                const dot = document.createElement('span');
                dot.className = 'sidebar-club-dot';
                item.appendChild(dot);
            }

            return item;
        });
        PageUtils.replaceFollowRailChildren(container, nodes);
    } catch (error) {
        renderGlobalFollowSidebarMessage(PageUtils.createFollowRailMessage('!', 'Temporary load issue'));
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

function getNavActiveSection(pathname) {
    const path = String(pathname || '').toLowerCase().replace(/\/+$/, '');
    const fileName = (path.split('/').pop() || '').toLowerCase();

    if (!fileName || fileName === 'frontend' || fileName === 'index.html') {
        return 'index.html';
    }
    if (fileName === 'club-list.html' || fileName === 'club-detail.html') {
        return 'club-list.html';
    }
    if (fileName === 'events.html' || fileName === 'event-detail.html') {
        return 'events.html';
    }
    if (fileName === 'qa.html' || fileName === 'qa-detail.html') {
        return 'qa.html';
    }
    if (fileName === 'club-admin-dashboard.html') {
        return 'club-admin-dashboard.html';
    }

    // Fallback for unusual Apache path rewrites.
    if (path.includes('/club-admin-dashboard.html')) return 'club-admin-dashboard.html';
    if (path.includes('/club-list.html') || path.includes('/club-detail.html')) return 'club-list.html';
    if (path.includes('/events.html') || path.includes('/event-detail.html')) return 'events.html';
    if (path.includes('/qa.html') || path.includes('/qa-detail.html')) return 'qa.html';

    return '';
}

function applyActiveNavLink() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    const links = Array.from(navLinks.querySelectorAll('a[href]'));
    links.forEach((link) => link.classList.remove('active'));

    const section = getNavActiveSection(window.location.pathname || '');
    if (!section) return;

    let target = null;
    if (section === 'index.html') {
        target = links.find((link) => /index\.html(?:$|\?)/i.test(String(link.getAttribute('href') || '')));
    } else if (section === 'club-admin-dashboard.html') {
        target = links.find((link) => String(link.getAttribute('href') || '').includes('club-admin-dashboard.html'));
    } else {
        target = links.find((link) => String(link.getAttribute('href') || '').includes(section));
    }

    if (target) {
        target.classList.add('active');
    }
}

function getFrontendAssetPath(assetPath) {
    if (!assetPath) return '';
    const cleanPath = String(assetPath).replace(/^\.?\//, '');
    const pathname = window.location.pathname || '';
    const inPagesDir = pathname.includes('/pages/');
    return inPagesDir ? `../${cleanPath}` : cleanPath;
}

function getNavIconPath(fileName) {
    if (!fileName) return '';
    return getFrontendAssetPath(`assets/icons/nav/${fileName}?v=20260504a`);
}

function toRelativeFrontendPath(url) {
    if (!url) return '';

    const pathname = window.location.pathname || '';
    const inPagesDir = pathname.includes('/pages/');
    const prefix = inPagesDir ? '../' : '';

    let normalized = String(url).trim();
    if (!normalized) return '';

    if (/^(https?:)?\/\//i.test(normalized)) {
        try {
            const parsed = new URL(normalized, window.location.origin);
            normalized = parsed.pathname || '';
        } catch (_) {
            return normalized;
        }
    }

    normalized = normalized.replace(/^\/+/, '');

    const appBaseNoSlash = String(APP_BASE_PATH || '').replace(/^\/+|\/+$/g, '');
    if (appBaseNoSlash && normalized.startsWith(`${appBaseNoSlash}/`)) {
        normalized = normalized.slice(appBaseNoSlash.length + 1);
    }

    const frontendRootMarker = '社團活動資訊統整平台/frontend/';
    const markerIndex = normalized.indexOf(frontendRootMarker);
    if (markerIndex >= 0) {
        normalized = normalized.slice(markerIndex + frontendRootMarker.length);
    }

    if (normalized.startsWith('frontend/')) {
        normalized = normalized.slice('frontend/'.length);
    }

    normalized = normalized.replace(/^\.?\//, '');
    if (!normalized) return '';

    if (normalized.startsWith('../') || normalized.startsWith('./')) {
        return normalized;
    }

    return `${prefix}${normalized}`;
}

function ensureNavDropdownStyles() {
    if (document.getElementById('nav-dropdown-style')) return;

    const st = document.createElement('style');
    st.id = 'nav-dropdown-style';
    st.textContent = '.nav-user-widget{position:relative;display:inline-flex;align-items:center;gap:6px}'
        + '.nav-bell-btn,.nav-avatar-trigger{display:inline-flex;align-items:center;justify-content:center;border:none;background:transparent;cursor:pointer;border-radius:999px;color:#374151}'
        + '.nav-bell-btn{width:32px;height:32px}'
        + '.nav-bell-btn:hover,.nav-avatar-trigger:hover{background:#f3f4f6}'
        + '.nav-bell-icon{width:18px;height:18px;display:block}'
        + '.nav-avatar-trigger{padding:2px 6px 2px 2px;gap:6px}'
        + '.nav-avatar-img{width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;display:block}'
        + '.nav-avatar-fallback{display:inline-flex;width:32px;height:32px;border-radius:50%;background:var(--primary-color);color:#fff;align-items:center;justify-content:center;font-weight:700;border:2px solid #e5e7eb}'
        + '.nav-dd-caret{width:14px;height:14px;opacity:.75;transition:transform 0.22s cubic-bezier(0.4,0,0.2,1)}'
        + '.nav-avatar-trigger[aria-expanded="true"] .nav-dd-caret{transform:rotate(180deg)}'
        + '.nav-dd-panel{position:absolute;top:calc(100% + 10px);right:0;width:260px;max-width:calc(100vw - 16px);background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 12px 28px rgba(0,0,0,.14);z-index:9999;overflow:hidden}'
        + '.ndp-head{display:flex;gap:10px;padding:12px;border-bottom:1px solid #f1f5f9;background:#fafafa}'
        + '.ndp-avatar-lg{width:42px;height:42px;border-radius:50%;overflow:hidden;flex-shrink:0;border:1px solid #e5e7eb;background:#fff}'
        + '.ndp-avatar-lg img{width:100%;height:100%;object-fit:cover;display:block}'
        + '.ndp-avatar-lg-fallback{display:flex;width:100%;height:100%;align-items:center;justify-content:center;font-weight:700;color:#fff;background:var(--primary-color)}'
        + '.ndp-name{font-weight:700;color:#111827;line-height:1.2}'
        + '.ndp-mail{font-size:12px;color:#6b7280;word-break:break-all;margin-top:2px}'
        + '.ndp-menu a,.ndp-logout-btn{display:flex;align-items:center;gap:9px;padding:10px 12px;color:#111827;text-decoration:none;font-size:14px;border:none;background:#fff;width:100%;cursor:pointer}'
        + '.ndp-menu a:hover,.ndp-logout-btn:hover{background:#f8fafc}'
        + '.ndp-menu-icon{width:16px;height:16px;flex-shrink:0;display:block;opacity:.86}'
        + '.ndp-logout-wrap{border-top:1px solid #f1f5f9}'
        + '@media(max-width:767px){.nav-dd-panel{position:fixed;top:auto;right:auto}}';
    document.head.appendChild(st);
}

function closeNavDropdown() {
    const panel = document.getElementById('nav-dd-panel');
    const trigger = document.getElementById('nav-avatar-trigger');
    if (panel) {
        panel.style.display = 'none';
        panel.style.top = '';
        panel.style.right = '';
    }
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function updateNavigation() {
    const user = StorageUtils.getUser();
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userDropdown = document.getElementById('user-dropdown');

    const avatarUrl = user && user.avatar_path ? PageUtils.resolveMediaUrl(user.avatar_path) : '';
    const relativeAvatarUrl = toRelativeFrontendPath(avatarUrl);

    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';

        if (userDropdown) {
            ensureNavDropdownStyles();

            const initial = (user.name || '?').charAt(0).toUpperCase();
            const safeInitial = PageUtils.escapeHtml(initial || '?');
            const safeAvatarUrl = PageUtils.escapeAttribute(relativeAvatarUrl || '');
            const bellIcon = PageUtils.escapeAttribute(getNavIconPath('bell.svg'));
            const caretIcon = PageUtils.escapeAttribute(getNavIconPath('chevron-down.svg'));
            const personIcon = PageUtils.escapeAttribute(getNavIconPath('person.svg'));
            const dashboardIcon = PageUtils.escapeAttribute(getNavIconPath('dashboard.svg'));
            const logoutIcon = PageUtils.escapeAttribute(getNavIconPath('logout.svg'));

            const profileAvatar = relativeAvatarUrl
                ? `<img src="${safeAvatarUrl}" alt="">`
                : `<span class="ndp-avatar-lg-fallback">${safeInitial}</span>`;

            const roleLink = user.role === 'platform_admin'
                ? `<a href="${getPageLink('admin-dashboard.html')}"><img class="ndp-menu-icon" src="${dashboardIcon}" alt="">管理員後台</a>`
                : (user.role === 'club_admin'
                    ? `<a href="${getPageLink('club-admin-dashboard.html')}"><img class="ndp-menu-icon" src="${dashboardIcon}" alt="">幹部後台</a>`
                    : '');

            const avatarTriggerContent = relativeAvatarUrl
                ? `<img class="nav-avatar-img" src="${safeAvatarUrl}" alt="個人頭像">`
                : `<span class="nav-avatar-fallback">${safeInitial}</span>`;

            userDropdown.innerHTML = '<div class="nav-user-widget">'
                + `<button class="nav-bell-btn" id="nav-bell-btn" aria-label="通知"><img class="nav-bell-icon" src="${bellIcon}" alt=""></button>`
                + `<button class="nav-avatar-trigger" id="nav-avatar-trigger" aria-label="個人頭像" aria-controls="nav-dd-panel" aria-haspopup="true" aria-expanded="false">${avatarTriggerContent}<img class="nav-dd-caret" src="${caretIcon}" alt=""></button>`
                + '<div class="nav-dd-panel" id="nav-dd-panel" style="display:none">'
                + '<div class="ndp-head">'
                + `<div class="ndp-avatar-lg">${profileAvatar}</div>`
                + '<div class="ndp-user-meta">'
                + `<div class="ndp-name">${PageUtils.escapeHtml(user.name || '')}</div>`
                + `<div class="ndp-mail">${PageUtils.escapeHtml(user.email || '')}</div>`
                + '</div></div>'
                + '<div class="ndp-menu">'
                + `<a href="${getPageLink('user-profile.html')}"><img class="ndp-menu-icon" src="${personIcon}" alt="">個人資料</a>`
                + roleLink
                + '</div>'
                + '<div class="ndp-logout-wrap">'
                + `<button type="button" class="ndp-logout-btn" id="ndp-logout-btn"><img class="ndp-menu-icon" src="${logoutIcon}" alt="">登出</button>`
                + '</div></div></div>';

            userDropdown.style.display = 'inline-block';
            userDropdown.style.cursor = 'default';
            userDropdown.title = '';
            userDropdown.onclick = null;

            const bellBtn = document.getElementById('nav-bell-btn');
            const avatarTrigger = document.getElementById('nav-avatar-trigger');
            const ddPanel = document.getElementById('nav-dd-panel');
            const logoutInlineBtn = document.getElementById('ndp-logout-btn');

            if (bellBtn) {
                bellBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = getPageLink('notifications.html');
                };
            }

            if (avatarTrigger && ddPanel) {
                avatarTrigger.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const open = ddPanel.style.display === 'block';
                    if (open) {
                        closeNavDropdown();
                    } else {
                        if (window.innerWidth <= 767) {
                            const rect = avatarTrigger.getBoundingClientRect();
                            ddPanel.style.top = (rect.bottom + 8) + 'px';
                            ddPanel.style.right = (window.innerWidth - rect.right) + 'px';
                        }
                        ddPanel.style.display = 'block';
                        avatarTrigger.setAttribute('aria-expanded', 'true');
                    }
                };

                if (!document.body.dataset.navDropdownBound) {
                    document.addEventListener('click', (evt) => {
                        const widget = document.querySelector('.nav-user-widget');
                        if (!widget) return;
                        if (!widget.contains(evt.target)) {
                            closeNavDropdown();
                        }
                    });
                    document.body.dataset.navDropdownBound = '1';
                }
            }

            if (ddPanel) {
                ddPanel.querySelectorAll('a').forEach((a) => {
                    a.addEventListener('click', () => closeNavDropdown());
                });
            }

            if (logoutInlineBtn) {
                logoutInlineBtn.onclick = (e) => {
                    e.preventDefault();
                    closeNavDropdown();
                    handleLogout();
                };
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

    applyActiveNavLink();
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




