function formatDateTime(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
}

function escapeHtml(v) {
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── 展開抽屜共用狀態 ──────────────────────────────────────
let overviewData  = null;   // dashboard.php summary（loadOverview 取得）
let analyticsData = null;   // club_analytics（loadClubAnalytics 取得）
let trendsData    = null;   // dashboard.php?action=trends（首次展開 KPI 才抓）
let trendsPromise = null;

const OV_PALETTE = ['#7c3aed', '#16a34a', '#2563eb', '#d97706', '#db2777', '#0891b2'];

// ── 手刻 SVG 圖表 helper（零依賴，顏色走 CSS 變數 / 傳入色）──

// 折線＋面積：近 N 個月趨勢。series = [{ym, count}]
function svgSparkline(series) {
    const data = (series || []).map(s => ({ ym: s.ym, v: Number(s.count) || 0 }));
    if (!data.length) return '<p class="ov-empty">尚無資料</p>';
    const W = 240, H = 64, pad = 7, n = data.length;
    const vals = data.map(d => d.v);
    const max = Math.max(1, ...vals);
    const xx = i => pad + (n <= 1 ? (W - 2 * pad) / 2 : i * (W - 2 * pad) / (n - 1));
    const yy = v => H - pad - (v / max) * (H - 2 * pad);
    const pts = vals.map((v, i) => `${xx(i).toFixed(1)},${yy(v).toFixed(1)}`);
    const line = 'M' + pts.join(' L');
    const area = `M${xx(0).toFixed(1)},${(H - pad).toFixed(1)} L${pts.join(' L')} L${xx(n - 1).toFixed(1)},${(H - pad).toFixed(1)} Z`;
    const axis = data.map(d => `<span>${escapeHtml((d.ym || '').slice(5))}</span>`).join('');
    return `<div class="ov-spark">
        <svg class="ov-spark__svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="近 ${n} 個月趨勢">
            <path class="ov-spark__area" d="${area}"/>
            <path class="ov-spark__line" d="${line}" fill="none" vector-effect="non-scaling-stroke"/>
        </svg>
        <div class="ov-spark__axis">${axis}</div>
        <div class="ov-spark__foot">最新一月：<b>${vals[n - 1]}</b></div>
    </div>`;
}

// 甜甜圈：組成比例。segments = [{label, value, color?}]
function svgDonut(segments, centerLabel) {
    const segs = (segments || []).map((s, i) => ({
        label: s.label,
        value: Math.max(0, Number(s.value) || 0),
        color: s.color || OV_PALETTE[i % OV_PALETTE.length],
    }));
    const total = segs.reduce((a, s) => a + s.value, 0);
    const r = 42, cx = 60, cy = 60, sw = 16, C = 2 * Math.PI * r;
    let offset = 0;
    const circles = total > 0 ? segs.map(s => {
        const len = (s.value / total) * C;
        const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}"
            stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"
            transform="rotate(-90 ${cx} ${cy})" />`;
        offset += len;
        return el;
    }).join('') : `<circle class="ov-donut__empty" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="${sw}" />`;
    const legend = segs.map(s => {
        const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
        return `<div class="ov-donut__row">
            <span class="ov-donut__swatch" style="background:${s.color}"></span>
            <span class="ov-donut__label">${escapeHtml(s.label)}</span>
            <span class="ov-donut__val">${s.value}<i>${pct}%</i></span>
        </div>`;
    }).join('');
    return `<div class="ov-donut">
        <div class="ov-donut__chart">
            <svg viewBox="0 0 120 120" role="img" aria-label="${escapeHtml(centerLabel || '')}分佈">${circles}</svg>
            <div class="ov-donut__center"><b>${total}</b>${centerLabel ? `<span>${escapeHtml(centerLabel)}</span>` : ''}</div>
        </div>
        <div class="ov-donut__legend">${legend}</div>
    </div>`;
}

// 水平長條：items = [{label, value}]
function svgHBars(items, unit) {
    const list = (items || []).map(it => ({ label: it.label, value: Number(it.value) || 0 }));
    if (!list.length) return '<p class="ov-empty">尚無資料</p>';
    const max = Math.max(1, ...list.map(it => it.value));
    return `<div class="ov-hbar-list">
        ${list.map(it => {
            const pct = Math.round((it.value / max) * 100);
            return `<div class="ov-hbar-row">
                <span class="ov-hbar-label">${escapeHtml(it.label)}</span>
                <div class="ov-hbar-track"><div class="ov-hbar-fill" style="width:${pct}%;min-width:${it.value > 0 ? '4px' : '0'};"></div></div>
                <span class="ov-hbar-value">${it.value}${unit ? ' ' + escapeHtml(unit) : ''}</span>
            </div>`;
        }).join('')}
    </div>`;
}

function countUp(el, toText, duration) {
    const s = String(toText ?? '-');
    const m = s.match(/^([+\-]?)(\d+(?:\.\d+)?)(.*)$/);
    if (!m) { el.textContent = s; return; }
    const prefix = m[1], endNum = parseFloat(m[2]), suffix = m[3];
    const startNum = 0;
    const isFloat = m[2].includes('.');
    const t0 = performance.now();
    (function tick(now) {
        const p = Math.min((now - t0) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const cur = startNum + (endNum - startNum) * ease;
        el.textContent = prefix + (isFloat ? cur.toFixed(1) : Math.round(cur)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
}

async function loadOverview() {
    try {
        const res = await APIClient.get('dashboard.php');
        if (!res.success) return;
        overviewData = res.data;   // 給展開抽屜的圖表用
        const { users, clubs, events, pending, announcements, generated_at } = res.data;

        const anim = (id, val, dur = 700) => {
            const el = document.getElementById(id);
            if (!el) return;
            countUp(el, val ?? '-', dur);
        };

        // KPI strip
        anim('ov-u-total',    users.total);
        anim('ov-u-new',      (users.new_this_week > 0 ? '+' : '') + users.new_this_week);
        anim('ov-c-active',   clubs.active);
        anim('ov-c-total',    clubs.total);
        anim('ov-e-upcoming', events.upcoming);
        anim('ov-e-published', events.published);
        anim('ov-a-active',   announcements.active);
        anim('ov-a-pinned',   announcements.pinned);

        // Detail cards
        anim('ov-d-u-total',            users.total);
        anim('ov-d-u-students',         users.students);
        anim('ov-d-u-club-admins',      users.club_admins);
        anim('ov-d-u-platform-admins',  users.platform_admins);
        anim('ov-d-u-new',              (users.new_this_week > 0 ? '+' : '') + users.new_this_week);

        anim('ov-d-c-total',   clubs.total);
        anim('ov-d-c-active',  clubs.active);
        anim('ov-d-c-inactive', clubs.inactive);
        anim('ov-d-c-ghost',   clubs.ghost);
        anim('ov-d-c-stale',   clubs.stale);

        anim('ov-d-e-total',         events.total);
        anim('ov-d-e-upcoming',      events.upcoming);
        anim('ov-d-e-published',     events.published);
        anim('ov-d-e-cancelled',     events.cancelled);
        anim('ov-d-a-active',   announcements.active);
        anim('ov-d-a-pinned',   announcements.pinned);
        anim('ov-d-a-expiring', announcements.expiring_soon);
        anim('ov-d-p-reports',  pending.reports);
        anim('ov-d-p-venue',    pending.venue_applications);
        anim('ov-d-p-transfers', pending.transfers);
        anim('ov-d-p-reviews',  pending.reviews);

        // Alert bar chips
        const chipData = [
            { id: 'ov-chip-reports',   val: pending.reports,          label: '待審檢舉',    base: 'chip-red' },
            { id: 'ov-chip-venue',     val: pending.venue_applications, label: '待審場地',  base: 'chip-amber' },
            { id: 'ov-chip-transfers', val: pending.transfers,        label: '待審轉讓',    base: 'chip-amber' },
            { id: 'ov-chip-reviews',   val: pending.reviews,          label: '待審評價',    base: 'chip-amber' },
            { id: 'ov-chip-qa',        val: pending.unanswered_qa,    label: '未回答 Q&A', base: 'chip-amber' },
        ];

        chipData.forEach(({ id, val, label, base }) => {
            const el = document.getElementById(id);
            if (!el) return;
            const n = Number(val ?? 0);
            el.textContent = `${label} ${n}`;
            el.className = 'ov-chip ' + (n > 0 ? base : 'chip-zero');
        });

        const totalPending = ['reports', 'venue_applications', 'transfers', 'reviews', 'unanswered_qa']
            .reduce((s, k) => s + Number(pending[k] ?? 0), 0);
        const alertBar  = document.getElementById('ov-alert-bar');
        const alertLabel = document.getElementById('ov-alert-label');
        if (alertBar) alertBar.classList.toggle('is-clear', totalPending === 0);
        if (alertLabel) alertLabel.textContent = totalPending === 0 ? '✓ 無待處理項目' : '⚠ 待處理';

        const timeEl = document.getElementById('ov-generated-at');
        if (timeEl && generated_at) timeEl.textContent = formatDateTime(generated_at);

    } catch (err) {
        console.error('載入總覽失敗:', err);
    }
}

// ── 展開抽屜：點擊磚塊標頭 → 下拉圖表（首次 lazy 渲染）──────
const OV_CHEVRON = '<svg class="ov-expand-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

const _drawerRendered = new WeakSet();

// trends 只在第一個 KPI 展開時抓一次，之後共用
function ensureTrends() {
    if (trendsData) return Promise.resolve(trendsData);
    if (!trendsPromise) {
        trendsPromise = APIClient.get('dashboard.php?action=trends')
            .then(res => { trendsData = (res && res.success && res.data) ? res.data : {}; return trendsData; })
            .catch(() => { trendsData = {}; return trendsData; });
    }
    return trendsPromise;
}

async function renderDrawerChart(drawer) {
    const kind = drawer.dataset.chart || '';
    const d = overviewData || {};
    const a = analyticsData || {};

    // KPI 趨勢（需 trends API）
    const trendMap = { 'trend-users': 'users', 'trend-clubs': 'clubs', 'trend-events': 'events', 'trend-ann': 'announcements' };
    if (trendMap[kind]) {
        const t = await ensureTrends();
        drawer.innerHTML = svgSparkline((t || {})[trendMap[kind]] || []);
        return;
    }

    if (kind === 'users-dist') {
        const u = d.users || {};
        drawer.innerHTML = svgDonut([
            { label: '學生', value: u.students, color: '#2563eb' },
            { label: '社團幹部', value: u.club_admins, color: '#16a34a' },
            { label: '平台管理員', value: u.platform_admins, color: '#7c3aed' },
        ], '總用戶');
    } else if (kind === 'clubs-health') {
        const c = d.clubs || {};
        drawer.innerHTML = svgDonut([
            { label: '啟用', value: c.active, color: '#16a34a' },
            { label: '停用', value: c.inactive, color: '#d97706' },
        ], '社團') + svgHBars([
            { label: '幽靈社團', value: c.ghost },
            { label: '久未更新', value: c.stale },
        ]);
    } else if (kind === 'events-overview') {
        const e = d.events || {};
        drawer.innerHTML = svgHBars([
            { label: '即將舉行', value: e.upcoming },
            { label: '已發布', value: e.published },
            { label: '已取消', value: e.cancelled },
        ]);
    } else if (kind === 'pending') {
        const p = d.pending || {};
        drawer.innerHTML = svgHBars([
            { label: '待審檢舉', value: p.reports },
            { label: '待審場地', value: p.venue_applications },
            { label: '待審轉讓', value: p.transfers },
            { label: '待審評價', value: p.reviews },
        ]);
    } else if (kind === 'quiz-trend') {
        drawer.innerHTML = svgSparkline((a.quiz && a.quiz.monthly) || []);
    } else if (kind === 'top-rec') {
        drawer.innerHTML = svgHBars((a.top_recommended || []).map(it => ({ label: it.club_name || ('#' + it.club_id), value: it.count })), '次');
    } else if (kind === 'top-popular') {
        drawer.innerHTML = svgHBars((a.popular_clubs || []).map(it => ({ label: it.club_name || ('#' + it.club_id), value: it.followers })), '人');
    }
}

function toggleDrawer(head) {
    const tile = head.closest('[data-expandable]');
    if (!tile) return;
    const drawer = tile.querySelector('.ov-chart-drawer');
    if (!drawer) return;

    if (tile.classList.contains('is-expanded')) {
        tile.classList.remove('is-expanded');
        head.setAttribute('aria-expanded', 'false');
        drawer.style.maxHeight = '0';
        return;
    }

    tile.classList.add('is-expanded');
    head.setAttribute('aria-expanded', 'true');
    const grow = () => { drawer.style.maxHeight = drawer.scrollHeight + 'px'; };
    if (_drawerRendered.has(drawer)) { grow(); return; }
    _drawerRendered.add(drawer);
    Promise.resolve(renderDrawerChart(drawer)).then(grow);
}

function initDrawers() {
    document.addEventListener('click', e => {
        const head = e.target.closest('.ov-expand-head');
        if (head) toggleDrawer(head);
    });
    document.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const head = e.target.closest('.ov-expand-head');
        if (head) { e.preventDefault(); toggleDrawer(head); }
    });
    // 視窗縮放時，已展開的抽屜重新量高度，避免裁切
    window.addEventListener('resize', () => {
        document.querySelectorAll('[data-expandable].is-expanded .ov-chart-drawer').forEach(dr => {
            dr.style.maxHeight = dr.scrollHeight + 'px';
        });
    });
}

// ── 統計分析（社團適配測驗 / 推薦 / 熱門）：可展開卡片 ──────
async function loadClubAnalytics() {
    const panel = document.getElementById('ov-analytics-panel');
    if (!panel) return;

    let response;
    try {
        response = await APIClient.get('admin.php?action=club_analytics');
    } catch (err) {
        panel.innerHTML = '<div class="ov-analytics-loading">載入失敗</div>';
        return;
    }
    if (!response.success) {
        panel.innerHTML = `<div class="ov-analytics-loading">載入失敗：${escapeHtml(response.message || '')}</div>`;
        return;
    }

    analyticsData = response.data;
    const quiz    = response.data.quiz || { total: 0, this_month: 0, monthly: [] };
    const topRec  = response.data.top_recommended || [];
    const popular = response.data.popular_clubs   || [];

    if ((quiz.total ?? 0) === 0 && topRec.length === 0 && popular.length === 0) {
        panel.innerHTML = '<div class="ov-card"><p class="ov-empty">尚無統計資料，等社團適配測驗與追蹤資料累積後，這裡會顯示分析。</p></div>';
        return;
    }

    const head = (title, hint) => `<div class="ov-card-head ov-expand-head" role="button" tabindex="0" aria-expanded="false">
        <p class="ov-card-title">${escapeHtml(title)}</p>
        ${hint ? `<span class="ov-card-hint">${escapeHtml(hint)}</span>` : ''}
        ${OV_CHEVRON}
    </div>`;

    panel.innerHTML = `
        <div class="ov-detail-grid">
            <div class="ov-card" data-expandable>
                ${head('社團適配測驗')}
                <div class="ov-metric-list">
                    <div class="ov-metric"><span class="ov-metric-name">測驗總填寫數</span><span class="ov-metric-value">${quiz.total ?? 0}</span></div>
                    <div class="ov-metric"><span class="ov-metric-name">本月填寫數</span><span class="ov-metric-value v-pos">${quiz.this_month ?? 0}</span></div>
                </div>
                <div class="ov-chart-drawer" data-chart="quiz-trend"></div>
            </div>
            <div class="ov-card" data-expandable>
                ${head('測驗最常推薦的社團', 'Top 10')}
                <div class="ov-chart-drawer" data-chart="top-rec"></div>
            </div>
            <div class="ov-card" data-expandable>
                ${head('熱門社團排行（依追蹤數）', 'Top 10')}
                <div class="ov-chart-drawer" data-chart="top-popular"></div>
            </div>
        </div>`;
}

window.addEventListener('DOMContentLoaded', () => {
    initDrawers();
    loadOverview();
    loadClubAnalytics();
});
