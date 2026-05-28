function formatDateTime(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
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
        anim('ov-d-e-registrations', events.total_registrations);
        anim('ov-d-e-rating',        events.avg_rating !== null ? events.avg_rating + ' ★' : '-');

        anim('ov-d-a-active',   announcements.active);
        anim('ov-d-a-pinned',   announcements.pinned);
        anim('ov-d-a-expiring', announcements.expiring_soon);
        anim('ov-d-p-reports',  pending.reports);
        anim('ov-d-p-transfers', pending.transfers);
        anim('ov-d-p-reviews',  pending.reviews);
        anim('ov-d-p-qa',       pending.unanswered_qa);

        // Alert bar chips
        const chipData = [
            { id: 'ov-chip-reports',   val: pending.reports,          label: '待審檢舉',    base: 'chip-red' },
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

        const totalPending = ['reports', 'transfers', 'reviews', 'unanswered_qa']
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

window.addEventListener('DOMContentLoaded', loadOverview);
