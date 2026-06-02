const PAGE_SIZE = 8;
const CLUB_STATUS_LABELS = { active: '啟用', inactive: '停用', suspended: '暫停', pending: '待審核' };

const clubsState = { rows: [], query: '', sort: 'club_code_asc', page: 1 };
let clubCategories = [];

function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function toSearchableText(value) { return (value ?? '').toString().trim().toLowerCase(); }
function compareByValue(a, b, direction = 'asc') {
    const fa = typeof a === 'number' ? a : toSearchableText(a);
    const fb = typeof b === 'number' ? b : toSearchableText(b);
    if (fa < fb) return direction === 'asc' ? -1 : 1;
    if (fa > fb) return direction === 'asc' ? 1 : -1;
    return 0;
}
function paginateRows(rows, page) {
    const tot = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const cur = Math.min(Math.max(1, page), tot);
    const s = (cur - 1) * PAGE_SIZE;
    return { rows: rows.slice(s, s + PAGE_SIZE), totalPages: tot, currentPage: cur, totalRows: rows.length };
}
function renderPagination(containerId, pageData, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (pageData.totalRows === 0) { container.innerHTML = '<span class="admin-page-meta">查無資料</span>'; return; }
    container.innerHTML = `
        <button class="btn btn-secondary btn-sm" ${pageData.currentPage === 1 ? 'disabled' : ''} data-page="prev">上一頁</button>
        <span class="admin-page-meta">第 ${pageData.currentPage} / ${pageData.totalPages} 頁，共 ${pageData.totalRows} 筆</span>
        <button class="btn btn-secondary btn-sm" ${pageData.currentPage === pageData.totalPages ? 'disabled' : ''} data-page="next">下一頁</button>
    `;
    container.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => onPageChange(btn.dataset.page === 'prev' ? pageData.currentPage - 1 : pageData.currentPage + 1));
    });
}
function renderEmptyState(container, title, description, colspan = 1) {
    const st = escapeHtml(title || ''), sd = escapeHtml(description || '');
    if (container.tagName === 'TBODY') {
        container.innerHTML = `<tr><td colspan="${Number(colspan) || 1}"><div class="empty-state"><div class="empty-state-illustration"></div><h4>${st}</h4><p>${sd}</p></div></td></tr>`;
        return;
    }
    container.innerHTML = `<div class="empty-state"><div class="empty-state-illustration"></div><h4>${st}</h4><p>${sd}</p></div>`;
}

function setFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(`err-${inputId}`);
    if (!input || !err) return;
    input.classList.toggle('input-error', !!message);
    err.textContent = message || '';
}

function validateCreateClubBaseForm() {
    let ok = true;
    ['new-club-code', 'new-club-name', 'new-club-category'].forEach(id => {
        const value = document.getElementById(id).value.trim();
        if (!value) { setFieldError(id, '此為必填欄位'); ok = false; }
        else setFieldError(id, '');
    });
    return ok;
}

function getCategoryName(categoryId) {
    const idNum = Number(categoryId);
    const category = clubCategories.find(c => Number(c.category_id) === idNum);
    return category ? category.category_name : '-';
}

function getFilteredSortedClubs() {
    const query = toSearchableText(clubsState.query);
    let rows = [...clubsState.rows];
    if (query) {
        rows = rows.filter(club => {
            const statusLabel = CLUB_STATUS_LABELS[club.activity_status] || club.activity_status;
            const visibilityLabel = club.deleted_at ? '已隱藏' : '顯示中';
            const categoryName = getCategoryName(club.category_id);
            return [club.club_code, club.club_name, categoryName, statusLabel, visibilityLabel].some(v => toSearchableText(v).includes(query));
        });
    }
    const sortMap = {
        club_code_asc: (a, b) => compareByValue(a.club_code, b.club_code, 'asc'),
        club_code_desc: (a, b) => compareByValue(a.club_code, b.club_code, 'desc'),
        club_name_asc: (a, b) => compareByValue(a.club_name, b.club_name, 'asc'),
        club_name_desc: (a, b) => compareByValue(a.club_name, b.club_name, 'desc'),
        activity_status_asc: (a, b) => compareByValue(CLUB_STATUS_LABELS[a.activity_status] || a.activity_status, CLUB_STATUS_LABELS[b.activity_status] || b.activity_status, 'asc')
    };
    rows.sort(sortMap[clubsState.sort] || sortMap.club_code_asc);
    return rows;
}

