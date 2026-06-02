/**
 * admin-events.js — 行政管理端「活動查詢」（唯讀）
 * 沿用公開活動頁版型（filter card + feed-stream-list 卡片）。
 * 支援：今天 / 本週 / 下週單日 / 任意日期區間 / 社團分類 / 狀態 / 關鍵字
 */

const EVENT_STATUS_LABELS = {
    published: '已發布',
    ongoing:   '進行中',
    completed: '已結束',
    cancelled: '已取消',
    draft:     '草稿',
    archived:  '已封存',
};
const REG_STATE_LABELS = { open: '報名中', closed: '已截止', not_open: '尚未開放' };
const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];

const eventsState = { page: 1, weekMode: null };

function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── 日期工具 ──────────────────────────────────────────────
function fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}
// weekOffset: 0=本週, 1=下週；回傳該週週一
function weekStart(today, weekOffset) {
    const dow  = today.getDay();
    const diff = (dow === 0 ? -6 : 1 - dow) + weekOffset * 7;
    return addDays(today, diff);
}
function cardDateText(dtStr) {
    if (!dtStr) return '';
    const d = new Date(String(dtStr).replace(' ', 'T'));
    if (isNaN(d)) return dtStr;
    const hm = (d.getHours() || d.getMinutes())
        ? ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        : '';
    return `${d.getMonth() + 1}月${d.getDate()}日 週${WEEKDAYS_ZH[d.getDay()]}${hm}`;
}

// ── 快速選取 ──────────────────────────────────────────────
function setRange(from, to) {
    document.getElementById('filter-date-from').value = from ?? '';
    document.getElementById('filter-date-to').value   = to   ?? '';
}
function setPresetActive(btn) {
    document.querySelectorAll('.ae-presets button').forEach(b => b.classList.remove('is-active'));
    if (btn) btn.classList.add('is-active');
}
function setWeekdayActive(btn) {
    document.querySelectorAll('.ae-weekstrip button').forEach(b => b.classList.remove('is-active'));
    if (btn) btn.classList.add('is-active');
}
function clearQuickHighlight() {
    setPresetActive(null);
    setWeekdayActive(null);
    const ws = document.getElementById('ae-weekstrip');
    if (ws) ws.hidden = true;
}

// type: today | tomorrow | this_week | next_week | this_month
function applyRange(type, btn) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let from, to;
    if (type === 'today') {
        from = to = today;
    } else if (type === 'tomorrow') {
        from = to = addDays(today, 1);
    } else if (type === 'this_week') {
        const mon = weekStart(today, 0);
        from = mon; to = addDays(mon, 6);
    } else if (type === 'next_week') {
        const mon = weekStart(today, 1);
        from = mon; to = addDays(mon, 6);
    } else if (type === 'this_month') {
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else {
        return;
    }
    setRange(fmtDate(from), fmtDate(to));

    setPresetActive(btn);
    setWeekdayActive(null);
    const ws = document.getElementById('ae-weekstrip');
    const label = document.getElementById('ae-weekstrip-label');
    if (type === 'this_week' || type === 'next_week') {
        ws.hidden = false;
        eventsState.weekMode = type;
        if (label) label.textContent = type === 'this_week' ? '本週指定日' : '下週指定日';
    } else {
        ws.hidden = true;
        eventsState.weekMode = null;
    }

    eventsState.page = 1;
    doSearch();
}

// dayNum: 1=週一 … 7=週日（本週或下週的指定日）
function applyWeekday(dayNum, btn) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekOffset = eventsState.weekMode === 'this_week' ? 0 : 1;
    const d = addDays(weekStart(today, weekOffset), dayNum - 1);
    setRange(fmtDate(d), fmtDate(d));
    setWeekdayActive(btn);
    eventsState.page = 1;
    doSearch();
}

