const FEED_PAGE_SIZE = 5;

const feedState = {
    announcements: { data: [], page: 1 },
    clubs:         { data: [], page: 1 },
    events:        { data: [], page: 1 }
};

/* ── Card builders ── */

function buildAnnouncementCard(item, globalIndex) {
    const isPinned = Number(item.is_pinned) === 1;
    const badgeClass = isPinned ? 'feed-item-badge--accent' : 'feed-item-badge--neutral';
    const card = document.createElement('article');
    card.className = 'feed-item-card feed-item-card--announcement';
    card.innerHTML = `
        <button type="button" class="feed-item-link feed-item-link--announcement" data-expand-row="${globalIndex}">
            <div class="feed-item-head">
                <h3 class="feed-item-title">${escapeHtml(item.title || '未命名公告')}</h3>
                <span class="feed-item-badge ${badgeClass}">${isPinned ? '置頂' : '公告'}</span>
            </div>
            <div class="feed-item-time">${safeDate(item.created_at)}</div>
            <p class="feed-item-body" data-expand-body>${escapeHtml(item.content || '')}</p>
        </button>
    `;
    card.querySelector('button').addEventListener('click', function () {
        this.classList.toggle('is-expanded');
    });
    return card;
}

function buildClubCard(club) {
    const clubId = Number(club.club_id) || 0;
    const tags = (club.tags || []).slice(0, 2).map(t => `#${escapeHtml(t.tag_name || '')}`).join(' ');
    const isHot = club.activity_badge === 'high_active';
    const isQuiet = club.activity_badge === 'no_recent_activity';
    const badgeText = isHot ? '熱門' : (isQuiet ? '低活躍' : '社團');
    const badgeClass = isHot ? 'feed-item-badge--accent' : (isQuiet ? 'feed-item-badge--neutral' : '');
    const card = document.createElement('article');
    card.className = 'feed-item-card';
    card.innerHTML = `
        <a href="pages/club-detail.html?id=${clubId}" class="feed-item-link">
            <div class="feed-item-head">
                <h3 class="feed-item-title">${escapeHtml(club.club_name || '-')}</h3>
                <span class="feed-item-badge ${badgeClass}">${badgeText}</span>
            </div>
            <div class="feed-item-subtitle">${tags || '社團標籤'}</div>
            <p class="feed-item-body">${escapeHtml(club.description || '')}</p>
            <div class="feed-item-meta">
                <span>成員 ${Number(club.member_count) || 0}</span>
                <span>評分 ${(club.average_rating || 0).toFixed(1)}（${Number(club.reviews_count) || 0}）</span>
                ${club.last_activity_at ? `<span class="feed-item-meta__updated">最後更新 ${safeDate(club.last_activity_at)}</span>` : ''}
            </div>
        </a>
    `;
    return card;
}

function buildEventCard(event, globalIndex) {
    const eventId = Number(event.event_id) || 0;
    const title = normalizeEventTitle(event.event_name, eventId, globalIndex + 1);
    const locStr   = String(event.location || '').trim();
    const _mapsUrl = extractMapsUrl(locStr);
    const mapsAttr = (_mapsUrl && !locationLabel(locStr)) ? ` data-maps-url="${escapeHtml(_mapsUrl)}"` : '';
    const card = document.createElement('article');
    card.className = 'feed-item-card';
    card.innerHTML = `
        <a href="pages/event-detail.html?id=${eventId}" class="feed-item-link">
            <div class="feed-item-head">
                <h3 class="feed-item-title">${escapeHtml(title)}</h3>
                <span class="feed-item-badge">活動</span>
            </div>
            <div class="feed-item-subtitle">${escapeHtml(event.club_name || '未指定社團')}</div>
            <p class="feed-item-body">${escapeHtml(event.description || '')}</p>
            <div class="feed-item-meta">
                <span>${safeDate(event.event_date)}</span>
                <span${mapsAttr}>${escapeHtml(formatLocation(locStr))}</span>
            </div>
        </a>
    `;
    return card;
}

/* ── Pagination renderer ── */