function renderClubsTable() {
    const filtered = getFilteredSortedClubs();
    const pageData = paginateRows(filtered, clubsState.page);
    clubsState.page = pageData.currentPage;
    const body = document.querySelector('#clubs-table tbody');
    body.innerHTML = '';
    if (pageData.rows.length === 0) {
        renderEmptyState(body, '沒有符合條件的社團', '可嘗試搜尋社團代碼、名稱或狀態。', 6);
        renderPagination('clubs-pagination', pageData, nextPage => { clubsState.page = nextPage; renderClubsTable(); });
        return;
    }
    pageData.rows.forEach(club => {
        const categoryName = getCategoryName(club.category_id);
        const safeClubCode = escapeHtml(club.club_code || '-');
        const safeClubName = escapeHtml(club.club_name || '-');
        const safeCategoryName = escapeHtml(categoryName || '-');
        const safeStatusLabel = escapeHtml(CLUB_STATUS_LABELS[club.activity_status] || club.activity_status || '-');
        const safeClubId = Number(club.club_id) || 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${safeClubCode}</td>
            <td>${safeClubName}</td>
            <td>${safeCategoryName}</td>
            <td><span class="status-chip">${safeStatusLabel}</span></td>
            <td><span class="status-chip ${club.deleted_at ? 'chip-warning' : 'chip-success'}">${club.deleted_at ? '已隱藏' : '顯示中'}</span></td>
            <td>
                <div class="row-actions">
                    <select data-club-id="${safeClubId}" class="table-select">
                        <option value="active" ${club.activity_status === 'active' ? 'selected' : ''}>啟用</option>
                        <option value="inactive" ${club.activity_status === 'inactive' ? 'selected' : ''}>停用</option>
                        <option value="suspended" ${club.activity_status === 'suspended' ? 'selected' : ''}>暫停</option>
                        <option value="pending" ${club.activity_status === 'pending' ? 'selected' : ''}>待審核</option>
                    </select>
                    <button class="btn btn-primary btn-sm" data-club-edit="${safeClubId}">編輯社團資料</button>
                </div>
            </td>`;
        body.appendChild(row);
    });
    document.querySelectorAll('#clubs-table select.table-select').forEach(sel => {
        sel.dataset.prev = sel.value;
        sel.addEventListener('change', async () => {
            const clubId = sel.dataset.clubId;
            const prev = sel.dataset.prev;
            sel.dataset.prev = sel.value;
            const response = await APIClient.post('admin.php?action=update_club_status', { club_id: clubId, activity_status: sel.value });
            if (response.success) {
                // 狀態與顯示狀態連動（啟用=顯示、其餘=隱藏），重新載入以同步「隱藏狀態」欄
                loadClubs();
            } else {
                PageUtils.showAlert('更新社團狀態失敗：' + response.message, 'error');
                sel.value = prev;
                sel.dataset.prev = prev;
            }
        });
    });
    document.querySelectorAll('#clubs-table button[data-club-edit]').forEach(btn => {
        btn.addEventListener('click', () => openClubEdit(Number(btn.dataset.clubEdit)));
    });
    renderPagination('clubs-pagination', pageData, nextPage => { clubsState.page = nextPage; renderClubsTable(); });
}

async function loadClubs() {
    const response = await APIClient.get('admin.php?action=clubs');
    if (!response.success) return console.error(response.message);
    clubsState.rows = response.data.clubs || [];
    renderClubsTable();
}

async function loadClubCategories() {
    const response = await APIClient.get('clubs.php?action=categories');
    if (!response.success) return console.error(response.message);
    clubCategories = response.data.categories || [];
    const select = document.getElementById('new-club-category');
    if (!select) return;
    select.innerHTML = '<option value="">請選擇社團類別</option>';
    clubCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.category_id;
        option.textContent = cat.category_name;
        select.appendChild(option);
    });
}

document.getElementById('clubs-search').addEventListener('input', event => { clubsState.query = event.target.value; clubsState.page = 1; renderClubsTable(); });
document.getElementById('clubs-sort').addEventListener('change', event => { clubsState.sort = event.target.value; clubsState.page = 1; renderClubsTable(); });

document.getElementById('create-club-base-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!validateCreateClubBaseForm()) return;
    const payload = { club_code: document.getElementById('new-club-code').value.trim(), club_name: document.getElementById('new-club-name').value.trim(), category_id: Number(document.getElementById('new-club-category').value) };
    const response = await APIClient.post('admin.php?action=create_club', payload);
    if (response.success) { event.target.reset(); loadClubs(); PageUtils.showAlert('社團基礎名單新增成功', 'success'); }
    else PageUtils.showAlert('新增失敗：' + response.message, 'error');
});

function initEditHourSelect(id) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    for (let h = 0; h < 24; h++) {
        const opt = document.createElement('option');
        opt.value = String(h).padStart(2, '0');
        opt.textContent = String(h).padStart(2, '0') + ' 時';
        sel.appendChild(opt);
    }
}

function syncEditMeetingTime() {
    const day = document.getElementById('edit-club-meeting-day')?.value || '';
    const sh  = document.getElementById('edit-meeting-start-hour')?.value || '00';
    const sm  = document.getElementById('edit-meeting-start-minute')?.value || '00';
    const eh  = document.getElementById('edit-meeting-end-hour')?.value || '00';
    const em  = document.getElementById('edit-meeting-end-minute')?.value || '00';
    const el  = document.getElementById('edit-meeting-time');
    if (el) el.value = `${day} ${sh}:${sm}-${eh}:${em}`;
}

function setEditMeetingFromClub(meetingTime, meetingDay) {
    const combined = String(meetingTime || '').trim();
    const dayOnly  = String(meetingDay  || '').trim();
    const fallback = { day: '每週三', sh: '19', sm: '00', eh: '21', em: '00' };

    const matchedFull = combined.match(/(每週[一二三四五六日])\s*(\d{1,2}):(\d{2})\s*[-~～]\s*(\d{1,2}):(\d{2})/);
    const matchedTime = combined.match(/(\d{1,2}):(\d{2})\s*[-~～]\s*(\d{1,2}):(\d{2})/);

    let next;
    if (matchedFull) {
        next = {
            day: matchedFull[1],
            sh:  String(parseInt(matchedFull[2], 10)).padStart(2, '0'),
            sm:  matchedFull[3] === '30' ? '30' : '00',
            eh:  String(parseInt(matchedFull[4], 10)).padStart(2, '0'),
            em:  matchedFull[5] === '30' ? '30' : '00',
        };
    } else if (matchedTime) {
        next = {
            day: dayOnly || fallback.day,
            sh:  String(parseInt(matchedTime[1], 10)).padStart(2, '0'),
            sm:  matchedTime[2] === '30' ? '30' : '00',
            eh:  String(parseInt(matchedTime[3], 10)).padStart(2, '0'),
            em:  matchedTime[4] === '30' ? '30' : '00',
        };
    } else {
        next = { ...fallback, day: dayOnly || fallback.day };
    }

    document.getElementById('edit-club-meeting-day').value        = next.day;
    document.getElementById('edit-meeting-start-hour').value      = next.sh;
    document.getElementById('edit-meeting-start-minute').value    = next.sm;
    document.getElementById('edit-meeting-end-hour').value        = next.eh;
    document.getElementById('edit-meeting-end-minute').value      = next.em;
    syncEditMeetingTime();
}

async function openClubEdit(clubId) {
    const response = await APIClient.get(`admin.php?action=club_detail&id=${clubId}`);
    if (!response.success) { PageUtils.showAlert('載入社團資料失敗：' + response.message, 'error'); return; }
    const c = response.data.club;
    document.getElementById('edit-club-id').value = c.club_id;
    document.getElementById('edit-club-code').value = c.club_code || '';
    document.getElementById('edit-club-name').value = c.club_name || '';
    document.getElementById('edit-club-category').value = c.category_id || '';
    document.getElementById('edit-founding-year').value = c.founding_year || '';
    document.getElementById('edit-contact-email').value = c.contact_email || '';
    document.getElementById('edit-contact-phone').value = c.contact_phone || '';
    setEditMeetingFromClub(c.meeting_time || '', c.meeting_day || '');
    document.getElementById('edit-meeting-location').value = c.meeting_location || '';
    document.getElementById('edit-club-fee').value = c.club_fee || '';
    document.getElementById('edit-club-fee-semester').value = c.club_fee_semester || '';
    document.getElementById('edit-description').value = c.description || '';
    const logoPreview = document.getElementById('edit-club-logo-preview');
    const logoUrl = c.logo_path ? PageUtils.resolveMediaUrl(c.logo_path) : '';
    logoPreview.src = logoUrl;
    logoPreview.style.display = logoUrl ? 'block' : 'none';
    document.getElementById('edit-club-logo-input').value = '';
    document.getElementById('club-management-section').style.display = 'flex';
}

function validateLogoFile(file) {
    if (file.size > 10 * 1024 * 1024) return '檔案大小超過 10MB';
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!allowedTypes.includes(file.type) || !allowedExts.includes(ext)) return '不支援的圖片格式，請上傳 JPG、PNG、GIF 或 WebP';
    return null;
}

function closeClubEdit() {
    document.getElementById('club-management-section').style.display = '';
}

document.getElementById('club-edit-close').addEventListener('click', closeClubEdit);
document.getElementById('club-edit-cancel').addEventListener('click', closeClubEdit);
document.getElementById('club-management-section').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeClubEdit();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeClubEdit();
});

document.getElementById('edit-club-logo-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const err = validateLogoFile(file);
    if (err) { PageUtils.showAlert('Logo：' + err, 'error'); e.target.value = ''; return; }
    const url = URL.createObjectURL(file);
    const preview = document.getElementById('edit-club-logo-preview');
    preview.src = url;
    preview.style.display = 'block';
});

document.getElementById('edit-club-detail-form').addEventListener('submit', async event => {
    event.preventDefault();
    const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
        const clubId = document.getElementById('edit-club-id').value;
        const logoFile = document.getElementById('edit-club-logo-input').files[0];
        if (logoFile) {
            const logoErr = validateLogoFile(logoFile);
            if (logoErr) { PageUtils.showAlert('Logo：' + logoErr, 'error'); return; }
            const uploadFormData = new FormData();
            uploadFormData.append('logo', logoFile);
            uploadFormData.append('club_id', clubId);
            const csrfHeaders = await APIClient.getCSRFHeaders();
            const uploadRes = await fetch(`${APIClient.getBaseUrl()}/upload.php?action=upload_club_logo`, {
                method: 'POST', body: uploadFormData, credentials: 'include',
                headers: { ...APIClient.getAuthHeaders(), ...csrfHeaders }
            });
            const uploadJson = await uploadRes.json().catch(() => ({}));
            if (!uploadRes.ok || !uploadJson.success) throw new Error(uploadJson.message || 'Logo 上傳失敗');
            const preview = document.getElementById('edit-club-logo-preview');
            preview.src = PageUtils.resolveMediaUrl(uploadJson.path);
            preview.style.display = 'block';
        }
        const payload = {
            club_id:           clubId,
            club_code:         document.getElementById('edit-club-code').value.trim(),
            club_name:         document.getElementById('edit-club-name').value.trim(),
            category_id:       document.getElementById('edit-club-category').value,
            founding_year:     document.getElementById('edit-founding-year').value,
            contact_email:     document.getElementById('edit-contact-email').value.trim(),
            contact_phone:     document.getElementById('edit-contact-phone').value.trim(),
            meeting_day:       document.getElementById('edit-club-meeting-day').value,
            meeting_time:      document.getElementById('edit-meeting-time').value,
            meeting_location:  document.getElementById('edit-meeting-location').value.trim(),
            club_fee:          document.getElementById('edit-club-fee').value,
            club_fee_semester: document.getElementById('edit-club-fee-semester').value,
            description:       document.getElementById('edit-description').value.trim(),
        };
        const response = await APIClient.post('admin.php?action=update_club_detail', payload);
        if (response.success) {
            PageUtils.showAlert('社團資料更新成功', 'success');
            closeClubEdit();
            loadClubs();
        } else {
            PageUtils.showAlert('更新失敗：' + response.message, 'error');
        }
    } catch (err) {
        PageUtils.showAlert('錯誤：' + err.message, 'error');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
});

// 把分類選項同步填入編輯表單
const _origLoadCategories = loadClubCategories;
loadClubCategories = async function () {
    await _origLoadCategories();
    const src = document.getElementById('new-club-category');
    const dst = document.getElementById('edit-club-category');
    Array.from(src.options).forEach(opt => {
        if (opt.value && !dst.querySelector(`option[value="${opt.value}"]`)) {
            dst.appendChild(opt.cloneNode(true));
        }
    });
};

initEditHourSelect('edit-meeting-start-hour');
initEditHourSelect('edit-meeting-end-hour');
['edit-club-meeting-day', 'edit-meeting-start-hour', 'edit-meeting-start-minute',
 'edit-meeting-end-hour', 'edit-meeting-end-minute'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', syncEditMeetingTime);
});

loadClubCategories();
loadClubs();
