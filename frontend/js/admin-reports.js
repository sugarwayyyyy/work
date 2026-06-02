const CLUB_STATUS_LABELS = { active: '啟用', inactive: '停用', suspended: '暫停', pending: '待審核' };

function escapeHtml(v) {
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function formatDateTime(value) {
    if (!value) return '-';
    if (window.PageUtils && typeof PageUtils.formatDate === 'function') return PageUtils.formatDate(value);
    return new Intl.DateTimeFormat('zh-TW', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(value));
}
function renderEmptyState(container, title, description) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-illustration"></div><h4>${escapeHtml(title||'')}</h4><p>${escapeHtml(description||'')}</p></div>`;
}

const REPORT_STATUS_META = {
    pending:   { label: '待處理', cls: 'pending' },
    reviewing: { label: '審核中', cls: 'reviewing' },
    resolved:  { label: '已處理', cls: 'resolved' },
    dismissed: { label: '已駁回', cls: 'dismissed' },
};
const REPORT_TYPE_META = {
    qa_question: { label: '提問',    icon: '💬' },
    qa_reply:    { label: '提問回覆', icon: '↩️' },
    review:      { label: '社團評價', icon: '⭐' },
    event:       { label: '活動',    icon: '📅' },
    club:        { label: '社團資料', icon: '🏛️' },
};
const REASON_LABELS = {
    inappropriate_content: '不當內容',
    false_information:     '不實資訊',
    spam:                  '垃圾訊息 / 廣告',
    harassment:            '人身攻擊 / 騷擾',
    other:                 '其他',
};

// ── Modal ────────────────────────────────────────────────
let _modalConfirmFn = null;

function openReportModal(title, sub, placeholder, required, onConfirm) {
    document.getElementById('report-modal-title').textContent = title;
    document.getElementById('report-modal-sub').textContent = sub;
    const ta = document.getElementById('report-modal-note');
    ta.placeholder = placeholder;
    ta.value = '';
    _modalConfirmFn = onConfirm;
    document.getElementById('report-action-modal').classList.add('is-open');
    setTimeout(() => ta.focus(), 60);
    document.getElementById('report-modal-confirm').onclick = function () {
        const note = ta.value.trim();
        if (required && !note) { ta.style.borderColor = '#ef4444'; ta.focus(); return; }
        ta.style.borderColor = '';
        closeReportModal();
        onConfirm(note);
    };
}
function closeReportModal() {
    document.getElementById('report-action-modal').classList.remove('is-open');
}
document.getElementById('report-action-modal').addEventListener('click', function (e) {
    if (e.target === this) closeReportModal();
});

// ── 檢舉工單 ─────────────────────────────────────────────
let _caseStatusFilter = 'pending';
let _caseCounts = {};

async function loadReportCases(status) {
    if (status !== undefined) _caseStatusFilter = status;
    const container = document.getElementById('reports-panel-cases');
    container.innerHTML = renderCasesFilterBar() +
        `<div id="cases-list"><div style="padding:20px;text-align:center;color:var(--color-text-muted,#9ca3af);font-size:.85rem;">載入中…</div></div>`;
    bindFilterBarEvents();

    const qs = _caseStatusFilter === 'all' ? '' : `&status=${_caseStatusFilter}`;
    const response = await APIClient.get('admin.php?action=reports' + qs);
    if (!response.success) { PageUtils.showAlert('載入檢舉工單失敗：' + response.message, 'error'); return; }

    const reports = response.data.reports || [];
    updateCasesFilterCounts(response.data.counts || null, reports);

    const listEl = document.getElementById('cases-list');
    if (reports.length === 0) {
        const emptyMsg = _caseStatusFilter === 'pending' ? '目前沒有待處理檢舉' : '沒有符合條件的工單';
        listEl.innerHTML = `<div class="empty-state"><div class="empty-state-illustration"></div><h4>${emptyMsg}</h4></div>`;
        return;
    }

    listEl.innerHTML = '';
    reports.forEach(report => renderReportCard(listEl, report));
}