// ── 狀態提示（loading / empty） ───────────────────────────
function showState(title, desc) {
    document.getElementById('events-container').innerHTML = `
        <div class="event-state">
            ${title ? `<p class="event-state__title">${escapeHtml(title)}</p>` : ''}
            <p class="event-state__desc">${escapeHtml(desc)}</p>
        </div>`;
}
function showLoading() {
    document.getElementById('events-container').innerHTML =
        '<div class="event-state"><div class="loading"><div class="spinner"></div></div></div>';
}

// ── 查詢 ──────────────────────────────────────────────────
async function doSearch() {
    const dateFrom   = document.getElementById('filter-date-from').value;
    const dateTo     = document.getElementById('filter-date-to').value;
    const categoryId = document.getElementById('filter-category').value;
    const status     = document.getElementById('filter-status').value;
    const search     = document.getElementById('filter-search').value.trim();

    const params = new URLSearchParams({ action: 'list', filter: 'none', page: eventsState.page });
    if (dateFrom)   params.set('event_start_from', dateFrom);
    if (dateTo)     params.set('event_end_to',     dateTo);
    if (categoryId) params.set('category_id',      categoryId);
    if (status)     params.set('status',            status);
    if (search)     params.set('search',            search);

    document.getElementById('pagination-container').innerHTML = '';
    document.getElementById('results-page-info').textContent = '';
    document.getElementById('result-count').textContent = '搜尋中…';
    showLoading();

    const response = await APIClient.get(`events.php?${params.toString()}`);
    if (!response.success) {
        PageUtils.showAlert('查詢失敗：' + response.message, 'error');
        document.getElementById('result-count').textContent = '查詢失敗';
        showState('查詢失敗', response.message || '請稍後再試');
        return;
    }

    const events     = response.data?.events ?? [];
    const pagination = response.data?.pagination ?? {};
    renderCards(events);
    renderPagination(pagination);

    const total = pagination.total ?? events.length;
    document.getElementById('result-count').textContent = `共 ${total} 筆活動`;
}

// ── 結果卡片（feed 版型） ─────────────────────────────────
function renderCards(events) {
    const container = document.getElementById('events-container');
    if (!events.length) {
        showState('查無符合條件的活動', '請調整篩選條件、日期或關鍵字');
        return;
    }

    container.innerHTML = '';
    events.forEach(ev => {
        const regState   = ev.registration_state || 'closed';
        const regLabel   = REG_STATE_LABELS[regState] || '已截止';
        const statusLbl  = EVENT_STATUS_LABELS[ev.event_status] || ev.event_status || '';
        const registered = Number(ev.registered_count) || 0;
        const capacity   = Number(ev.capacity) || 0;
        const capacityText = capacity > 0 ? `${registered} / ${capacity} 人` : `${registered} 人報名`;

        const rawLocation = ev.location || '';
        const locationIsUrl = /^https?:\/\//i.test(rawLocation);
        const locationHtml = locationIsUrl
            ? `<a href="${escapeHtml(rawLocation)}" target="_blank" rel="noopener noreferrer" class="feed-item-map-link">📍 Google 地圖</a>`
            : `<span>📍 ${escapeHtml(rawLocation || '-')}</span>`;

        const category = ev.category_name ? ` · ${escapeHtml(ev.category_name)}` : '';

        const card = document.createElement('article');
        card.className = 'feed-item-card';
        card.style.cursor = 'pointer';
        // 後台唯讀檢視：點卡片開同頁 Modal，不跳轉到使用者端 event-detail
        card.addEventListener('click', e => {
            if (!e.target.closest('a')) openEventModal(ev);
        });
        card.innerHTML = `
            <div class="feed-item-link">
                <div class="feed-item-head">
                    <h3 class="feed-item-title">${escapeHtml(ev.event_name || '未命名活動')}</h3>
                    <span class="feed-item-badge ${regState === 'open' ? '' : 'feed-item-badge--neutral'}">${escapeHtml(regLabel)}</span>
                </div>
                <div class="feed-item-subtitle">${escapeHtml(ev.club_name || '-')}${category}</div>
                <div class="feed-item-meta">
                    <span>${escapeHtml(cardDateText(ev.event_date))}</span>
                    ${locationHtml}
                    <span>狀態：${escapeHtml(statusLbl)}</span>
                    <span>${escapeHtml(capacityText)}</span>
                </div>
            </div>`;
        container.appendChild(card);
    });
}

