const homeState = {
    events: [],
    followedClubs: []
};

async function loadPinnedAnnouncements() {
    const container = document.getElementById('pinned-announcements');

    try {
        const response = await APIClient.get('admin.php?action=announcements');
        if (!response.success) {
            if (container) container.innerHTML = '<p>公告載入失敗。</p>';
            return;
        }

        const allAnnouncements = response.data.announcements || [];
        const pinned = allAnnouncements.filter(item => Number(item.is_pinned) === 1);
        const normal = allAnnouncements.filter(item => Number(item.is_pinned) !== 1);
        const sortByLatest = (items) => items.sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at));
        const allSorted = [...sortByLatest(pinned), ...sortByLatest(normal)];

        if (!container) return;
        if (allSorted.length === 0) {
            container.innerHTML = '<p>目前沒有公告。</p>';
            return;
        }

        container.innerHTML = '';
        allSorted.forEach((item, index) => {
            const card = document.createElement('article');
            card.className = 'feed-item-card feed-item-card--announcement';
            card.innerHTML = `
                <button type="button" class="feed-item-link feed-item-link--announcement" data-expand-row="${index}">
                    <div class="feed-item-head">
                        <h3 class="feed-item-title">${escapeHtml(item.title || '未命名公告')}</h3>
                        <span class="feed-item-badge">${Number(item.is_pinned) === 1 ? '置頂' : '公告'}</span>
                    </div>
                    <div class="feed-item-time">${safeDate(item.created_at)}</div>
                    <p class="feed-item-body" data-expand-body>${escapeHtml(item.content || '')}</p>
                </button>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll('button[data-expand-row]').forEach(button => {
            button.addEventListener('click', () => {
                button.classList.toggle('is-expanded');
            });
        });
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

        const clubs = (response.data.clubs || []).slice(0, 8);
        if (!container) return;
        if (clubs.length === 0) {
            container.innerHTML = '<p>目前沒有可顯示的社團。</p>';
            return;
        }

        container.innerHTML = '';
        clubs.forEach(club => {
            const clubId = Number(club.club_id) || 0;
            const tags = (club.tags || []).slice(0, 2).map(tag => `#${escapeHtml(tag.tag_name || '')}`).join(' ');
            const badge = club.activity_badge === 'high_active'
                ? '熱門'
                : (club.activity_badge === 'no_recent_activity' ? '低活躍' : '社團');

            const card = document.createElement('article');
            card.className = 'feed-item-card';
            card.innerHTML = `
                <a href="pages/club-detail.html?id=${clubId}" class="feed-item-link">
                    <div class="feed-item-head">
                        <h3 class="feed-item-title">${escapeHtml(club.club_name || '-')}</h3>
                        <span class="feed-item-badge">${badge}</span>
                    </div>
                    <div class="feed-item-subtitle">${tags || '社團標籤'}</div>
                    <p class="feed-item-body">${escapeHtml(club.description || '')}</p>
                    <div class="feed-item-meta">
                        <span>成員 ${Number(club.member_count) || 0}</span>
                        <span>評分 ${(club.average_rating || 0).toFixed(1)}（${Number(club.reviews_count) || 0}）</span>
                    </div>
                </a>
            `;
            container.appendChild(card);
        });
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
        const events = allEvents.slice(0, 8);

        if (!container) {
            renderUpcomingEventsSummary(allEvents);
            return;
        }

        if (events.length === 0) {
            container.innerHTML = '<p>目前沒有可顯示的活動。</p>';
            renderUpcomingEventsSummary([]);
            return;
        }

        container.innerHTML = '';
        events.forEach((event, index) => {
            const eventId = Number(event.event_id) || 0;
            const eventTitle = normalizeEventTitle(event.event_name, eventId, index + 1);
            const dateText = safeDate(event.event_date);
            const locationText = formatLocation(event.location);

            const card = document.createElement('article');
            card.className = 'feed-item-card';
            card.innerHTML = `
                <a href="pages/event-detail.html?id=${eventId}" class="feed-item-link">
                    <div class="feed-item-head">
                        <h3 class="feed-item-title">${escapeHtml(eventTitle)}</h3>
                        <span class="feed-item-badge">活動</span>
                    </div>
                    <div class="feed-item-subtitle">${escapeHtml(event.club_name || '未指定社團')}</div>
                    <p class="feed-item-body">${escapeHtml(event.description || '')}</p>
                    <div class="feed-item-meta">
                        <span>${dateText}</span>
                        <span>${escapeHtml(locationText)}</span>
                    </div>
                </a>
            `;
            container.appendChild(card);
        });

        renderUpcomingEventsSummary(allEvents);
    } catch (error) {
        console.error('loadFeaturedEvents error:', error);
        if (container) container.innerHTML = '<p>活動載入失敗。</p>';
        homeState.events = [];
        renderUpcomingEventsSummary([]);
    }
}

