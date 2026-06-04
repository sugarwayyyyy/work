        const PAGE_SIZE = 8;
        const PLATFORM_ROLE_LABELS = { student: '一般帳號', platform_admin: '平台管理員', category_assistant: '類別助教' };
        const CLUB_OFFICER_ROLE_LABELS = { president: '社長', vice_president: '副社長', public_relations: '公關', treasurer: '總務', director: '幹事' };

        const usersState = { rows: [], query: '', platformRoleFilter: 'all', statusFilter: 'all', page: 1 };
        const userEditState = { originalUser: null };
        const clubsState = { rows: [] };
        const clubAdminAssignmentsState = { rows: [] };

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
        function formatDateTime(value) {
            if (!value) return '-';
            if (window.PageUtils && typeof PageUtils.formatDate === 'function') return PageUtils.formatDate(value);
            return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
        }
        function renderPagination(containerId, pageData, onPageChange) {
            const container = document.getElementById(containerId);
            if (!container) return;
            if (pageData.totalRows === 0) { container.innerHTML = '<span class="admin-page-meta">查無資料</span>'; return; }
            const prevDisabled = pageData.currentPage === 1;
            const nextDisabled = pageData.currentPage === pageData.totalPages;
            container.innerHTML = `
                <button class="btn btn-secondary btn-sm" ${prevDisabled ? 'disabled' : ''} data-page="prev">上一頁</button>
                <span class="admin-page-meta">第 ${pageData.currentPage} / ${pageData.totalPages} 頁，共 ${pageData.totalRows} 筆</span>
                <button class="btn btn-secondary btn-sm" ${nextDisabled ? 'disabled' : ''} data-page="next">下一頁</button>
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

        function clubAdminRoleLabel(role) {
            return ({ president: '社長', vice_president: '副社長', public_relations: '公關', treasurer: '總務', director: '幹事', member: '一般成員' })[role] || role || '-';
        }
        function getPlatformRoleLabel(role) { return PLATFORM_ROLE_LABELS[role] || role || '-'; }
        function getUserClubIdentitySummary(user) {
            const count = Number(user.club_admin_count || 0);
            if (!count) return '無';
            const raw = (user.club_role_summary || '').toString().trim();
            if (!raw) return `管理 ${count} 個社團`;
            const first = raw.split('||')[0] || '';
            const [clubNameRaw, roleRaw] = first.split(':');
            const clubName = (clubNameRaw || '').trim();
            const roleLabel = CLUB_OFFICER_ROLE_LABELS[(roleRaw || '').trim()] || '幹部';
            if (!clubName) return `管理 ${count} 個社團`;
            if (count > 1) return `${clubName}${roleLabel}（另管理 ${count - 1} 個社團）`;
            return `${clubName}${roleLabel}`;
        }
        function getAccountStatusLabel(user) { return Number(user?.is_active) === 1 ? '正常' : '停權'; }

        function getFilteredSortedUsers() {
            const query = toSearchableText(usersState.query);
            let rows = [...usersState.rows];
            rows = rows.filter(user => {
                if (usersState.platformRoleFilter !== 'all') {
                    if (usersState.platformRoleFilter === 'club_admin') {
                        if (Number(user.club_admin_count || 0) <= 0) return false;
                    } else if (user.role !== usersState.platformRoleFilter) {
                        return false;
                    }
                }
                if (usersState.statusFilter !== 'all' && String(Number(user.is_active) === 1 ? 1 : 0) !== usersState.statusFilter) return false;
                if (!query) return true;
                const roleLabel = getPlatformRoleLabel(user.role);
                const clubIdentity = getUserClubIdentitySummary(user);
                const statusLabel = getAccountStatusLabel(user);
                return [user.name, user.email, user.student_id || '', roleLabel, clubIdentity, statusLabel].some(v => toSearchableText(v).includes(query));
            });
            rows.sort((a, b) => compareByValue(a.name, b.name, 'asc'));
            return rows;
        }

        function renderModalClubOptions() {
            const select = document.getElementById('user-edit-club-add-club-id');
            if (!select) return;
            const options = clubsState.rows.slice().sort((a, b) => compareByValue(a.club_code, b.club_code, 'asc'))
                .map(club => `<option value="${Number(club.club_id) || 0}">${escapeHtml(club.club_code || '-')} ${escapeHtml(club.club_name || '-')}</option>`).join('');
            select.innerHTML = `<option value="">請選擇社團</option>${options}`;
        }

        function renderUserEditClubRoles(userId) {
            const container = document.getElementById('user-edit-club-roles-list');
            if (!container) return;
            const uid = Number(userId);
            const roles = (clubAdminAssignmentsState.rows || []).filter(r => Number(r.user_id) === uid);
            if (!roles.length) {
                container.innerHTML = '<span class="admin-note-box" style="font-size:0.82rem;">此帳號目前無社團幹部職位</span>';
                return;
            }
            container.innerHTML = roles.map(r => `
                <div class="user-edit-club-role-row" data-member-id="${Number(r.member_id)}">
                    <span class="user-edit-club-role-name">${escapeHtml(r.club_name || '-')}</span>
                    <span class="user-edit-club-role-label">${escapeHtml(clubAdminRoleLabel(r.role))}</span>
                    <span class="badge ${Number(r.is_active) ? 'badge-success' : ''}" style="font-size:0.72rem;">${Number(r.is_active) ? '啟用' : '停用'}</span>
                    <button type="button" class="btn btn-sm btn-danger-outline" style="margin-left:auto;" data-revoke-member="${Number(r.member_id)}">撤銷</button>
                </div>
            `).join('');
            container.querySelectorAll('[data-revoke-member]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm('確定要撤銷此幹部職位嗎？')) return;
                    const res = await APIClient.post('admin.php?action=revoke_club_admin_assignment', { member_id: Number(btn.dataset.revokeMember) });
                    if (res.success) {
                        PageUtils.showAlert('已撤銷幹部資格', 'success');
                        await Promise.all([loadClubAdminAssignments(), loadUsers()]);
                        renderUserEditClubRoles(Number(document.getElementById('user-edit-id').value));
                    } else {
                        PageUtils.showAlert('撤銷失敗：' + res.message, 'error');
                    }
                });
            });
        }

        function renderUsersTable() {
            const filtered = getFilteredSortedUsers();
            const pageData = paginateRows(filtered, usersState.page);
            usersState.page = pageData.currentPage;
            const body = document.querySelector('#users-table tbody');
            body.innerHTML = '';
            if (pageData.rows.length === 0) {
                renderEmptyState(body, '沒有符合條件的帳號', '試試其他關鍵字或調整排序條件。', 7);
                renderPagination('users-pagination', pageData, nextPage => { usersState.page = nextPage; renderUsersTable(); });
                return;
            }
            const currentUser = (window.StorageUtils && typeof window.StorageUtils.getUser === 'function') ? window.StorageUtils.getUser() : null;
            const currentUserId = Number(currentUser?.user_id || 0);
            pageData.rows.forEach(user => {
                const safeUserId = Number(user.user_id) || 0;
                const safeName = escapeHtml(user.name || '-');
                const safeEmail = escapeHtml(user.email || '-');
                const safeRole = escapeHtml(getPlatformRoleLabel(user.role));
                const safeClubIdentity = escapeHtml(getUserClubIdentitySummary(user));
                const safeCreatedAt = escapeHtml(formatDateTime(user.created_at));
                const isSelf = currentUserId > 0 && currentUserId === safeUserId;
                const statusLabel = getAccountStatusLabel(user);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="姓名"><div><strong>${safeName}</strong></div></td>
                    <td data-label="Email">${safeEmail}</td>
                    <td data-label="社團身分"><div class="user-mgmt-club-id">${safeClubIdentity}</div></td>
                    <td data-label="狀態"><span class="status-chip ${user.is_active ? 'chip-success' : 'chip-danger'}">${statusLabel}</span></td>
                    <td data-label="權限"><span class="status-chip role-chip">${safeRole}</span></td>
                    <td data-label="加入日期">${safeCreatedAt}</td>
                    <td>
                        <div class="row-actions user-mgmt-actions">
                            <button class="btn btn-secondary btn-sm" data-user-edit="${safeUserId}">✏ 編輯帳號</button>
                            <button class="btn btn-secondary btn-sm" data-user-status-toggle="${safeUserId}" data-next-status="${user.is_active ? 0 : 1}" ${isSelf ? 'disabled' : ''}>${user.is_active ? '⛔ 停權' : '✅ 啟用'}</button>
                        </div>
                    </td>`;
                body.appendChild(row);
            });
            document.querySelectorAll('#users-table button[data-user-edit]').forEach(btn => {
                btn.addEventListener('click', () => openUserEditModal(Number(btn.dataset.userEdit)));
            });
            document.querySelectorAll('#users-table button[data-user-status-toggle]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const toActive = Number(btn.dataset.nextStatus) === 1;
                    if (!confirm(toActive ? '確定要啟用此帳號嗎？' : '確定要停權此帳號嗎？')) return;
                    const response = await APIClient.post('admin.php?action=update_user_status', { user_id: Number(btn.dataset.userStatusToggle), is_active: toActive ? 1 : 0 });
                    if (response.success) { PageUtils.showAlert('帳號狀態更新成功', 'success'); loadUsers(); }
                    else PageUtils.showAlert('更新帳號狀態失敗：' + response.message, 'error');
                });
            });
            renderPagination('users-pagination', pageData, nextPage => { usersState.page = nextPage; renderUsersTable(); });
        }

        function syncModalBodyScrollLock() {
            const el = document.getElementById('user-edit-modal');
            document.body.style.overflow = (el && el.style.display === 'flex') ? 'hidden' : '';
        }

        function openUserEditModal(userId) {
            const user = usersState.rows.find(item => Number(item.user_id) === Number(userId));
            if (!user) return;
            userEditState.originalUser = { ...user };
            const currentUser = (window.StorageUtils && typeof window.StorageUtils.getUser === 'function') ? window.StorageUtils.getUser() : null;
            const isSelf = Number(currentUser?.user_id || 0) === Number(user.user_id);
            const isPlatformAdmin = user.role === 'platform_admin';
            document.getElementById('user-edit-id').value = String(user.user_id || '');
            document.getElementById('user-edit-name').value = user.name || '';
            document.getElementById('user-edit-email').value = user.email || '';
            document.getElementById('user-edit-student-id').value = user.student_id || '';
            document.getElementById('user-edit-status').value = Number(user.is_active) === 1 ? '1' : '0';
            document.getElementById('user-edit-platform-role').value = isPlatformAdmin ? 'platform_admin' : 'student';
            document.getElementById('user-edit-meta-name').textContent = user.name || '-';
            document.getElementById('user-edit-meta-email').textContent = user.email || '-';
            document.getElementById('user-edit-admin-password').value = '';
            document.getElementById('user-edit-platform-role').disabled = isSelf && isPlatformAdmin;
            document.getElementById('user-edit-status').disabled = isSelf;
            const clubSection = document.getElementById('user-edit-club-section');
            if (clubSection) clubSection.style.display = isPlatformAdmin ? 'none' : '';
            if (!isPlatformAdmin) { renderModalClubOptions(); renderUserEditClubRoles(user.user_id); }
            const modal = document.getElementById('user-edit-modal');
            modal.style.display = 'flex';
            syncModalBodyScrollLock();
            document.getElementById('user-edit-name').focus();
            toggleUserEditPasswordField();
        }

        function closeUserEditModal() {
            userEditState.originalUser = null;
            document.getElementById('user-edit-modal').style.display = 'none';
            document.getElementById('user-edit-form').reset();
            document.getElementById('user-edit-password-wrap').style.display = 'none';
            document.getElementById('user-edit-meta-name').textContent = '-';
            document.getElementById('user-edit-meta-email').textContent = '-';
            document.getElementById('user-edit-status').disabled = false;
            document.getElementById('user-edit-platform-role').disabled = false;
            syncModalBodyScrollLock();
        }

        function toggleUserEditPasswordField(focus = false) {
            const user = userEditState.originalUser;
            const nextRole = document.getElementById('user-edit-platform-role').value;
            const originalSelectRole = user ? (user.role === 'platform_admin' ? 'platform_admin' : 'student') : 'student';
            const roleChanged = user && originalSelectRole !== nextRole;
            const crossingPlatformBoundary = roleChanged && (user.role === 'platform_admin' || nextRole === 'platform_admin');
            const wrap = document.getElementById('user-edit-password-wrap');
            const input = document.getElementById('user-edit-admin-password');
            wrap.style.display = crossingPlatformBoundary ? '' : 'none';
            if (crossingPlatformBoundary && focus) {
                wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                setTimeout(() => input.focus(), 120);
            }
            if (!crossingPlatformBoundary) input.value = '';
        }

        async function loadUsers() {
            const response = await APIClient.get('admin.php?action=users');
            if (!response.success) return console.error(response.message);
            usersState.rows = response.data.users || [];
            renderUsersTable();
        }

        async function loadClubs() {
            const response = await APIClient.get('admin.php?action=clubs');
            if (!response.success) return;
            clubsState.rows = response.data.clubs || [];
        }

        async function loadClubAdminAssignments() {
            const response = await APIClient.get('admin.php?action=club_admin_assignments');
            if (!response.success) return;
            clubAdminAssignmentsState.rows = response.data.assignments || [];
        }

        document.getElementById('users-search').addEventListener('input', event => { usersState.query = event.target.value; usersState.page = 1; renderUsersTable(); });
        document.getElementById('users-platform-role-filter').addEventListener('change', event => { usersState.platformRoleFilter = event.target.value; usersState.page = 1; renderUsersTable(); });
        document.getElementById('users-status-filter').addEventListener('change', event => { usersState.statusFilter = event.target.value; usersState.page = 1; renderUsersTable(); });
        document.getElementById('user-edit-platform-role').addEventListener('change', () => toggleUserEditPasswordField(true));
        document.getElementById('user-edit-close-btn').addEventListener('click', closeUserEditModal);
        document.getElementById('user-edit-cancel-btn').addEventListener('click', closeUserEditModal);
        document.getElementById('user-edit-modal').addEventListener('click', event => { if (event.target.id === 'user-edit-modal') closeUserEditModal(); });
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            const modal = document.getElementById('user-edit-modal');
            if (modal && modal.style.display === 'flex') closeUserEditModal();
        });

        document.getElementById('user-edit-form').addEventListener('submit', async event => {
            event.preventDefault();
            const userId = Number(document.getElementById('user-edit-id').value || 0);
            const original = userEditState.originalUser;
            if (!userId || !original) return;
            const nextName = document.getElementById('user-edit-name').value.trim();
            const nextEmail = document.getElementById('user-edit-email').value.trim();
            const nextStudentId = document.getElementById('user-edit-student-id').value.trim();
            const nextRole = document.getElementById('user-edit-platform-role').value;
            const nextStatus = Number(document.getElementById('user-edit-status').value) === 1 ? 1 : 0;
            const adminPassword = document.getElementById('user-edit-admin-password').value;
            if (!nextName) { PageUtils.showAlert('姓名不可為空', 'error'); return; }
            if (!nextEmail || !Validator.validateEmail(nextEmail)) { PageUtils.showAlert('請輸入有效的 Email', 'error'); return; }
            const profileChanged = nextName !== (original.name || '') || nextEmail !== (original.email || '') || nextStudentId !== (original.student_id || '');
            const originalSelectRole = original.role === 'platform_admin' ? 'platform_admin' : 'student';
            const roleChanged = nextRole !== originalSelectRole;
            const statusChanged = nextStatus !== (Number(original.is_active) === 1 ? 1 : 0);
            if (!profileChanged && !roleChanged && !statusChanged) { closeUserEditModal(); return; }
            if (roleChanged) {
                const isToPlatformAdmin = nextRole === 'platform_admin';
                if (!confirm(isToPlatformAdmin ? '確定要將此帳號升級為平台管理員嗎？' : '確定要將此平台管理員降級為一般帳號嗎？')) return;
            }
            if (profileChanged) {
                const res = await APIClient.post('admin.php?action=update_user_profile', { user_id: userId, name: nextName, email: nextEmail, student_id: nextStudentId });
                if (!res.success) { PageUtils.showAlert('更新基本資料失敗：' + res.message, 'error'); return; }
            }
            if (statusChanged) {
                const res = await APIClient.post('admin.php?action=update_user_status', { user_id: userId, is_active: nextStatus });
                if (!res.success) { PageUtils.showAlert('更新帳號狀態失敗：' + res.message, 'error'); return; }
            }
            if (roleChanged) {
                if (!adminPassword) { PageUtils.showAlert('升降平台權限需要輸入管理員密碼', 'error'); return; }
                const res = await APIClient.post('admin.php?action=update_user_role', { user_id: userId, role: nextRole, confirmed: 1, admin_password: adminPassword });
                if (!res.success) { PageUtils.showAlert('更新平台權限失敗：' + res.message, 'error'); return; }
            }
            PageUtils.showAlert('帳號資料更新成功', 'success');
            closeUserEditModal();
            loadUsers();
        });

        document.getElementById('user-edit-club-add-btn').addEventListener('click', async () => {
            const userId = Number(document.getElementById('user-edit-id').value);
            const clubId = document.getElementById('user-edit-club-add-club-id').value;
            const role = document.getElementById('user-edit-club-add-role').value;
            if (!clubId) { PageUtils.showAlert('請選擇社團', 'error'); return; }
            const res = await APIClient.post('admin.php?action=upsert_club_admin_assignment', { club_id: Number(clubId), user_key: String(userId), role, is_active: 1 });
            if (res.success) {
                PageUtils.showAlert('職位已新增', 'success');
                document.getElementById('user-edit-club-add-club-id').value = '';
                await Promise.all([loadClubAdminAssignments(), loadUsers()]);
                renderUserEditClubRoles(userId);
            } else {
                PageUtils.showAlert('新增失敗：' + res.message, 'error');
            }
        });

        loadUsers();
        loadClubs();
        loadClubAdminAssignments();

        // ── 類別助教管理（依六大分類分組顯示）─────────────────────────────
        (async function initCategoryAssistants() {
            const userSel   = document.getElementById('ca-user-select');
            const catSel    = document.getElementById('ca-category-select');
            const assignBtn = document.getElementById('ca-assign-btn');
            const groupsEl  = document.getElementById('ca-groups');
            if (!userSel || !catSel || !assignBtn || !groupsEl) return;

            let caCategories = [];

            async function loadCaUsers() {
                try {
                    const res = await APIClient.get('admin.php?action=users');
                    const users = (res && res.data && res.data.users) ? res.data.users : [];
                    const eligible = users.filter(u => u.role !== 'platform_admin' && u.is_active != 0);
                    userSel.innerHTML = '<option value="">請選擇帳號</option>' +
                        eligible.map(u => `<option value="${u.user_id}">${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>`).join('');
                } catch (e) {
                    userSel.innerHTML = '<option value="">載入失敗</option>';
                }
            }

            async function loadCaCategories() {
                try {
                    const res = await APIClient.get('clubs.php?action=categories');
                    caCategories = (res && res.data && res.data.categories) ? res.data.categories : [];
                    catSel.innerHTML = '<option value="">請選擇類別</option>' +
                        caCategories.map(c => `<option value="${c.category_id}">${escapeHtml(c.category_name)}</option>`).join('');
                } catch (e) {
                    catSel.innerHTML = '<option value="">載入失敗</option>';
                }
            }

            function bindRevokeButtons() {
                groupsEl.querySelectorAll('.ca-revoke-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        if (!confirm('確定撤銷此助教資格？')) return;
                        btn.disabled = true;
                        try {
                            const res = await APIClient.post('admin.php?action=revoke_category_assistant', { user_id: Number(btn.dataset.uid) });
                            if (res && res.success) {
                                PageUtils.showAlert('已撤銷助教資格', 'success');
                                await Promise.all([loadCaGroups(), loadCaUsers()]);
                            } else {
                                PageUtils.showAlert(res.message || '撤銷失敗', 'error');
                                btn.disabled = false;
                            }
                        } catch (e) {
                            PageUtils.showAlert('操作失敗', 'error');
                            btn.disabled = false;
                        }
                    });
                });
            }

            async function loadCaGroups() {
                if (caCategories.length === 0) await loadCaCategories();
                let rows = [];
                try {
                    const res = await APIClient.get('admin.php?action=category_assistants');
                    rows = (res && res.data && res.data.assignments) ? res.data.assignments : [];
                } catch (e) {
                    groupsEl.innerHTML = '<p class="widget-empty">載入失敗</p>';
                    return;
                }
                if (caCategories.length === 0) {
                    groupsEl.innerHTML = '<p class="widget-empty">尚無分類資料</p>';
                    return;
                }
                const byCat = {};
                rows.forEach(r => { (byCat[r.category_id] = byCat[r.category_id] || []).push(r); });

                groupsEl.innerHTML = caCategories.map(cat => {
                    const list = byCat[cat.category_id] || [];
                    const body = list.length
                        ? list.map(r => `
                            <div class="ca-assistant">
                                <div class="ca-assistant__info">
                                    <div class="ca-assistant__name">${escapeHtml(r.name)}</div>
                                    <div class="ca-assistant__email">${escapeHtml(r.email)}</div>
                                </div>
                                <button class="btn btn-danger-outline btn-sm ca-revoke-btn" data-uid="${r.user_id}">撤銷</button>
                            </div>`).join('')
                        : '<div class="ca-empty">尚未指派助教</div>';
                    return `
                        <div class="ca-group">
                            <div class="ca-group__head">
                                <span class="ca-group__title">${escapeHtml(cat.category_name)}</span>
                                <span class="ca-group__count">${list.length} 位助教</span>
                            </div>
                            ${body}
                        </div>`;
                }).join('');
                bindRevokeButtons();
            }

            assignBtn.addEventListener('click', async () => {
                const userId     = Number(userSel.value);
                const categoryId = Number(catSel.value);
                if (!userId)     { PageUtils.showAlert('請選擇帳號', 'error'); return; }
                if (!categoryId) { PageUtils.showAlert('請選擇類別', 'error'); return; }
                assignBtn.disabled = true;
                try {
                    const res = await APIClient.post('admin.php?action=assign_category_assistant', { user_id: userId, category_id: categoryId });
                    if (res && res.success) {
                        PageUtils.showAlert('已指派助教', 'success');
                        userSel.value = '';
                        catSel.value  = '';
                        await Promise.all([loadCaGroups(), loadCaUsers(), loadUsers()]);
                    } else {
                        PageUtils.showAlert(res.message || '指派失敗', 'error');
                    }
                } catch (e) {
                    PageUtils.showAlert('操作失敗', 'error');
                } finally {
                    assignBtn.disabled = false;
                }
            });

            await loadCaCategories();
            await Promise.all([loadCaUsers(), loadCaGroups()]);
        })();