function renderCasesFilterBar() {
    const filters = [
        { key: 'all',       label: '全部' },
        { key: 'pending',   label: '待處理' },
        { key: 'resolved',  label: '已處理' },
        { key: 'dismissed', label: '已駁回' },
    ];
    return `<div class="cases-filter-bar" id="cases-filter-bar">
        ${filters.map(f => `
            <button class="cases-filter-btn${f.key === _caseStatusFilter ? ' is-active' : ''}" data-filter="${f.key}">
                ${escapeHtml(f.label)}
                <span class="cases-filter-count" data-count-key="${f.key}"></span>
            </button>`).join('')}
    </div>`;
}

function bindFilterBarEvents() {
    document.querySelectorAll('#cases-filter-bar .cases-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => loadReportCases(btn.dataset.filter));
    });
}

function updateCasesFilterCounts(apiCounts, reports) {
    // apiCounts comes from the backend and always covers all statuses
    // Fall back to computing from reports array only when apiCounts is missing
    const counts = apiCounts || (() => {
        const c = { all: reports.length, pending: 0, resolved: 0, dismissed: 0 };
        reports.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
        return c;
    })();
    document.querySelectorAll('[data-count-key]').forEach(el => {
        const k = el.dataset.countKey;
        const v = counts[k];
        el.textContent = v != null ? v : '';
    });
}

function renderContentPreview(report) {
    const type  = report.reported_content_type || '';
    const body  = report.content_body  || null;
    const title = report.content_title || null;
    const anon  = report.content_is_anonymous == 1 || report.content_is_anonymous === true;
    const author = (!anon && report.content_author) ? report.content_author : null;

    const wrap = (inner) => `<div class="report-content-preview">
        <div class="report-content-label">被檢舉內容</div>${inner}</div>`;

    if (!body && !title) {
        return wrap(`<div class="report-content-box">
            <span class="report-content-box--deleted">（內容已刪除或不存在）</span>
        </div>`);
    }

    // qa_reply — thread: parent question + flagged reply
    if (type === 'qa_reply') {
        const pTitle   = report.reply_parent_question_title   || null;
        const pBody    = report.reply_parent_question_content || null;
        const clubName = report.content_club_name || null;
        return wrap(`<div class="report-ctx-thread">
            ${clubName ? `<div class="report-ctx-meta">社團：${escapeHtml(clubName)}</div>` : ''}
            ${pTitle || pBody ? `<div class="report-ctx-bubble report-ctx-bubble--parent">
                <div class="report-ctx-bubble__label">原始提問</div>
                ${pTitle ? `<div class="report-ctx-bubble__title">${escapeHtml(pTitle)}</div>` : ''}
                ${pBody  ? `<div class="report-ctx-bubble__body">${escapeHtml(pBody)}</div>`  : ''}
            </div>` : ''}
            <div class="report-ctx-bubble report-ctx-bubble--flagged">
                <div class="report-ctx-bubble__label">⚑ 被檢舉回覆</div>
                <div class="report-ctx-bubble__body">${escapeHtml(body || '')}</div>
                ${author || anon ? `<div class="report-ctx-bubble__author">${author ? '— ' + escapeHtml(author) : '— 匿名'}</div>` : ''}
            </div>
        </div>`);
    }

    // qa_question — show club name as meta, then the question
    if (type === 'qa_question') {
        const clubName = report.content_club_name || null;
        return wrap(`<div class="report-ctx-thread">
            ${clubName ? `<div class="report-ctx-meta">社團：${escapeHtml(clubName)}</div>` : ''}
            <div class="report-ctx-bubble report-ctx-bubble--flagged">
                <div class="report-ctx-bubble__label">⚑ 被檢舉提問</div>
                ${title ? `<div class="report-ctx-bubble__title">${escapeHtml(title)}</div>` : ''}
                <div class="report-ctx-bubble__body">${escapeHtml(body || '')}</div>
                ${author || anon ? `<div class="report-ctx-bubble__author">${author ? '— ' + escapeHtml(author) : '— 匿名'}</div>` : ''}
            </div>
        </div>`);
    }

    // review — show club name + rating
    if (type === 'review') {
        const clubName = report.review_club_name || null;
        const rating   = Number(report.review_rating) || 0;
        const stars    = rating > 0 ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : '';
        return wrap(`<div class="report-ctx-thread">
            ${clubName ? `<div class="report-ctx-meta">社團：${escapeHtml(clubName)}${stars ? ' &nbsp;·&nbsp; ' + stars : ''}</div>` : ''}
            <div class="report-ctx-bubble report-ctx-bubble--flagged">
                <div class="report-ctx-bubble__label">⚑ 被檢舉評價</div>
                ${title ? `<div class="report-ctx-bubble__title">${escapeHtml(title)}</div>` : ''}
                <div class="report-ctx-bubble__body">${escapeHtml(body || '')}</div>
                ${author || anon ? `<div class="report-ctx-bubble__author">${author ? '— ' + escapeHtml(author) : '— 匿名'}</div>` : ''}
            </div>
        </div>`);
    }

    // event / club — generic box
    return wrap(`<div class="report-content-box">
        ${title ? `<div class="report-content-box__title">${escapeHtml(title)}</div>` : ''}
        <div class="report-content-box__body">${escapeHtml(body || '')}</div>
    </div>`);
}

