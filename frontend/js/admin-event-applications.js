function escapeHtml(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function formatDateTime(value) {
    if (!value) return '-';
    if (window.PageUtils && typeof PageUtils.formatDate === 'function') return PageUtils.formatDate(value);
    return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

const VAPP_STATUS_META = {
    pending:          { label: '待審核', icon: '🟡', cls: 'pending' },
    approved:         { label: '已通過', icon: '✅', cls: 'approved' },
    needs_supplement: { label: '需補件', icon: '🔄', cls: 'needs_supplement' },
    rejected:         { label: '已退件', icon: '❌', cls: 'rejected' },
};

const VAPP_FILTERS = [
    { key: 'all',              label: '全部' },
    { key: 'pending',          label: '待審核' },
    { key: 'approved',         label: '已通過' },
    { key: 'needs_supplement', label: '需補件' },
    { key: 'rejected',         label: '已退件' },
];

let _vappStatusFilter = 'pending';

async function loadVenueApplications(status) {
    if (status !== undefined) _vappStatusFilter = status;
    renderFilterBar();

    const listEl = document.getElementById('vapp-list');
    listEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--color-text-muted,#9ca3af);font-size:.85rem;">載入中…</div>`;

    const qs = _vappStatusFilter === 'all' ? '' : `&status=${_vappStatusFilter}`;
    const response = await APIClient.get('admin.php?action=venue_applications' + qs);
    if (!response.success) {
        PageUtils.showAlert('載入活動申請失敗：' + response.message, 'error');
        listEl.innerHTML = `<div class="empty-state"><div class="empty-state-illustration"></div><h4>載入失敗</h4></div>`;
        return;
    }

    const applications = response.data.applications || [];
    updateFilterCounts(response.data.counts || null);

    if (applications.length === 0) {
        const emptyMsg = _vappStatusFilter === 'pending' ? '目前沒有待審核的活動申請' : '沒有符合條件的申請';
        listEl.innerHTML = `<div class="empty-state"><div class="empty-state-illustration"></div><h4>${emptyMsg}</h4></div>`;
        return;
    }

    listEl.innerHTML = '';
    applications.forEach(app => renderApplicationCard(listEl, app));
}

function renderFilterBar() {
    const bar = document.getElementById('vapp-filter-bar');
    bar.innerHTML = VAPP_FILTERS.map(f => `
        <button class="cases-filter-btn${f.key === _vappStatusFilter ? ' is-active' : ''}" data-filter="${f.key}">
            ${escapeHtml(f.label)}
            <span class="cases-filter-count" data-count-key="${f.key}"></span>
        </button>`).join('');
    bar.querySelectorAll('.cases-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => loadVenueApplications(btn.dataset.filter));
    });
}

function updateFilterCounts(counts) {
    if (!counts) return;
    document.querySelectorAll('#vapp-filter-bar [data-count-key]').forEach(el => {
        const v = counts[el.dataset.countKey];
        el.textContent = v != null ? v : '';
    });
}

function renderFilesHtml(files) {
    if (!files || files.length === 0) {
        return `<div class="vapp-files"><div class="vapp-files-label">申請文件</div><span style="font-size:0.82rem;color:var(--color-text-muted,#9ca3af);">（無附件）</span></div>`;
    }
    const links = files.map(f => {
        const url = PageUtils.resolveMediaUrl(f.file_path);
        const name = f.original_name || (f.file_path || '').split('/').pop() || '附件';
        return `<a class="vapp-file-link" href="${escapeHtml(url)}" target="_blank" rel="noopener" download>
            <span>📎</span><span class="vapp-file-name">${escapeHtml(name)}</span>
        </a>`;
    }).join('');
    return `<div class="vapp-files"><div class="vapp-files-label">申請文件（${files.length}）</div>${links}</div>`;
}

function renderApplicationCard(container, app) {
    const applicationId = Number(app.application_id) || 0;
    const statusMeta = VAPP_STATUS_META[app.status] || { label: app.status, icon: '📄', cls: 'pending' };
    const canAct = app.status === 'pending';

    const timeRange = app.event_end_date
        ? `${formatDateTime(app.event_date)} ～ ${formatDateTime(app.event_end_date)}`
        : formatDateTime(app.event_date);

    const card = document.createElement('div');
    card.className = 'report-card';
    card.dataset.applicationId = applicationId;
    card.innerHTML = `
        <div class="report-card__header">
            <span class="report-card__icon">${statusMeta.icon}</span>
            <div class="report-card__main">
                <div class="report-card__title">${escapeHtml(app.event_name || '未命名活動')}</div>
                <div class="report-card__meta">${escapeHtml(app.club_name || '-')} &nbsp;·&nbsp; 申請人：${escapeHtml(app.applicant_name || '-')} &nbsp;·&nbsp; ${formatDateTime(app.created_at)}</div>
            </div>
            <span class="report-status-badge report-status-badge--${statusMeta.cls}">${statusMeta.label}</span>
            <svg class="report-card__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="report-card__body">
            <div class="report-detail-row"><span class="report-detail-label">時間</span><span class="report-detail-value">${escapeHtml(timeRange)}</span></div>
            <div class="report-detail-row"><span class="report-detail-label">地點</span><span class="report-detail-value">${escapeHtml(app.location || '未填')}</span></div>
            <div class="report-detail-row"><span class="report-detail-label">名額</span><span class="report-detail-value">${app.capacity != null && app.capacity !== '' ? escapeHtml(app.capacity) + ' 人' : '未填'}</span></div>
            <div class="report-detail-row"><span class="report-detail-label">費用</span><span class="report-detail-value">${app.fee != null && app.fee !== '' ? escapeHtml(app.fee) : '0'}</span></div>
            ${app.description ? `<div class="report-detail-row"><span class="report-detail-label">說明</span><span class="report-detail-value" style="white-space:pre-wrap;word-break:break-word;">${escapeHtml(app.description)}</span></div>` : ''}
            ${renderFilesHtml(app.files)}
            ${canAct ? `
            <div class="vapp-review">
                <textarea class="vapp-review-textarea" placeholder="審核意見（通過選填；退件 / 補件必填）"></textarea>
                <div class="vapp-review-actions">
                    <button class="btn btn-sm vapp-btn-approve" data-decision="approve">✓ 通過</button>
                    <button class="btn btn-sm vapp-btn-supplement" data-decision="supplement">⟳ 要求補件</button>
                    <button class="btn btn-sm vapp-btn-reject" data-decision="reject">✕ 退件</button>
                </div>
            </div>` : `
            <div class="vapp-reviewed-note">
                <strong>審核結果：</strong>${escapeHtml(statusMeta.label)}
                ${app.reviewer_name ? ' &nbsp;·&nbsp; 審核人：' + escapeHtml(app.reviewer_name) : ''}
                ${app.reviewed_at ? ' &nbsp;·&nbsp; ' + formatDateTime(app.reviewed_at) : ''}
                ${app.review_comment ? `<div style="margin-top:6px;">審核意見：${escapeHtml(app.review_comment)}</div>` : ''}
            </div>`}
        </div>`;

    card.querySelector('.report-card__header').addEventListener('click', () => card.classList.toggle('is-open'));

    if (canAct) {
        const textarea = card.querySelector('.vapp-review-textarea');
        card.querySelectorAll('[data-decision]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                handleReview(applicationId, btn.dataset.decision, textarea, card);
            });
        });
    }

    container.appendChild(card);
}