function renderPagination(panelKey) {
    const pagination = document.getElementById('feed-pagination');
    if (!pagination) return;

    const activePanel = document.querySelector('.feed-panel.is-active');
    if (activePanel && activePanel.dataset.panel !== panelKey) return;

    const state = feedState[panelKey];
    const total = state.data.length;
    const totalPages = Math.ceil(total / FEED_PAGE_SIZE);
    const page = state.page;

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    pagination.innerHTML = `
        <button class="feed-pagination__btn" data-action="prev" ${page <= 1 ? 'disabled' : ''}>&#8592;</button>
        <span class="feed-pagination__info">第 ${page} / ${totalPages} 頁</span>
        <button class="feed-pagination__btn" data-action="next" ${page >= totalPages ? 'disabled' : ''}>&#8594;</button>
    `;

    pagination.querySelector('[data-action="prev"]').addEventListener('click', () => {
        if (feedState[panelKey].page > 1) {
            feedState[panelKey].page--;
            renderFeedPage(panelKey);
        }
    });
    pagination.querySelector('[data-action="next"]').addEventListener('click', () => {
        if (feedState[panelKey].page < totalPages) {
            feedState[panelKey].page++;
            renderFeedPage(panelKey);
        }
    });
}

/* ── Page renderer ── */

function renderFeedPage(panelKey) {
    const idMap = { announcements: 'pinned-announcements', clubs: 'featured-clubs', events: 'featured-events' };
    const container = document.getElementById(idMap[panelKey]);
    if (!container) return;

    const state = feedState[panelKey];
    const { data, page } = state;
    const start = (page - 1) * FEED_PAGE_SIZE;
    const pageData = data.slice(start, start + FEED_PAGE_SIZE);

    container.innerHTML = '';

    if (data.length === 0) {
        const msg = { announcements: '目前沒有公告。', clubs: '目前沒有可顯示的社團。', events: '目前沒有可顯示的活動。' };
        container.innerHTML = `<p>${msg[panelKey]}</p>`;
        renderPagination(panelKey);
        return;
    }

    pageData.forEach((item, i) => {
        let card;
        if (panelKey === 'announcements') card = buildAnnouncementCard(item, start + i);
        else if (panelKey === 'clubs')     card = buildClubCard(item);
        else                               card = buildEventCard(item, start + i);
        container.appendChild(card);
    });

    if (panelKey === 'events') resolveMapLocations(container);
    renderPagination(panelKey);
}

/* ── Data loaders ── */

async function loadPinnedAnnouncements() {
    const container = document.getElementById('pinned-announcements');
    try {
        const response = await APIClient.get('admin.php?action=announcements');
        if (!response.success) {
            if (container) container.innerHTML = '<p>公告載入失敗。</p>';
            return;
        }
        const all = response.data.announcements || [];
        const pinned = all.filter(i => Number(i.is_pinned) === 1);
        const normal = all.filter(i => Number(i.is_pinned) !== 1);
        const sortDesc = arr => arr.sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at));
        feedState.announcements.data = [...sortDesc(pinned), ...sortDesc(normal)];
        feedState.announcements.page = 1;
        renderFeedPage('announcements');
    } catch (error) {
        console.error('loadPinnedAnnouncements error:', error);
        if (container) container.innerHTML = '<p>公告載入失敗。</p>';
    }
}

async function loadFeaturedClubs() {
    const container = document.getElementById('featured-clubs');
    try {
        const response = await APIClient.get('clubs.php');
        if (!response.success) {
            if (container) container.innerHTML = '<p>社團載入失敗。</p>';
            return;
        }
        feedState.clubs.data = response.data.clubs || [];
        feedState.clubs.page = 1;
        renderFeedPage('clubs');
    } catch (error) {
        console.error('loadFeaturedClubs error:', error);
        if (container) container.innerHTML = '<p>社團載入失敗。</p>';
    }
}

async function loadFeaturedEvents() {
    const container = document.getElementById('featured-events');
    try {
        const response = await APIClient.get('events.php');
        if (!response.success) {
            if (container) container.innerHTML = '<p>活動載入失敗。</p>';
            homeState.events = [];
            renderUpcomingEventsSummary([]);
            return;
        }
        const allEvents = response.data.events || [];
        homeState.events = allEvents.slice();
        feedState.events.data = allEvents;
        feedState.events.page = 1;
        renderFeedPage('events');
        renderUpcomingEventsSummary(allEvents);
    } catch (error) {
        console.error('loadFeaturedEvents error:', error);
        if (container) container.innerHTML = '<p>活動載入失敗。</p>';
        homeState.events = [];
        renderUpcomingEventsSummary([]);
    }
}