async function loadFollowedClubs() {
    const section = document.getElementById('followed-clubs-section');

    if (!StorageUtils.isLoggedIn()) {
        if (section) section.style.display = 'none';
        homeState.followedClubs = [];
        return;
    }

    try {
        const response = await APIClient.get('clubs.php?action=my_follows');
        if (!response.success) {
            if (section) section.style.display = 'none';
            homeState.followedClubs = [];
            return;
        }

        const clubs = response.data.clubs || [];
        homeState.followedClubs = clubs;
        renderFollowedClubsRail(clubs);

    } catch (error) {
        console.error('loadFollowedClubs error:', error);
        if (section) section.style.display = 'none';
        homeState.followedClubs = [];
    }
}

function renderFollowedClubsRail(clubs = []) {
    const section = document.getElementById('followed-clubs-section');
    const container = document.getElementById('followed-clubs-container');
    if (!section || !container) return;

    if (!clubs.length) {
        section.style.display = 'none';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const activeClubId = Number(params.get('club_id') || params.get('club') || params.get('id') || 0);
    const maxVisible = getFollowRailMaxVisible();
    const visibleClubs = clubs.slice(0, maxVisible);
    const hiddenCount = Math.max(0, clubs.length - visibleClubs.length);

    section.style.display = 'block';
    container.innerHTML = visibleClubs.map(club => {
        const clubId = Number(club.club_id) || 0;
        const clubName = club.club_name || '未命名社團';
        const activeClass = clubId !== 0 && clubId === activeClubId ? ' home-follow-rail__item--active' : '';
        return `
            <a class="home-follow-rail__item${activeClass}" href="pages/club-detail.html?id=${clubId}" title="${escapeAttribute(clubName)}" aria-label="${escapeAttribute(clubName)}">
                ${renderFollowedClubAvatar(club)}
            </a>
        `;
    }).join('');

    if (hiddenCount > 0) {
        container.insertAdjacentHTML('beforeend', `
            <a class="home-follow-rail__item home-follow-rail__item--more" href="pages/club-list.html" title="還有 ${hiddenCount} 個追蹤社團" aria-label="查看更多追蹤社團">
                <span class="home-follow-rail__more-label">+${hiddenCount}</span>
            </a>
        `);
    }
}

function getFollowRailMaxVisible() {
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1440;
    if (viewportWidth <= 720) return 3;
    if (viewportWidth <= 1040) return 6;
    return 8;
}

function setupFollowedRailResponsive() {
    let timerId = null;
    window.addEventListener('resize', () => {
        if (timerId) window.clearTimeout(timerId);
        timerId = window.setTimeout(() => {
            renderFollowedClubsRail(homeState.followedClubs);
        }, 120);
    });
}

function renderFollowedClubAvatar(club) {
    const clubName = String(club?.club_name || '').trim() || '社團';
    const pixelLogoUrl = (window.PageUtils && typeof PageUtils.getClubPixelAvatarUrl === 'function')
        ? PageUtils.getClubPixelAvatarUrl(club)
        : '';

    if (pixelLogoUrl) {
        const safePixelUrl = escapeAttribute(pixelLogoUrl);
        return `<span class="club-avatar home-follow-rail__icon"><img src="${safePixelUrl}" alt="${escapeAttribute(clubName)} 像素 logo" class="club-avatar__img home-follow-rail__icon-img" data-pixel="true"></span>`;
    }

    const emoji = (window.PageUtils && typeof PageUtils.getClubAvatarEmoji === 'function')
        ? PageUtils.getClubAvatarEmoji(clubName, club?.category_name || club?.category || '', club?.description || '')
        : '';
    const fallbackEmoji = emoji || '🏫';
    return `<span class="club-avatar club-avatar--emoji home-follow-rail__icon" aria-hidden="true">${escapeHtml(fallbackEmoji)}</span>`;
}
function renderUpcomingEventsSummary(events) {
    const container = document.getElementById('home-upcoming-events-summary');
    if (!container) return;

    const now = Date.now();
    const sorted = (events || [])
        .slice()
        .sort((a, b) => toTimestamp(a.event_date) - toTimestamp(b.event_date));

    const upcoming = sorted.filter(item => toTimestamp(item.event_date) >= now);
    const target = (upcoming.length ? upcoming : sorted).slice(0, 4);

    if (!target.length) {
        container.innerHTML = '<p class="widget-empty">目前沒有即將開始的活動。</p>';
        return;
    }

    container.innerHTML = target.map((item, index) => {
        const eventId = Number(item.event_id) || 0;
        const title = normalizeEventTitle(item.event_name, eventId, index + 1);
        return `
            <a href="pages/event-detail.html?id=${eventId}" class="home-summary-item home-summary-item--link">
                <div class="home-summary-item__title">${escapeHtml(title)}</div>
                <div class="home-summary-item__time">${safeDate(item.event_date)}</div>
                <div class="home-summary-item__meta">${escapeHtml(formatLocation(item.location))}</div>
            </a>
        `;
    }).join('');
}

function setupUnifiedFeedTabs() {
    const tabs = Array.from(document.querySelectorAll('.feed-tab'));
    const panels = Array.from(document.querySelectorAll('.feed-panel'));
    const moreBtn = document.getElementById('feed-more-btn');

    if (!tabs.length || !panels.length || !moreBtn) return;

    const setActive = (panelKey) => {
        tabs.forEach(tab => {
            const active = tab.dataset.panel === panelKey;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        panels.forEach(panel => {
            panel.classList.toggle('is-active', panel.dataset.panel === panelKey);
        });

        moreBtn.textContent = '查看更多';
        const activeList = document.querySelector(`.feed-panel[data-panel="${panelKey}"] .feed-stream-list`);
        if (activeList) activeList.classList.add('feed-stream-list--collapsed');
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => setActive(tab.dataset.panel));
    });

    moreBtn.addEventListener('click', () => {
        const activePanel = document.querySelector('.feed-panel.is-active .feed-stream-list');
        if (!activePanel) return;
        const collapsed = activePanel.classList.toggle('feed-stream-list--collapsed');
        moreBtn.textContent = collapsed ? '查看更多' : '收合內容';
    });

    setActive('announcements');
}

function setupSearchFilters() {
    const searchType = document.getElementById('search-type');
    const clubsFilters = document.getElementById('clubs-filters');
    const eventsFilters = document.getElementById('events-filters');
    const qaFilters = document.getElementById('qa-filters');

    searchType.addEventListener('change', function () {
        clubsFilters.style.display = 'none';
        eventsFilters.style.display = 'none';
        qaFilters.style.display = 'none';

        if (this.value === 'clubs') clubsFilters.style.display = 'grid';
        if (this.value === 'events') eventsFilters.style.display = 'grid';
        if (this.value === 'qa') qaFilters.style.display = 'grid';
    });

    document.getElementById('advanced-search-form').addEventListener('submit', function (e) {
        e.preventDefault();
        performAdvancedSearch();
    });

    document.getElementById('clear-search').addEventListener('click', function () {
        document.getElementById('advanced-search-form').reset();
        clubsFilters.style.display = 'grid';
        eventsFilters.style.display = 'none';
        qaFilters.style.display = 'none';
    });
}

async function loadClubCategories() {
    try {
        const response = await APIClient.get('clubs.php?action=categories');
        if (!response.success) return;

        const select = document.getElementById('club-category');
        response.data.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.category_id;
            option.textContent = category.category_name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function performAdvancedSearch() {
    const searchType = document.getElementById('search-type').value;
    const keyword = document.getElementById('search-keyword').value.trim();
    const params = new URLSearchParams();
    params.append('search', keyword);

    if (searchType === 'clubs') {
        const category = document.getElementById('club-category').value;
        const feeRange = document.getElementById('club-fee-range').value;

        if (category) params.append('category_id', category);
        if (feeRange === '0-500') params.append('max_fee', '500');
        if (feeRange === '500-1000') {
            params.append('min_fee', '500');
            params.append('max_fee', '1000');
        }
        if (feeRange === '1000+') params.append('min_fee', '1000');

        window.location.href = `pages/club-list.html?${params.toString()}`;
        return;
    }

    if (searchType === 'events') {
        const dateFrom = document.getElementById('event-date-from').value;
        const dateTo = document.getElementById('event-date-to').value;
        const feeRange = document.getElementById('event-fee-range').value;

        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (feeRange === 'free') params.append('max_fee', '0');
        if (feeRange === '0-100') params.append('max_fee', '100');
        if (feeRange === '100+') params.append('min_fee', '100');

        window.location.href = `pages/events.html?${params.toString()}`;
        return;
    }

    const status = document.getElementById('qa-status').value;
    if (status) params.append('status', status);
    window.location.href = `pages/qa.html?${params.toString()}`;
}

function toTimestamp(value) {
    const ts = new Date(value || 0).getTime();
    return Number.isFinite(ts) ? ts : 0;
}

function escapeHtml(value) {
    if (window.PageUtils && typeof PageUtils.escapeHtml === 'function') {
        return PageUtils.escapeHtml(value ?? '');
    }
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    if (window.PageUtils && typeof PageUtils.escapeAttribute === 'function') {
        return PageUtils.escapeAttribute(value ?? '');
    }
    return escapeHtml(value ?? '');
}

function safeDate(value) {
    if (window.PageUtils && typeof PageUtils.formatDate === 'function') {
        return PageUtils.formatDate(value);
    }
    if (!value) return '-';
    return new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(value));
}

function normalizeEventTitle(title, eventId, index) {
    const raw = String(title || '').trim();
    if (!raw) return `活動 #${eventId || index}`;

    const noisyPattern = /^([A-Z]{1,4}\d{2,}|[A-Z]{1,4})?\s*活動\s*\d{4,}$/i;
    if (noisyPattern.test(raw) || /\d{5,}/.test(raw)) return `活動 #${eventId || index}`;

    return raw;
}

function formatLocation(location) {
    const value = String(location || '').trim();
    return value || '待確認地點';
}

window.addEventListener('DOMContentLoaded', async function () {
    if (typeof hydrateUserFromSession === 'function') {
        await hydrateUserFromSession();
    }
    if (typeof updateNavigation === 'function') {
        updateNavigation();
    }

    setupUnifiedFeedTabs();
    setupFollowedRailResponsive();
    loadPinnedAnnouncements();
    await loadFollowedClubs();
    loadFeaturedClubs();
    loadFeaturedEvents();
    loadClubCategories();
    setupSearchFilters();
});



