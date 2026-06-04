        let currentUser = null;

        /* ── Tab 切換 ── */
        function initTabs() {
            const tabs = document.querySelectorAll('.profile-tab');
            const exportBtn = document.getElementById('export-proof-btn');

            tabs.forEach(tab => {
                tab.addEventListener('click', function () {
                    const tabId = this.dataset.tab;

                    tabs.forEach(t => {
                        t.classList.remove('is-active');
                        t.setAttribute('aria-selected', 'false');
                    });
                    this.classList.add('is-active');
                    this.setAttribute('aria-selected', 'true');

                    document.querySelectorAll('.profile-tab-panel').forEach(p => { p.hidden = true; });
                    document.getElementById(`panel-${tabId}`).hidden = false;

                    exportBtn.style.display = tabId === 'my-events' ? '' : 'none';
                });
            });
        }

        function applyProfileTabsByRole(user) {
            const tabs = document.querySelectorAll('.profile-tab');
            const panels = document.querySelectorAll('.profile-tab-panel');
            const exportBtn = document.getElementById('export-proof-btn');
            const isPlatformAdmin = user && user.role === 'platform_admin';

            const logoLink = document.querySelector('a.logo');
            if (logoLink) logoLink.href = isPlatformAdmin ? 'admin-users.html' : '../index.html';

            // 非管理員才顯示危險區域
            const dangerZone = document.getElementById('danger-zone');
            if (dangerZone) dangerZone.style.display = isPlatformAdmin ? 'none' : 'block';

            if (!isPlatformAdmin) {
                return;
            }

            tabs.forEach(tab => {
                const isEdit = tab.dataset.tab === 'edit-profile';
                tab.style.display = isEdit ? '' : 'none';
                tab.classList.toggle('is-active', isEdit);
                tab.setAttribute('aria-selected', isEdit ? 'true' : 'false');
            });

            panels.forEach(panel => {
                panel.hidden = panel.id !== 'panel-edit-profile';
            });

            if (exportBtn) {
                exportBtn.style.display = 'none';
            }

            const sidebar = document.getElementById('followed-clubs-section');
            if (sidebar) sidebar.remove();
            document.body.classList.remove('has-global-follow-sidebar', 'sidebar-expanded');
        }

        /* ── 主載入 ── */
        async function loadUserProfile() {
            try {
                const response = await APIClient.get('auth.php?action=current');
                if (response.success) {
                    currentUser = response.data;
                    StorageUtils.setUser(currentUser);
                    displayUserProfile(currentUser);
                    applyProfileTabsByRole(currentUser);
                    renderPasswordSection(currentUser);
                    renderGoogleBindStatus(currentUser);

                    if (currentUser.role !== 'platform_admin') {
                        loadFollowedClubs();
                        loadJoinedClubs();
                        loadUserEvents();
                        loadFollowedFeed();
                        loadUserQuestions();
                    }
                } else {
                    PageUtils.showAlert('載入用戶資料失敗', 'error');
                    window.location.href = 'login.html';
                }
            } catch (error) {
                console.error('Error:', error);
                PageUtils.showAlert('載入用戶資料失敗', 'error');
                window.location.href = 'login.html';
            } finally {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('profile-content').style.display = 'block';
            }
        }

        function displayUserProfile(user) {
            const avatarUrl = user.avatar_path ? `../${user.avatar_path}` : null;
            const initial = (user.name || '用戶').charAt(0).toUpperCase();

            const heroAvatar = document.getElementById('hero-avatar');
            if (avatarUrl) {
                heroAvatar.innerHTML = `<img src="${avatarUrl}" alt="${user.name}">`;
            } else {
                heroAvatar.textContent = initial;
            }

            document.getElementById('hero-name').textContent = user.name || '未命名用戶';
            document.getElementById('hero-email').textContent = user.email || '';
            document.getElementById('hero-role').textContent = getRoleName(user.role);
            document.getElementById('hero-student-id').textContent = user.student_id ? `學號：${user.student_id}` : '';
            const uid = user.user_id || user.id;
            document.getElementById('hero-user-id').textContent = uid ? `用戶 ID：#${uid}` : '';

            document.getElementById('edit-name').value = user.name || '';
            const studentIdInput = document.getElementById('edit-student-id');
            studentIdInput.value = user.student_id || '';
            if (user.role === 'student') {
                studentIdInput.readOnly = true;
                studentIdInput.title = '學生帳號不可修改學號';
            } else {
                studentIdInput.readOnly = false;
                studentIdInput.removeAttribute('title');
            }
            document.getElementById('edit-phone').value = user.phone || '';
        }

        function getRoleName(role) {
            const roles = { student: '學生', club_admin: '社團幹部', platform_admin: '平台管理員' };
            return roles[role] || role;
        }

        /* ── 已追蹤的社團 ── */
        async function loadFollowedClubs() {
            try {
                const response = await APIClient.get('clubs.php?action=my_follows');
                const container = document.getElementById('followed-clubs-list');

                if (!response.success) {
                    container.innerHTML = '<p class="profile-empty">載入追蹤社團失敗</p>';
                    return;
                }

                const clubs = response.data.clubs || [];
                if (clubs.length === 0) {
                    container.innerHTML = `
                        <div class="profile-empty" style="grid-column:1/-1">
                            <p class="profile-empty__title">尚未追蹤任何社團</p>
                            <p>前往社團列表，追蹤您感興趣的社團</p>
                            <a href="club-list.html" class="btn btn-primary btn-sm">探索社團</a>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = clubs.map(club => renderFollowedClubRow(club)).join('');
            } catch (error) {
                console.error('Error loading followed clubs:', error);
                document.getElementById('followed-clubs-list').innerHTML = '<p class="profile-empty">載入失敗</p>';
            }
        }

        function renderFollowedClubRow(club) {
            const name = club.club_name || '未命名社團';

            const badgeMap = {
                high_active:        { label: '高活躍',   cls: 'club-active' },
                normal_active:      { label: '穩定活躍', cls: 'club-steady' },
                no_recent_activity: { label: '低活躍',   cls: 'club-quiet' }
            };
            const badge = badgeMap[club.activity_badge] || null;

            return `
                <div class="followed-club-row">
                    <div class="followed-club-row__layout">
                        ${PageUtils.renderClubAvatar(club, 40)}
                        <div>
                            <h3 class="followed-club-row__name">${name}</h3>
                            ${club.description ? `<p class="followed-club-row__desc">${club.description}</p>` : ''}
                        </div>
                        <div class="followed-club-row__footer">
                            ${badge ? `<span class="profile-status-badge profile-status-badge--${badge.cls}">${badge.label}</span>` : ''}
                            <a href="club-detail.html?id=${club.club_id}" class="btn btn-primary btn-sm">查看社團</a>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="toggleFollowClub(${club.club_id}, this)">取消追蹤</button>
                        </div>
                    </div>
                </div>
            `;
        }

        async function toggleFollowClub(clubId, btn) {
            btn.disabled = true;
            btn.textContent = '處理中...';
            try {
                const response = await APIClient.post(`clubs.php?action=toggle_follow&id=${clubId}`, {});
                if (response.success) {
                    loadFollowedClubs();
                } else {
                    PageUtils.showAlert(response.message || '操作失敗', 'error');
                    btn.disabled = false;
                    btn.textContent = '取消追蹤';
                }
            } catch (error) {
                console.error('Error toggling follow:', error);
                PageUtils.showAlert('操作失敗', 'error');
                btn.disabled = false;
                btn.textContent = '取消追蹤';
            }
        }

        /* ── 已加入的社團 ── */
        async function loadJoinedClubs() {
            try {
                const response = await APIClient.get('clubs.php?action=my_memberships');
                const container = document.getElementById('joined-clubs-list');
                if (!response.success) {
                    container.innerHTML = '<p class="profile-empty">載入已加入社團失敗</p>';
                    return;
                }
                const clubs = response.data.clubs || [];
                if (clubs.length === 0) {
                    container.innerHTML = `
                        <div class="profile-empty" style="grid-column:1/-1">
                            <p class="profile-empty__title">尚未加入任何社團</p>
                            <p>前往社團列表，加入您有興趣的社團</p>
                            <a href="club-list.html" class="btn btn-primary btn-sm">探索社團</a>
                        </div>
                    `;
                    return;
                }
                container.innerHTML = clubs.map(club => renderJoinedClubRow(club)).join('');
            } catch (error) {
                console.error('Error loading joined clubs:', error);
                document.getElementById('joined-clubs-list').innerHTML = '<p class="profile-empty">載入失敗</p>';
            }
        }

        const FEE_TYPE_LABELS = { none: '未指定費用', onetime: '一次付清', semester: '學期費', session: '單堂費' };
        const ROLE_LABELS_PROFILE = {
            president: '社長', vice_president: '副社長',
            public_relations: '公關', treasurer: '總務',
            director: '幹事', member: '一般成員', advisor: '顧問'
        };

        function renderJoinedClubRow(club) {
            const name = PageUtils.escapeHtml(club.club_name || '未命名社團');
            const roleLabel = ROLE_LABELS_PROFILE[club.role] || club.role;
            const feeLabel = FEE_TYPE_LABELS[club.fee_type] || '';
            const isOfficer = club.role !== 'member';
            const badgeMap = {
                high_active:        { label: '高活躍',   cls: 'club-active' },
                normal_active:      { label: '穩定活躍', cls: 'club-steady' },
                no_recent_activity: { label: '低活躍',   cls: 'club-quiet' }
            };
            const actBadge = badgeMap[club.activity_badge] || null;

            return `
                <div class="followed-club-row">
                    <div class="followed-club-row__layout">
                        ${PageUtils.renderClubAvatar(club, 40)}
                        <div>
                            <h3 class="followed-club-row__name">${name}</h3>
                            <p class="followed-club-row__desc" style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.2rem;">
                                <span class="profile-status-badge" style="background:var(--accent-bg,#ede9fe);color:var(--accent,#7C3AED);">${PageUtils.escapeHtml(roleLabel)}</span>
                                ${feeLabel ? `<span class="profile-status-badge" style="background:var(--surface-2,#f3f4f6);color:var(--text-muted);">${PageUtils.escapeHtml(feeLabel)}</span>` : ''}
                            </p>
                        </div>
                        <div class="followed-club-row__footer">
                            ${actBadge ? `<span class="profile-status-badge profile-status-badge--${actBadge.cls}">${actBadge.label}</span>` : ''}
                            <a href="club-detail.html?id=${club.club_id}" class="btn btn-primary btn-sm">查看社團</a>
                            ${!isOfficer ? `<button type="button" class="btn btn-secondary btn-sm" onclick="leaveClubFromProfile(${club.club_id}, this)">退出社團</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        async function leaveClubFromProfile(clubId, btn) {
            if (!confirm('確定要退出此社團嗎？')) return;
            btn.disabled = true;
            btn.textContent = '處理中...';
            try {
                const response = await APIClient.post(`clubs.php?action=leave_club&id=${clubId}`, {});
                if (response.success) {
                    loadJoinedClubs();
                } else {
                    PageUtils.showAlert(response.message || '退出失敗', 'error');
                    btn.disabled = false;
                    btn.textContent = '退出社團';
                }
            } catch (error) {
                console.error('Error leaving club:', error);
                PageUtils.showAlert('退出失敗', 'error');
                btn.disabled = false;
                btn.textContent = '退出社團';
            }
        }

        /* ── 我的活動 ── */
        async function loadUserEvents() {
            try {
                const response = await APIClient.get('events.php?action=my_events');
                if (response.success) {
                    const events = response.data.events;
                    const container = document.getElementById('my-events');

                    if (events.length === 0) {
                        container.innerHTML = '<p class="profile-empty">您還沒有參加任何活動</p>';
                        return;
                    }

                    container.innerHTML = events.map(event => {
                        const isApproved = event.registration_status === 'approved';
                        const statusClass = isApproved ? 'approved' : 'pending';
                        const statusLabel = isApproved ? '已報名' : '待審核';
                        const eventId = Number(event.event_id) || 0;
                        const rowTag = eventId ? 'a' : 'div';
                        const rowHref = eventId ? ` href="event-detail.html?id=${eventId}"` : '';
                        return `
                            <${rowTag} class="profile-event-row"${rowHref}>
                                <div class="profile-event-row__info">
                                    <h4 class="profile-event-row__title">${event.event_name || '未命名活動'}</h4>
                                    <div class="profile-event-row__meta">
                                        <span>${event.club_name || '-'}</span>
                                        <span>${PageUtils.formatDate(event.event_date)}</span>
                                    </div>
                                </div>
                                <div class="profile-event-row__actions">
                                    <span class="profile-status-badge profile-status-badge--${statusClass}">${statusLabel}</span>
                                </div>
                            </${rowTag}>
                        `;
                    }).join('');
                }
            } catch (error) {
                console.error('Error loading events:', error);
                document.getElementById('my-events').innerHTML = '<p class="profile-empty">載入失敗</p>';
            }
        }

        /* ── 參與證明匯出 ── */
        async function downloadParticipationProof() {
            if (!StorageUtils.isLoggedIn()) {
                PageUtils.showAlert('請先登入', 'warning');
                return;
            }
            try {
                const base = APIClient.getBaseUrl();
                const url = `${base}/events.php?action=participation_proof`;
                const csrfHeaders = await APIClient.getCSRFHeaders();
                const token = StorageUtils.getToken();
                const headers = { ...csrfHeaders, ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
                const response = await fetch(url, { method: 'GET', credentials: 'include', headers });

                if (!response.ok) {
                    let message = '匯出參與證明失敗';
                    try { const data = await response.json(); message = data.message || message; } catch (_) {}
                    throw new Error(message);
                }

                const blob = await response.blob();
                const disposition = response.headers.get('content-disposition') || '';
                const match = disposition.match(/filename="?([^";]+)"?/i);
                const fileName = match ? match[1] : `participation_proof_${Date.now()}.svg`;
                const objectUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = objectUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(objectUrl);
                PageUtils.showAlert('參與證明已匯出', 'success');
            } catch (error) {
                console.error('Error exporting participation proof:', error);
                PageUtils.showAlert(error.message || '匯出參與證明失敗', 'error');
            }
        }

        /* ── 個人動態牆 ── */
        function getTimelineStatusMeta(event) {
            const s = String(event.event_status || '').toLowerCase();
            const t = new Date(event.event_date).getTime();
            const now = Date.now();
            if (s === 'completed') return { label: '已完成', className: 'completed' };
            if (s === 'ongoing')   return { label: '進行中', className: 'ongoing' };
            if (!Number.isNaN(t) && t > now) return { label: '未開始', className: 'upcoming' };
            return { label: '已參與', className: 'attended' };
        }

        async function loadFollowedFeed() {
            try {
                if (!currentUser?.user_id) return;

                const response = await APIClient.get('events.php?action=my_timeline');
                if (response.success) {
                    const feed = response.data.events || [];
                    const container = document.getElementById('followed-feed');

                    if (feed.length === 0) {
                        container.innerHTML = `
                            <div class="profile-empty">
                                <p class="profile-empty__title">尚無活動動態</p>
                                <p>您尚未參加任何活動</p>
                                <a href="events.html" class="btn btn-primary btn-sm">前往探索活動</a>
                            </div>
                        `;
                        return;
                    }

                    container.innerHTML = feed.map(item => {
                        const sm = getTimelineStatusMeta(item);
                        return `
                            <div class="profile-event-row">
                                <div class="profile-event-row__info">
                                    <h4 class="profile-event-row__title">${item.event_name || '未命名活動'}</h4>
                                    <div class="profile-event-row__meta">
                                        <span>${item.club_name || '-'}</span>
                                        <span>${PageUtils.formatDate(item.event_date)}</span>
                                    </div>
                                </div>
                                <div class="profile-event-row__actions">
                                    <span class="profile-status-badge profile-status-badge--${sm.className}">${sm.label}</span>
                                    <a href="event-detail.html?id=${item.event_id}" class="btn btn-primary btn-sm">查看活動</a>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            } catch (error) {
                console.error('Error loading feed:', error);
                document.getElementById('followed-feed').innerHTML = '<p class="profile-empty">載入活動歷程失敗</p>';
            }
        }

        /* ── 我的提問 ── */
        async function loadUserQuestions() {
            try {
                const response = await APIClient.get('qa.php?action=my_questions');
                if (response.success) {
                    const questions = response.data.questions;
                    const container = document.getElementById('my-questions');

                    if (questions.length === 0) {
                        container.innerHTML = '<p class="profile-empty">您還沒有發布任何提問</p>';
                        return;
                    }

                    container.innerHTML = questions.map(question => {
                        const isSolved = question.status === 'closed' || Number(question.is_solved) === 1;
                        const title = question.title || question.question_title || '未命名提問';
                        return `
                            <div class="profile-question-row">
                                <div class="profile-question-row__info">
                                    <h4 class="profile-question-row__title">${title}</h4>
                                    <div class="profile-question-row__meta">
                                        <span>${PageUtils.timeAgo(question.created_at)}</span>
                                    </div>
                                </div>
                                <div class="profile-question-row__actions">
                                    <span class="profile-status-badge profile-status-badge--${isSolved ? 'solved' : 'unsolved'}">${isSolved ? '已解決' : '待解決'}</span>
                                    <a href="qa-detail.html?id=${question.qa_id}" class="btn btn-primary btn-sm">查看詳情</a>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            } catch (error) {
                console.error('Error loading questions:', error);
                document.getElementById('my-questions').innerHTML = '<p class="profile-empty">載入失敗</p>';
            }
        }

        /* ── 頭像預覽 ── */
        function previewAvatar(event) {
            const file = event.target.files[0];
            const preview = document.getElementById('avatar-preview');
            const img = document.getElementById('avatar-img');
            if (file) {
                const reader = new FileReader();
                reader.onload = e => { img.src = e.target.result; preview.style.display = 'flex'; };
                reader.readAsDataURL(file);
            } else {
                preview.style.display = 'none';
            }
        }

        /* ── 更新個人資料 ── */
        async function handleProfileUpdate(e) {
            e.preventDefault();
            const name = document.getElementById('edit-name').value.trim();
            const studentId = document.getElementById('edit-student-id').value.trim();
            const phone = document.getElementById('edit-phone').value.trim();
            const avatarFile = document.getElementById('avatar-upload').files[0];

            if (!name) { PageUtils.showAlert('請輸入姓名', 'error'); return; }

            try {
                let avatarPath = null;
                if (avatarFile) {
                    const formData = new FormData();
                    formData.append('avatar', avatarFile);
                    const csrfHeaders = await APIClient.getCSRFHeaders();
                    const uploadResponse = await fetch(`${APIClient.getBaseUrl()}/upload.php?action=upload_user_avatar`, {
                        method: 'POST', body: formData, credentials: 'include',
                        headers: { ...APIClient.getAuthHeaders(), ...csrfHeaders }
                    });
                    let uploadResult = null;
                    try { uploadResult = await uploadResponse.json(); } catch (_) {
                        PageUtils.showAlert('頭像上傳失敗: 回應格式錯誤', 'error'); return;
                    }
                    if (uploadResponse.ok && uploadResult.success) {
                        avatarPath = uploadResult.path;
                        PageUtils.showAlert('頭像上傳成功', 'success');
                    } else {
                        PageUtils.showAlert('頭像上傳失敗: ' + (uploadResult.message || '未知錯誤'), 'error'); return;
                    }
                }

                const updateData = { name, phone };
                if (currentUser && currentUser.role !== 'student') {
                    updateData.student_id = studentId;
                }
                if (avatarPath) updateData.avatar_path = avatarPath;

                const response = await APIClient.put('auth.php?action=update', updateData);
                if (response.success) {
                    PageUtils.showAlert('個人資料更新成功', 'success');
                    loadUserProfile();
                } else {
                    PageUtils.showAlert(response.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                PageUtils.showAlert('更新失敗', 'error');
            }
        }

        /* ── 密碼區塊依帳號類型切換 ── */
        function renderPasswordSection(user) {
            const isGoogleOnly = user && user.google_id && user.oauth_provider === 'google';
            const oldRow  = document.getElementById('current-password-row');
            const title   = document.getElementById('password-section-title');
            const submitBtn = document.getElementById('password-submit-btn');
            const hint    = document.getElementById('password-section-hint');

            if (isGoogleOnly) {
                if (oldRow)    oldRow.style.display = 'none';
                if (title)     title.textContent = '設定密碼';
                if (submitBtn) submitBtn.textContent = '設定密碼';
                if (hint)      hint.textContent = '您的帳號透過 Google 建立，請先設定密碼才能解除 Google 綁定。密碼至少 8 個字元。';
            } else {
                if (oldRow)    oldRow.style.display = '';
                if (title)     title.textContent = '變更密碼';
                if (submitBtn) submitBtn.textContent = '變更密碼';
                if (hint)      hint.textContent = '密碼至少需要 6 個字元。';
            }
        }

        /* ── 變更密碼 ── */
        async function handleChangePassword(e) {
            e.preventDefault();
            const isGoogleOnly = currentUser && currentUser.google_id && currentUser.oauth_provider === 'google';
            const oldPassword    = document.getElementById('current-password').value;
            const newPassword    = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (isGoogleOnly) {
                if (!newPassword || !confirmPassword) {
                    PageUtils.showAlert('請填寫所有密碼欄位', 'error');
                    return;
                }
                if (newPassword.length < 8) {
                    PageUtils.showAlert('密碼至少需要 8 個字元', 'error');
                    return;
                }
                if (newPassword !== confirmPassword) {
                    PageUtils.showAlert('兩次輸入的密碼不一致', 'error');
                    return;
                }
            } else {
                if (!oldPassword || !newPassword || !confirmPassword) {
                    PageUtils.showAlert('請填寫所有密碼欄位', 'error');
                    return;
                }
                if (newPassword.length < 6) {
                    PageUtils.showAlert('新密碼至少需要 6 個字元', 'error');
                    return;
                }
                if (newPassword !== confirmPassword) {
                    PageUtils.showAlert('兩次輸入的新密碼不一致', 'error');
                    return;
                }
                if (newPassword === oldPassword) {
                    PageUtils.showAlert('新密碼不可與目前密碼相同', 'error');
                    return;
                }
            }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = '處理中…';

            try {
                let response;
                if (isGoogleOnly) {
                    response = await APIClient.post('auth.php?action=set_password', {
                        new_password: newPassword,
                        confirm_password: confirmPassword,
                    });
                } else {
                    response = await APIClient.post('auth.php?action=change_password', {
                        old_password: oldPassword,
                        new_password: newPassword,
                    });
                }
                if (response.success) {
                    PageUtils.showAlert(isGoogleOnly ? '密碼設定成功，現在可以解除 Google 綁定' : '密碼變更成功', 'success');
                    e.target.reset();
                    if (isGoogleOnly && currentUser) {
                        currentUser.oauth_provider = 'email';
                        renderPasswordSection(currentUser);
                        renderGoogleBindStatus(currentUser);
                    }
                } else {
                    PageUtils.showAlert(response.message || '操作失敗', 'error');
                }
            } catch (err) {
                PageUtils.showAlert('操作失敗，請稍後再試', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = isGoogleOnly ? '設定密碼' : '變更密碼';
            }
        }

        /* ── 註銷帳號 ── */
        function openDeactivateModal() {
            document.getElementById('deactivate-password').value = '';
            document.getElementById('deactivate-modal').style.display = 'flex';
            document.getElementById('deactivate-password').focus();
        }

        function closeDeactivateModal() {
            document.getElementById('deactivate-modal').style.display = 'none';
            document.getElementById('deactivate-password').value = '';
        }

        async function handleDeactivateSubmit(e) {
            e.preventDefault();
            const password = document.getElementById('deactivate-password').value;
            if (!password) {
                PageUtils.showAlert('請輸入密碼', 'error');
                return;
            }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = '處理中…';

            try {
                const response = await APIClient.post('auth.php?action=deactivate_account', { password });
                if (response.success) {
                    closeDeactivateModal();
                    StorageUtils.clearUser();
                    PageUtils.showAlert('帳號已成功註銷，即將跳轉至登入頁', 'success');
                    setTimeout(() => { window.location.href = 'login.html'; }, 1800);
                } else {
                    PageUtils.showAlert(response.message || '註銷失敗', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = '確認刪除帳號';
                }
            } catch (err) {
                console.error('Deactivate error:', err);
                PageUtils.showAlert('發生錯誤，請稍後再試', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = '確認刪除帳號';
            }
        }

        window.addEventListener('DOMContentLoaded', function () {
            initTabs();
            loadUserProfile();
            document.getElementById('edit-profile-form').addEventListener('submit', handleProfileUpdate);
            document.getElementById('change-password-form').addEventListener('submit', handleChangePassword);
            document.getElementById('deactivate-form').addEventListener('submit', handleDeactivateSubmit);
            // 點擊遮罩關閉 modal
            document.getElementById('deactivate-modal').addEventListener('click', function (e) {
                if (e.target === this) closeDeactivateModal();
            });

            // 學號、電話：只允許輸入數字，非數字鍵直接攔截
            function blockNonDigit(e) {
                if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault();
            }
            document.getElementById('edit-student-id').addEventListener('keydown', blockNonDigit);
            document.getElementById('edit-phone').addEventListener('keydown', blockNonDigit);
            // 處理貼上（paste）時濾除非數字字元
            function filterPasteDigits(e) {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text');
                const digits = text.replace(/\D/g, '');
                const input = e.target;
                const max = parseInt(input.maxLength, 10) || 999;
                const newVal = (input.value.slice(0, input.selectionStart) + digits + input.value.slice(input.selectionEnd)).slice(0, max);
                input.value = newVal;
            }
            document.getElementById('edit-student-id').addEventListener('paste', filterPasteDigits);
            document.getElementById('edit-phone').addEventListener('paste', filterPasteDigits);
        });

        /* ── Google 帳號綁定 ─────────────────────────────────────────────── */
        let _googleClientId = null;
        let _gisLoaded = false;

        function renderGoogleBindStatus(user) {
            const label     = document.getElementById('google-bind-label');
            const statusDiv = document.getElementById('google-bind-status');
            if (!label || !statusDiv) return;

            statusDiv.querySelectorAll('button, .google-link-wrap').forEach(el => el.remove());

            if (user && user.google_id) {
                label.textContent = '已綁定 Google 帳號';
                label.style.color = 'var(--cta)';

                const isGoogleOnly = user.oauth_provider === 'google';
                const unlinkBtn = document.createElement('button');
                unlinkBtn.type = 'button';
                unlinkBtn.className = 'btn btn-secondary btn-sm';
                unlinkBtn.textContent = '解除綁定';
                if (isGoogleOnly) {
                    unlinkBtn.disabled = true;
                    unlinkBtn.title = '請先在下方設定密碼，才能解除 Google 帳號綁定';
                } else {
                    unlinkBtn.addEventListener('click', handleUnlinkGoogle);
                }
                statusDiv.appendChild(unlinkBtn);
            } else {
                label.textContent = '尚未綁定 Google 帳號';
                label.style.color = 'var(--text-muted)';

                const wrap = document.createElement('div');
                wrap.className = 'google-link-wrap';
                statusDiv.appendChild(wrap);
                initGoogleLinkButton(wrap);
            }
        }

        async function initGoogleLinkButton(container) {
            if (!_googleClientId) {
                try {
                    const res = await APIClient.get('oauth.php?action=google_client_id');
                    if (!res || !res.success || !res.data || !res.data.client_id) {
                        container.innerHTML = '<span style="font-size:0.8rem;color:var(--text-soft);">Google 登入未啟用</span>';
                        return;
                    }
                    _googleClientId = res.data.client_id;
                } catch (e) {
                    container.innerHTML = '<span style="font-size:0.8rem;color:var(--text-soft);">無法取得 Google 設定</span>';
                    return;
                }
            }

            if (!_gisLoaded) {
                await new Promise(function (resolve, reject) {
                    if (window.google && window.google.accounts) { resolve(); return; }
                    const s = document.createElement('script');
                    s.src = 'https://accounts.google.com/gsi/client';
                    s.async = true; s.defer = true;
                    s.onload = resolve; s.onerror = reject;
                    document.head.appendChild(s);
                });
                _gisLoaded = true;
            }

            google.accounts.id.initialize({
                client_id: _googleClientId,
                callback: handleGoogleLinkCallback,
                ux_mode: 'popup',
                cancel_on_tap_outside: true,
            });

            google.accounts.id.renderButton(container, {
                type: 'standard', shape: 'rectangular', theme: 'outline',
                text: 'continue_with', size: 'medium', logo_alignment: 'left',
            });
        }

        async function handleGoogleLinkCallback(googleResponse) {
            const credential = googleResponse.credential;
            if (!credential) {
                PageUtils.showAlert('Google 綁定失敗，請重試', 'error');
                return;
            }
            try {
                const res = await APIClient.post('oauth.php?action=link_google', { credential });
                if (res && res.success) {
                    PageUtils.showAlert('Google 帳號綁定成功', 'success');
                    if (currentUser) currentUser.google_id = (res.data && res.data.google_id) || '_linked';
                    renderGoogleBindStatus(currentUser);
                } else {
                    PageUtils.showAlert((res && res.message) || 'Google 綁定失敗', 'error');
                }
            } catch (e) {
                PageUtils.showAlert('Google 綁定失敗，請稍後重試', 'error');
            }
        }

        async function handleUnlinkGoogle() {
            if (!confirm('確定要解除 Google 帳號綁定嗎？\n\n解除後若尚未設定密碼，將無法以 Email 登入。')) return;
            try {
                const res = await APIClient.post('oauth.php?action=unlink_google', {});
                if (res && res.success) {
                    PageUtils.showAlert('Google 帳號已解除綁定', 'success');
                    if (currentUser) { currentUser.google_id = null; currentUser.oauth_provider = 'email'; }
                    renderGoogleBindStatus(currentUser);
                } else {
                    PageUtils.showAlert((res && res.message) || '解除綁定失敗', 'error');
                }
            } catch (e) {
                PageUtils.showAlert('解除綁定失敗，請稍後重試', 'error');
            }
        }