function renderReportCard(container, report) {
    const reportId  = Number(report.report_id) || 0;
    const typeMeta  = REPORT_TYPE_META[report.reported_content_type] || { label: report.reported_content_type, icon: '📄' };
    const statusMeta = REPORT_STATUS_META[report.status] || { label: report.status, cls: 'pending' };
    const reason    = REASON_LABELS[report.report_type] || escapeHtml(report.reason || '-');
    const canAct    = report.status === 'pending' || report.status === 'reviewing';

    const card = document.createElement('div');
    card.className = 'report-card';
    card.dataset.reportId = reportId;
    card.innerHTML = `
        <div class="report-card__header">
            <span class="report-card__icon">${typeMeta.icon}</span>
            <div class="report-card__main">
                <div class="report-card__title">${escapeHtml(typeMeta.label)} #${Number(report.reported_content_id)||0}</div>
                <div class="report-card__meta">檢舉人：${escapeHtml(report.reported_by_name||'-')} &nbsp;·&nbsp; ${formatDateTime(report.created_at)}</div>
            </div>
            <span class="report-status-badge report-status-badge--${statusMeta.cls}">${statusMeta.label}</span>
            <svg class="report-card__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="report-card__body">
            ${renderContentPreview(report)}
            <div class="report-detail-row">
                <span class="report-detail-label">事由</span>
                <span class="report-detail-value">${escapeHtml(reason)}</span>
            </div>
            ${report.description ? `<div class="report-detail-row">
                <span class="report-detail-label">補充</span>
                <span class="report-detail-value">${escapeHtml(report.description)}</span>
            </div>` : ''}
            ${report.admin_notes ? `<div class="report-detail-row">
                <span class="report-detail-label">備註</span>
                <span class="report-detail-value" style="color:var(--color-text-muted,#6b7280)">${escapeHtml(report.admin_notes)}</span>
            </div>` : ''}
            ${report.resolved_at ? `<div class="report-detail-row">
                <span class="report-detail-label">處理時間</span>
                <span class="report-detail-value">${formatDateTime(report.resolved_at)}</span>
            </div>` : ''}
            ${canAct ? `<div class="report-card__actions">
                <button class="btn btn-primary btn-sm" data-action="resolved_hide">下架內容</button>
                <button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;" data-action="dismissed">駁回</button>
            </div>` : ''}
        </div>`;

    card.querySelector('.report-card__header').addEventListener('click', () => card.classList.toggle('is-open'));

    if (canAct) {
        card.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); handleReportAction(reportId, btn.dataset.action, card); });
        });
    }
    container.appendChild(card);
}

function handleReportAction(reportId, action, card) {
    const configs = {
        resolved_hide: {
            title: '下架被檢舉內容',
            sub: '確認後將把被檢舉的內容強制下架，此動作不可復原。',
            placeholder: '填入處理說明，例如：違反社群規範（選填）',
            required: false,
            decision: 'resolved',
            forceHide: true,
        },
        dismissed: {
            title: '駁回此檢舉',
            sub: '工單將標記為已駁回，被檢舉的內容不受影響。',
            placeholder: '請輸入駁回原因（必填）',
            required: true,
            decision: 'dismissed',
            forceHide: false,
        },
    };
    const cfg = configs[action];
    openReportModal(cfg.title, cfg.sub, cfg.placeholder, cfg.required, async (note) => {
        const res = await APIClient.post('admin.php?action=review_report', {
            report_id: reportId, decision: cfg.decision, admin_notes: note, force_hide: cfg.forceHide ? 1 : 0
        });
        if (res.success) {
            PageUtils.showAlert('工單已更新', 'success');
            loadReportCases();
        } else {
            PageUtils.showAlert('更新失敗：' + res.message, 'error');
        }
    });
}