/* ── Tab setup ── */

function setupUnifiedFeedTabs() {
    const tabs   = Array.from(document.querySelectorAll('.feed-tab'));
    const panels = Array.from(document.querySelectorAll('.feed-panel'));

    if (!tabs.length || !panels.length) return;

    const setActive = (panelKey) => {
        tabs.forEach(tab => {
            const active = tab.dataset.panel === panelKey;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        panels.forEach(panel => {
            panel.classList.toggle('is-active', panel.dataset.panel === panelKey);
        });
        feedState[panelKey].page = 1;
        renderFeedPage(panelKey);
    };

    tabs.forEach(tab => tab.addEventListener('click', () => setActive(tab.dataset.panel)));
    setActive('announcements');
}

/* ── Right rail ── */

const homeState = { events: [] };

function renderUpcomingEventsSummary(events) {
    const container = document.getElementById('home-upcoming-events-summary');
    if (!container) return;

    const now = Date.now();
    const sorted = (events || []).slice().sort((a, b) => toTimestamp(a.event_date) - toTimestamp(b.event_date));
    const upcoming = sorted.filter(i => toTimestamp(i.event_date) >= now);
    const target = (upcoming.length ? upcoming : sorted).slice(0, 4);

    if (!target.length) {
        container.innerHTML = '<p class="widget-empty">目前沒有即將開始的活動。</p>';
        return;
    }

    container.innerHTML = target.map((item, index) => {
        const eventId = Number(item.event_id) || 0;
        const title = normalizeEventTitle(item.event_name, eventId, index + 1);
        const locStr   = String(item.location || '').trim();
        const _mapsUrl = extractMapsUrl(locStr);
        const mapsAttr = (_mapsUrl && !locationLabel(locStr)) ? ` data-maps-url="${escapeHtml(_mapsUrl)}"` : '';
        return `
            <a href="pages/event-detail.html?id=${eventId}" class="home-summary-item home-summary-item--link">
                <div class="home-summary-item__title">${escapeHtml(title)}</div>
                <div class="home-summary-item__time">${safeDate(item.event_date)}</div>
                <div class="home-summary-item__meta"${mapsAttr}>${escapeHtml(formatLocation(locStr))}</div>
            </a>
        `;
    }).join('');
    resolveMapLocations(container);
}

/* ── Search ── */

function setupSearchFilters() {
    const searchType    = document.getElementById('search-type');
    const clubsFilters  = document.getElementById('clubs-filters');
    const eventsFilters = document.getElementById('events-filters');
    const qaFilters     = document.getElementById('qa-filters');

    searchType.addEventListener('change', function () {
        clubsFilters.style.display  = 'none';
        eventsFilters.style.display = 'none';
        qaFilters.style.display     = 'none';
        if (this.value === 'clubs')  clubsFilters.style.display  = 'grid';
        if (this.value === 'events') eventsFilters.style.display = 'grid';
        if (this.value === 'qa')     qaFilters.style.display     = 'grid';
    });

    document.getElementById('advanced-search-form').addEventListener('submit', function (e) {
        e.preventDefault();
        performAdvancedSearch();
    });

    document.getElementById('clear-search').addEventListener('click', function () {
        document.getElementById('advanced-search-form').reset();
        clubsFilters.style.display  = 'grid';
        eventsFilters.style.display = 'none';
        qaFilters.style.display     = 'none';
    });
}

async function loadClubCategories() {
    try {
        const response = await APIClient.get('clubs.php?action=categories');
        if (!response.success) return;
        const select = document.getElementById('club-category');
        response.data.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.category_id;
            option.textContent = cat.category_name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function performAdvancedSearch() {
    const searchType = document.getElementById('search-type').value;
    const keyword    = document.getElementById('search-keyword').value.trim();
    const params     = new URLSearchParams();
    params.append('search', keyword);

    if (searchType === 'clubs') {
        const category = document.getElementById('club-category').value;
        const feeRange = document.getElementById('club-fee-range').value;
        if (category) params.append('category_id', category);
        if (feeRange === '0-500')    params.append('max_fee', '500');
        if (feeRange === '500-1000') { params.append('min_fee', '500'); params.append('max_fee', '1000'); }
        if (feeRange === '1000+')    params.append('min_fee', '1000');
        window.location.href = `pages/club-list.html?${params}`;
        return;
    }

    if (searchType === 'events') {
        const regStart = document.getElementById('event-reg-start').value;
        const regEnd   = document.getElementById('event-reg-end').value;
        const dateFrom = document.getElementById('event-date-from').value;
        const dateTo   = document.getElementById('event-date-to').value;
        const feeRange = document.getElementById('event-fee-range').value;
        if (regStart) params.append('reg_start_from', regStart);
        if (regEnd)   params.append('deadline_to', regEnd);
        if (dateFrom) params.append('event_start_from', dateFrom);
        if (dateTo)   params.append('event_end_to', dateTo);
        if (feeRange === 'free')  params.append('max_fee', '0');
        if (feeRange === '0-100') params.append('max_fee', '100');
        if (feeRange === '100+')  params.append('min_fee', '100');
        window.location.href = `pages/events.html?${params}`;
        return;
    }

    const status = document.getElementById('qa-status').value;
    if (status) params.append('status', status);
    window.location.href = `pages/qa.html?${params}`;
}

/* ── Utilities ── */

function toTimestamp(value) {
    const ts = new Date(value || 0).getTime();
    return Number.isFinite(ts) ? ts : 0;
}

function escapeHtml(value) {
    if (window.PageUtils && typeof PageUtils.escapeHtml === 'function') return PageUtils.escapeHtml(value ?? '');
    return String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    if (window.PageUtils && typeof PageUtils.escapeAttribute === 'function') return PageUtils.escapeAttribute(value ?? '');
    return escapeHtml(value ?? '');
}

function safeDate(value) {
    if (window.PageUtils && typeof PageUtils.formatDate === 'function') return PageUtils.formatDate(value);
    if (!value) return '-';
    return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function normalizeEventTitle(title, eventId, index) {
    const raw = String(title || '').trim();
    if (!raw) return `活動 #${eventId || index}`;
    const noisyPattern = /^([A-Z]{1,4}\d{2,}|[A-Z]{1,4})?\s*活動\s*\d{4,}$/i;
    if (noisyPattern.test(raw) || /\d{5,}/.test(raw)) return `活動 #${eventId || index}`;
    return raw;
}

const MAPS_URL_RE   = /https?:\/\/(?:www\.)?(?:(?:[a-z0-9-]+\.)?google\.[^\/\s]+\/maps(?:[/?#][^\s]*)?|maps\.app\.goo\.gl\/\S+|goo\.gl\/maps\/\S+)/i;
const extractMapsUrl = (v) => { const m = String(v || '').match(MAPS_URL_RE); return m ? m[0] : null; };
const locationLabel  = (v) => String(v || '').replace(MAPS_URL_RE, '').trim();

function formatLocation(location) {
    const value = String(location || '').trim();
    if (!value) return '待確認地點';
    const label = locationLabel(value);
    if (label) return label;
    if (extractMapsUrl(value)) return 'Google 地圖';
    return value;
}

async function resolveMapLocation(mapsUrl) {
    try {
        const res = await APIClient.get(`location-preview.php?url=${encodeURIComponent(mapsUrl)}`);
        if (res && res.success && res.place_name) return res.place_name;
    } catch (e) {}
    return null;
}

async function resolveMapLocations(container) {
    const els = container.querySelectorAll('[data-maps-url]');
    if (!els.length) return;
    await Promise.all(Array.from(els).map(async el => {
        const url = el.getAttribute('data-maps-url');
        const name = await resolveMapLocation(url);
        if (name) { el.textContent = name; el.removeAttribute('data-maps-url'); }
    }));
}

/* ── Init ── */

window.addEventListener('DOMContentLoaded', async function () {
    if (typeof hydrateUserFromSession === 'function') await hydrateUserFromSession();
    if (typeof updateNavigation === 'function') updateNavigation();

    setupUnifiedFeedTabs();
    loadPinnedAnnouncements();
    loadFeaturedClubs();
    loadFeaturedEvents();
    loadClubCategories();
    setupSearchFilters();
});