// ── 活動唯讀詳情 Modal（後台不跳轉到使用者端 event-detail） ──
async function openEventModal(listItem) {
    const modal = document.getElementById('event-modal');
    const body  = document.getElementById('event-modal-body');
    if (!modal || !body) return;

    document.getElementById('ae-modal-title').textContent = listItem.event_name || '活動詳情';
    body.innerHTML = '<div class="event-state"><div class="loading"><div class="spinner"></div></div></div>';
    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    const id = Number(listItem.event_id) || 0;
    let res;
    try {
        res = await APIClient.get(`events.php?action=detail&id=${id}`);
    } catch (_) {
        body.innerHTML = '<p class="ae-modal__error">載入失敗，請稍後再試。</p>';
        return;
    }
    // 載入期間若已被關閉，就不要再覆寫內容
    if (modal.hidden) return;
    if (!res || !res.success) {
        body.innerHTML = `<p class="ae-modal__error">載入失敗：${escapeHtml((res && res.message) || '')}</p>`;
        return;
    }
    body.innerHTML = renderEventModal(res.data || {}, listItem);
}

function renderEventModal(e, listItem) {
    const statusLbl = EVENT_STATUS_LABELS[e.event_status] || e.event_status || '-';
    const regLabel  = REG_STATE_LABELS[listItem.registration_state] || '';
    const clubName  = (e.club && e.club.club_name) || listItem.club_name || '-';
    const category  = listItem.category_name ? ` · ${escapeHtml(listItem.category_name)}` : '';

    const registered = Number(e.registered_count) || 0;
    const capacity   = Number(e.capacity) || 0;
    const attendance = Number(e.attendance_count) || 0;
    const capText = capacity > 0 ? `${registered} / ${capacity} 人` : `${registered} 人報名`;

    const loc = e.location || '';
    const locHtml = /^https?:\/\//i.test(loc)
        ? `<a href="${escapeHtml(loc)}" target="_blank" rel="noopener noreferrer">📍 Google 地圖</a>`
        : escapeHtml(loc || '-');

    const startText = cardDateText(e.event_date) || '-';
    const endText   = e.end_date ? cardDateText(e.end_date) : '';
    const timeText  = endText ? `${startText} ～ ${endText}` : startText;

    const coHosts = (e.co_host_clubs || []).map(c => escapeHtml(c.club_name || '')).filter(Boolean);
    const tagsHtml = (e.tags || [])
        .map(t => t.tag_name || t.name || '')
        .filter(Boolean)
        .map(name => `<span class="ae-tag">${escapeHtml(name)}</span>`)
        .join('');
    const desc = escapeHtml(e.description || '').replace(/\n/g, '<br>');

    const row = (label, valueHtml) => `<div class="ae-dl__row"><dt>${label}</dt><dd>${valueHtml}</dd></div>`;

    return `
        <div class="ae-modal__badges">
            <span class="ae-badge">${escapeHtml(statusLbl)}</span>
            ${regLabel ? `<span class="ae-badge ae-badge--muted">${escapeHtml(regLabel)}</span>` : ''}
            <span class="ae-badge ae-badge--muted">${escapeHtml(capText)}${attendance ? `・出席 ${attendance}` : ''}</span>
        </div>
        <dl class="ae-dl">
            ${row('社團', escapeHtml(clubName) + category)}
            ${row('時間', escapeHtml(timeText))}
            ${row('地點', locHtml)}
            ${coHosts.length ? row('協辦社團', coHosts.join('、')) : ''}
            ${tagsHtml ? row('標籤', `<div class="ae-tags">${tagsHtml}</div>`) : ''}
        </dl>
        ${desc ? `<div class="ae-modal__desc"><h3>活動說明</h3><p>${desc}</p></div>` : ''}
    `;
}