// ── 用戶回饋 ──────────────────────────────────────────────
async function loadUserFeedback() {
    const response = await APIClient.get('admin.php?action=user_feedback');
    if (!response.success) return console.error(response.message);
    const container = document.getElementById('reports-panel-feedback');
    container.innerHTML = '';
    const feedback = response.data.feedback || [];
    if (feedback.length === 0) { renderEmptyState(container, '目前沒有用戶回饋', '等有回饋資料後，這裡會顯示留言與評語。'); return; }
    const list = document.createElement('div');
    list.className = 'feed-stream-list';
    const TYPE_LABEL = { suggestion: '💡 功能建議', bug: '🐛 問題回報', other: '💬 其他意見' };
    feedback.forEach(item => {
        const typeLabel = TYPE_LABEL[item.feedback_type] || '💬 其他意見';
        const article = document.createElement('article');
        article.className = 'feed-item-card';
        article.innerHTML = `
            <div class="feed-item-head">
                <h3 class="feed-item-title">${escapeHtml(item.user_name || '匿名')}
                    <span style="margin-left:6px;font-size:0.75rem;font-weight:400;color:var(--text-muted,#6b7280);">${escapeHtml(item.user_email || '')}</span>
                </h3>
                <span class="feed-item-time">${formatDateTime(item.created_at)}</span>
            </div>
            <div style="margin-bottom:6px;">
                <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;background:#f3f4f6;color:#374151;">${typeLabel}</span>
            </div>
            <p class="feed-item-body">${escapeHtml(item.content || '-')}</p>`;
        list.appendChild(article);
    });
    container.appendChild(list);
}

// ── Tab 切換 ──────────────────────────────────────────────
const reportsLoaded  = { feedback: false, cases: false };
const reportsLoaders = { feedback: loadUserFeedback, cases: loadReportCases };

function switchReportsSubTab(key) {
    document.querySelectorAll('.feed-tab[data-sub-tab]').forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected','false'); });
    document.querySelectorAll('.feed-panel').forEach(p => p.classList.remove('is-active'));
    const btn   = document.querySelector(`.feed-tab[data-sub-tab="${key}"]`);
    const panel = document.getElementById('reports-panel-' + key);
    if (btn)   { btn.classList.add('is-active'); btn.setAttribute('aria-selected','true'); }
    if (panel) panel.classList.add('is-active');
    if (!reportsLoaded[key]) { reportsLoaded[key] = true; reportsLoaders[key](); }
}

document.querySelectorAll('.feed-tab[data-sub-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchReportsSubTab(btn.dataset.subTab));
});

// URL params: ?report_id=N jumps to a specific card; ?tab=cases opens the cases tab
const _urlParams   = new URLSearchParams(location.search);
const _urlReportId = Number(_urlParams.get('report_id')) || 0;
const _urlTab      = _urlParams.get('tab') || '';

if (_urlReportId > 0) {
    _caseStatusFilter = 'all';
    switchReportsSubTab('cases');
    const _tryExpand = (tries) => {
        const target = document.querySelector(`.report-card[data-report-id="${_urlReportId}"]`);
        if (target) {
            target.classList.add('is-open');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.style.outline = '2px solid var(--color-primary-400, #60a5fa)';
            setTimeout(() => { target.style.outline = ''; }, 2500);
        } else if (tries > 0) {
            setTimeout(() => _tryExpand(tries - 1), 300);
        }
    };
    setTimeout(() => _tryExpand(8), 400);
} else if (_urlTab === 'cases') {
    switchReportsSubTab('cases');
} else {
    switchReportsSubTab('feedback');
}