async function handleReview(applicationId, decision, textarea, card) {
    const comment = (textarea?.value || '').trim();
    if ((decision === 'supplement' || decision === 'reject') && !comment) {
        PageUtils.showAlert('要求補件或退件時必須填寫審核意見', 'error');
        if (textarea) { textarea.style.borderColor = '#ef4444'; textarea.focus(); }
        return;
    }
    const confirmMsg = { approve: '確認通過此申請？通過後活動將立即發布。', supplement: '確認要求補件？', reject: '確認退件？' }[decision];
    if (!confirm(confirmMsg)) return;

    card.querySelectorAll('[data-decision]').forEach(b => { b.disabled = true; });
    const res = await APIClient.post('admin.php?action=review_venue_application', {
        application_id: applicationId,
        decision,
        comment
    });
    if (res.success) {
        PageUtils.showAlert('審核完成', 'success');
        loadVenueApplications();
    } else {
        PageUtils.showAlert('審核失敗：' + res.message, 'error');
        card.querySelectorAll('[data-decision]').forEach(b => { b.disabled = false; });
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const urlStatus = new URLSearchParams(location.search).get('status');
    if (urlStatus && VAPP_FILTERS.some(f => f.key === urlStatus)) {
        _vappStatusFilter = urlStatus;
    }
    loadVenueApplications();
});