function closeEventModal() {
    const modal = document.getElementById('event-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
}

// ── 分頁（沿用 .pagination / .page-btn） ──────────────────
function renderPagination(pagination) {
    const container = document.getElementById('pagination-container');
    container.innerHTML = '';
    const totalPages = Number(pagination.total_pages) || 0;
    const current    = Number(pagination.current_page) || 1;
    eventsState.page = current || 1;

    const pageInfo = document.getElementById('results-page-info');
    if (pageInfo) pageInfo.textContent = totalPages > 1 ? `第 ${current} / ${totalPages} 頁` : '';
    if (totalPages <= 1) return;

    const wrap = document.createElement('div');
    wrap.className = 'pagination';

    const goBtn = (label, page) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'page-btn';
        b.textContent = label;
        b.addEventListener('click', () => { eventsState.page = page; doSearch(); });
        return b;
    };

    if (current > 1) wrap.appendChild(goBtn('←', current - 1));

    const pages = new Set([1, totalPages, current - 1, current, current + 1]);
    const valid = Array.from(pages).filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    let prev = 0;
    valid.forEach(p => {
        if (prev && p - prev > 1) {
            const gap = document.createElement('span');
            gap.className = 'page-gap';
            gap.textContent = '…';
            wrap.appendChild(gap);
        }
        if (p === current) {
            const active = document.createElement('span');
            active.className = 'page-btn is-active';
            active.textContent = String(p);
            wrap.appendChild(active);
        } else {
            wrap.appendChild(goBtn(String(p), p));
        }
        prev = p;
    });

    if (current < totalPages) wrap.appendChild(goBtn('→', current + 1));

    container.appendChild(wrap);
}

// ── 初始化 ────────────────────────────────────────────────
async function loadCategories() {
    const response = await APIClient.get('clubs.php?action=categories');
    if (!response.success) return;
    const sel = document.getElementById('filter-category');
    (response.data?.categories ?? []).forEach(cat => {
        const opt = document.createElement('option');
        opt.value       = cat.category_id;
        opt.textContent = cat.category_name;
        sel.appendChild(opt);
    });
}

function clearFilters() {
    setRange('', '');
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-status').value   = 'published';
    document.getElementById('filter-search').value   = '';
    clearQuickHighlight();
    document.getElementById('pagination-container').innerHTML = '';
    document.getElementById('results-page-info').textContent = '';
    document.getElementById('result-count').textContent = '請設定條件後查詢';
    showState('', '設定條件後按「查詢」，或點上方快速選取。');
    eventsState.page = 1;
}

window._pageInitReady.then(async () => {
    await loadCategories();

    document.querySelectorAll('.ae-presets button').forEach(btn => {
        btn.addEventListener('click', () => applyRange(btn.dataset.range, btn));
    });
    document.querySelectorAll('.ae-weekstrip button').forEach(btn => {
        btn.addEventListener('click', () => applyWeekday(Number(btn.dataset.weekday), btn));
    });

    document.getElementById('search-btn').addEventListener('click', () => {
        eventsState.page = 1;
        clearQuickHighlight();
        doSearch();
    });
    document.getElementById('clear-btn').addEventListener('click', clearFilters);
    document.getElementById('filter-search').addEventListener('keydown', e => {
        if (e.key === 'Enter') { eventsState.page = 1; clearQuickHighlight(); doSearch(); }
    });

    // 活動詳情 Modal：點遮罩 / ✕ 關閉；Esc 關閉
    const modal = document.getElementById('event-modal');
    if (modal) {
        modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeEventModal(); });
    }
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal && !modal.hidden) closeEventModal();
    });
});
