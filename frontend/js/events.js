        let currentPage = 1;
        let selectedFilter = 'open';
        let clubCategories = [];

        const MONTHS_ZH = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
        const WEEKDAYS_ZH = ['日','一','二','三','四','五','六'];

        function getEventUrlParams() {
            const params = new URLSearchParams(window.location.search);
            return {
                search: params.get('search') || '',
                filter: params.get('filter') || '',
                clubId: params.get('club_id') || params.get('club') || '',
                categoryId: params.get('category_id') || '',
                eventStartFrom: params.get('event_start_from') || params.get('date_from') || '',
                eventEndTo: params.get('event_end_to') || '',
                deadlineTo: params.get('deadline_to') || params.get('date_to') || '',
                regStartFrom: params.get('reg_start_from') || ''
            };
        }

        async function loadClubCategories() {
            try {
                const response = await APIClient.get('clubs.php?action=categories');
                if (!response.success) return;

                const HIDDEN_CATEGORY_NAMES = new Set(['綜合性', '宗教性']);
                clubCategories = (response.data.categories || []).filter(cat =>
                    !HIDDEN_CATEGORY_NAMES.has(String(cat.category_name || '').trim())
                );
                const categorySelect = document.getElementById('club-category-filter');
                clubCategories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.category_id;
                    option.textContent = category.category_name;
                    categorySelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error:', error);
            }
        }

        async function loadClubsByCategory(categoryId) {
            const clubSelect = document.getElementById('club-filter');
            clubSelect.innerHTML = '';

            if (!categoryId) {
                clubSelect.disabled = true;
                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = '請先選擇類別';
                clubSelect.appendChild(placeholder);
                return;
            }

            try {
                const response = await APIClient.get(`clubs.php?action=by_category&category_id=${encodeURIComponent(categoryId)}`);
                if (!response.success) return;

                const clubs = response.data.clubs || [];
                const allOption = document.createElement('option');
                allOption.value = '';
                allOption.textContent = '全部社團';
                clubSelect.appendChild(allOption);

                clubs.forEach(club => {
                    const option = document.createElement('option');
                    option.value = club.club_id;
                    option.textContent = club.club_name;
                    clubSelect.appendChild(option);
                });

                clubSelect.disabled = false;
            } catch (error) {
                console.error('Error:', error);
            }
        }

        function renderEventFilters() {
            const container = document.getElementById('event-filters');
            container.innerHTML = '';

            const filters = [
                { key: 'open', label: '報名中' },
                { key: 'not_open', label: '尚未開放' },
                { key: 'closed', label: '已截止' }
            ];

            filters.forEach(filter => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `badge badge-filter${selectedFilter === filter.key ? ' is-selected' : ''}`;
                button.textContent = filter.label;
                button.addEventListener('click', () => {
                    selectedFilter = filter.key;
                    currentPage = 1;
                    renderEventFilters();
                    loadEvents();
                });
                container.appendChild(button);
            });
        }

        async function loadEvents() {
            const container = document.getElementById('events-container');
            container.innerHTML = `<div class="event-state"><div class="loading"><div class="spinner"></div></div></div>`;

            const countEl = document.getElementById('result-count');
            if (countEl) countEl.textContent = '搜尋中...';

            try {
                ['event-start-from', 'deadline-to', 'reg-start-from', 'event-end-to'].forEach(syncDateTimeFromParts);

                const eventStartFrom = document.getElementById('event-start-from').value;
                const deadlineTo     = document.getElementById('deadline-to').value;
                const regStartFrom   = document.getElementById('reg-start-from').value;
                const eventEndTo     = document.getElementById('event-end-to').value;

                const halfHourChecks = [
                    [eventStartFrom, '活動開始時間只能選整點或半點'],
                    [deadlineTo,     '報名截止時間只能選整點或半點'],
                    [regStartFrom,   '報名開始時間只能選整點或半點'],
                    [eventEndTo,     '活動結束時間只能選整點或半點'],
                ];
                for (const [val, msg] of halfHourChecks) {
                    if (val && !isHalfHourAligned(val)) {
                        PageUtils.showAlert(msg, 'error');
                        return;
                    }
                }

                let url = `events.php?page=${currentPage}`;
                const clubFilter = document.getElementById('club-filter').value;
                if (clubFilter) url += `&club_id=${encodeURIComponent(clubFilter)}`;
                const eventSearch = document.getElementById('event-search').value;
                if (eventSearch) url += `&search=${encodeURIComponent(eventSearch)}`;
                if (eventStartFrom) url += `&event_start_from=${encodeURIComponent(eventStartFrom)}`;
                if (deadlineTo)     url += `&deadline_to=${encodeURIComponent(deadlineTo)}`;
                if (regStartFrom)   url += `&reg_start_from=${encodeURIComponent(regStartFrom)}`;
                if (eventEndTo)     url += `&event_end_to=${encodeURIComponent(eventEndTo)}`;

                url += `&filter=${encodeURIComponent(selectedFilter)}`;

                const response = await APIClient.get(url);
                if (response.success) {
                    const pagination = response.data.pagination || {};
                    const total = pagination.total ?? response.data.events.length;
                    if (countEl) countEl.textContent = `共 ${total} 個活動`;
                    const metaEl = document.getElementById('result-count-meta');
                    if (metaEl) metaEl.textContent = `共 ${total} 個活動`;
                    renderEvents(response.data.events);
                    renderPagination(pagination);
                } else {
                    container.innerHTML = `<div class="event-state"><p class="event-state__desc">載入失敗，請稍後再試</p></div>`;
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('events-container').innerHTML = `<div class="event-state"><p class="event-state__desc">發生錯誤，請重新整理</p></div>`;
            }
        }

        function renderEvents(events) {
            const container = document.getElementById('events-container');
            container.innerHTML = '';

            if (!events || events.length === 0) {
                container.innerHTML = `
                    <div class="event-state">
                        <p class="event-state__title">找不到符合的活動</p>
                        <p class="event-state__desc">請嘗試調整篩選條件或關鍵字</p>
                    </div>`;
                return;
            }

            events.forEach(event => {
                const eventDateObj = new Date(event.event_date);

                // Use the backend's authoritative registration_state (single source of truth)
                const regStatus = event.registration_state || 'closed';
                const isOpen = regStatus === 'open';

                const month = MONTHS_ZH[eventDateObj.getMonth()] ?? '';
                const day = eventDateObj.getDate();
                const weekday = WEEKDAYS_ZH[eventDateObj.getDay()] ?? '';

                const registeredCount = Number(event.registered_count) || 0;
                const capacity = Number(event.capacity) || 0;
                const capacityRatio = capacity > 0 ? Math.min(1, registeredCount / capacity) : 0;
                const capacityText = capacity > 0
                    ? `${registeredCount} / ${capacity} 人`
                    : `${registeredCount} 人報名`;

                const formattedDeadline = event.registration_deadline ? PageUtils.formatDate(event.registration_deadline) : '';
                const deadlineText = formattedDeadline ? `截止 ${formattedDeadline}` : '';

                const tagsHtml = (event.tags || [])
                    .map(tag => `<span class="tag tag-primary">#${PageUtils.escapeHtml(tag.tag_name || '')}</span>`)
                    .join('');

                const safeEventName = PageUtils.escapeHtml(event.event_name || '未命名活動');
                const safeClubName = PageUtils.escapeHtml(event.club_name || '-');
                const rawLocation = event.location || '';
                const safeEventId = Number(event.event_id) || 0;
                const eventDetailHref = `event-detail.html?id=${safeEventId}`;

                const locationIsUrl = /^https?:\/\//i.test(rawLocation);
                const locationHtml = locationIsUrl
                    ? `<a href="${PageUtils.escapeHtml(rawLocation)}" target="_blank" rel="noopener noreferrer" class="feed-item-map-link">📍 Google 地圖</a>`
                    : `<span>📍 ${PageUtils.escapeHtml(rawLocation || '-')}</span>`;

                const card = document.createElement('article');
                card.className = 'feed-item-card';
                card.style.cursor = 'pointer';
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('a')) window.location.href = eventDetailHref;
                });
                card.innerHTML = `
                    <div class="feed-item-link">
                        <div class="feed-item-head">
                            <h3 class="feed-item-title"><a href="${eventDetailHref}">${safeEventName}</a></h3>
                            <span class="feed-item-badge ${regStatus === 'open' ? '' : 'feed-item-badge--neutral'}">${regStatus === 'open' ? '報名中' : regStatus === 'not_open' ? '尚未開放' : '已截止'}</span>
                        </div>
                        <div class="feed-item-subtitle">${safeClubName}</div>
                        <div class="feed-item-meta">
                            <span>${month}${day}日 週${weekday}</span>
                            ${locationHtml}
                            <span>${capacityText}</span>
                            ${deadlineText ? `<span>${deadlineText}</span>` : ''}
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        function renderPagination(pagination) {
            const container = document.getElementById('pagination-container');
            container.innerHTML = '';

            const totalPages = Number(pagination.total_pages) || 0;
            const currentPageNum = Number(pagination.current_page) || 1;

            const pageInfoEl = document.getElementById('results-page-info');
            if (pageInfoEl) {
                pageInfoEl.textContent = totalPages > 1 ? `第 ${currentPageNum} / ${totalPages} 頁` : '';
            }

            if (totalPages <= 1) return;

            let html = '<div class="pagination">';

            if (currentPageNum > 1) {
                html += `<button type="button" class="page-btn" onclick="changePage(${currentPageNum - 1})">←</button>`;
            }

            const pages = new Set([1, totalPages, currentPageNum - 1, currentPageNum, currentPageNum + 1]);
            const validPages = Array.from(pages).filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
            let prev = 0;
            validPages.forEach(page => {
                if (prev && page - prev > 1) html += `<span class="page-gap">…</span>`;
                html += page === currentPageNum
                    ? `<span class="page-btn is-active">${page}</span>`
                    : `<button type="button" class="page-btn" onclick="changePage(${page})">${page}</button>`;
                prev = page;
            });

            if (currentPageNum < totalPages) {
                html += `<button type="button" class="page-btn" onclick="changePage(${currentPageNum + 1})">→</button>`;
            }

            html += '</div>';
            container.innerHTML = html;
        }

        function changePage(page) {
            currentPage = page;
            loadEvents();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function isHalfHourAligned(value) {
            if (!value) return false;
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return false;
            return date.getMinutes() % 30 === 0 && date.getSeconds() === 0;
        }

        function initHourSelect(selectId) {
            const select = document.getElementById(selectId);
            if (!select || select.options.length > 0) return;
            for (let i = 0; i < 24; i++) {
                const option = document.createElement('option');
                option.value = String(i).padStart(2, '0');
                option.textContent = `${String(i).padStart(2, '0')} 時`;
                select.appendChild(option);
            }
        }

        function syncDateTimeFromParts(baseId) {
            const hiddenInput = document.getElementById(baseId);
            const dateInput = document.getElementById(`${baseId}-date`);
            const hourSelect = document.getElementById(`${baseId}-hour`);
            const minuteSelect = document.getElementById(`${baseId}-minute`);
            if (!hiddenInput || !dateInput || !hourSelect || !minuteSelect) return;

            const datePart = dateInput.value.trim();
            if (!datePart) {
                hiddenInput.value = '';
                return;
            }
            hiddenInput.value = `${datePart}T${hourSelect.value}:${minuteSelect.value}`;
        }

        function resetFilters() {
            document.getElementById('club-category-filter').value = '';
            const clubSelect = document.getElementById('club-filter');
            clubSelect.disabled = true;
            clubSelect.innerHTML = '<option value="">請先選擇類別</option>';
            document.getElementById('event-search').value = '';
            ['event-start-from', 'deadline-to', 'reg-start-from', 'event-end-to'].forEach(baseId => {
                document.getElementById(`${baseId}-date`).value = '';
                document.getElementById(`${baseId}-hour`).value = '00';
                document.getElementById(`${baseId}-minute`).value = '00';
                document.getElementById(baseId).value = '';
            });
            selectedFilter = 'open';
            renderEventFilters();
            currentPage = 1;
            loadEvents();
        }

        async function applyEventFiltersFromUrl() {
            const params = getEventUrlParams();

            document.getElementById('event-search').value = params.search;
            selectedFilter = ['open', 'not_open', 'closed'].includes(params.filter) ? params.filter : 'open';
            renderEventFilters();

            const hasAdvanced = params.categoryId || params.clubId || params.eventStartFrom
                || params.eventEndTo || params.deadlineTo || params.regStartFrom;
            if (hasAdvanced) openAdvancedFilters();

            if (params.categoryId) {
                document.getElementById('club-category-filter').value = params.categoryId;
                await loadClubsByCategory(params.categoryId);
                if (params.clubId) {
                    document.getElementById('club-filter').value = params.clubId;
                }
            }

            if (params.eventStartFrom) {
                const date = new Date(params.eventStartFrom.replace('T', ' '));
                if (!Number.isNaN(date.getTime())) {
                    document.getElementById('event-start-from-date').value = date.toISOString().slice(0, 10);
                    document.getElementById('event-start-from-hour').value = String(date.getHours()).padStart(2, '0');
                    document.getElementById('event-start-from-minute').value = String(date.getMinutes()).padStart(2, '0');
                    syncDateTimeFromParts('event-start-from');
                }
            }

            if (params.deadlineTo) {
                const date = new Date(params.deadlineTo.replace('T', ' '));
                if (!Number.isNaN(date.getTime())) {
                    document.getElementById('deadline-to-date').value = date.toISOString().slice(0, 10);
                    document.getElementById('deadline-to-hour').value = String(date.getHours()).padStart(2, '0');
                    document.getElementById('deadline-to-minute').value = String(date.getMinutes()).padStart(2, '0');
                    syncDateTimeFromParts('deadline-to');
                }
            }

            if (params.regStartFrom) {
                const date = new Date(params.regStartFrom.replace('T', ' '));
                if (!Number.isNaN(date.getTime())) {
                    document.getElementById('reg-start-from-date').value = date.toISOString().slice(0, 10);
                    document.getElementById('reg-start-from-hour').value = String(date.getHours()).padStart(2, '0');
                    document.getElementById('reg-start-from-minute').value = String(date.getMinutes()).padStart(2, '0');
                    syncDateTimeFromParts('reg-start-from');
                }
            }

            if (params.eventEndTo) {
                const date = new Date(params.eventEndTo.replace('T', ' '));
                if (!Number.isNaN(date.getTime())) {
                    document.getElementById('event-end-to-date').value = date.toISOString().slice(0, 10);
                    document.getElementById('event-end-to-hour').value = String(date.getHours()).padStart(2, '0');
                    document.getElementById('event-end-to-minute').value = String(date.getMinutes()).padStart(2, '0');
                    syncDateTimeFromParts('event-end-to');
                }
            }
        }

        document.getElementById('club-category-filter').addEventListener('change', async (e) => {
            currentPage = 1;
            await loadClubsByCategory(e.target.value);
            loadEvents();
        });

        document.getElementById('club-filter').addEventListener('change', () => {
            currentPage = 1;
            loadEvents();
        });

        let searchDebounce = null;
        document.getElementById('event-search').addEventListener('input', () => {
            currentPage = 1;
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(loadEvents, 250);
        });

        function openAdvancedFilters() {
            const panel = document.getElementById('event-advanced-filters');
            const btn   = document.getElementById('advanced-toggle-btn');
            panel.classList.add('is-open');
            panel.setAttribute('aria-hidden', 'false');
            btn.classList.add('is-active');
            btn.setAttribute('aria-expanded', 'true');
        }

        function closeAdvancedFilters() {
            const panel = document.getElementById('event-advanced-filters');
            const btn   = document.getElementById('advanced-toggle-btn');
            panel.classList.remove('is-open');
            panel.setAttribute('aria-hidden', 'true');
            btn.classList.remove('is-active');
            btn.setAttribute('aria-expanded', 'false');
        }

        window.addEventListener('DOMContentLoaded', function () {
            document.getElementById('advanced-toggle-btn').addEventListener('click', () => {
                const panel = document.getElementById('event-advanced-filters');
                if (panel.classList.contains('is-open')) {
                    closeAdvancedFilters();
                } else {
                    openAdvancedFilters();
                }
            });

            ['event-start-from', 'deadline-to', 'reg-start-from', 'event-end-to'].forEach(baseId => {
                initHourSelect(`${baseId}-hour`);
                const dateInput = document.getElementById(`${baseId}-date`);
                const hourSelect = document.getElementById(`${baseId}-hour`);
                const minuteSelect = document.getElementById(`${baseId}-minute`);
                [dateInput, hourSelect, minuteSelect].forEach(el => {
                    if (el) el.addEventListener('change', () => syncDateTimeFromParts(baseId));
                });
                syncDateTimeFromParts(baseId);
            });

            loadClubCategories().then(async () => {
                await applyEventFiltersFromUrl();
                loadEvents();
            });
        });
