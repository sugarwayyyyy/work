        let _pendingAppsCount = 0;
        let _pendingAppsClubs = []; // [{club_id, club_name, cnt}, ...]

        async function loadNotifications() {
            try {
                const [response, appRes] = await Promise.all([
                    APIClient.get('notifications.php'),
                    APIClient.get('club-admin.php?action=pending_app_count').catch(() => null)
                ]);
                _pendingAppsCount = (appRes?.data?.count) || 0;
                _pendingAppsClubs = (appRes?.data?.clubs) || [];
                if (response.success) {
                    displayNotifications(response.data.notifications);
                } else {
                    PageUtils.showAlert(response.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                PageUtils.showAlert('載入通知失敗', 'error');
            }
        }

        function goToClubApplications(clubIndex) {
            const club = _pendingAppsClubs[clubIndex];
            if (!club) return;
            sessionStorage.setItem('clubAdmin_clubId', String(club.club_id));
            sessionStorage.setItem('clubAdmin_clubName', club.club_name || '');
            window.location.href = 'club-admin-applications.html';
        }

        function syncBellDot(unreadCount) {
            const dot = document.getElementById('nav-bell-dot');
            if (!dot) return;
            if (unreadCount > 0) {
                dot.removeAttribute('hidden');
                delete dot.dataset.clearedByPage;
            } else {
                dot.setAttribute('hidden', '');
                dot.dataset.clearedByPage = '1';
            }
        }

        function displayNotifications(notifications) {
            const container = document.getElementById('notifications-list');
            const unreadCountEl = document.getElementById('notif-unread-count');

            const unreadCount = notifications.filter(n => !n.is_read).length;
            // 鈴鐺：有未讀通知 OR 幹部有待審核申請都要亮
            syncBellDot(unreadCount + (_pendingAppsCount > 0 ? 1 : 0));

            if (notifications.length === 0 && _pendingAppsCount === 0) {
                container.innerHTML = '<div class="feed-item-card" style="text-align:center;padding:2.5rem 0;color:var(--text-muted);">目前沒有通知</div>';
                if (unreadCountEl) unreadCountEl.textContent = '';
                const markAllBtn = document.getElementById('mark-all-read-btn');
                if (markAllBtn) { markAllBtn.style.display = 'none'; }
                return;
            }

            if (unreadCountEl) unreadCountEl.textContent = unreadCount > 0 ? `${unreadCount} 則未讀` : '';
            const markAllBtn = document.getElementById('mark-all-read-btn');
            if (markAllBtn) {
                markAllBtn.style.display = notifications.length > 0 ? '' : 'none';
                markAllBtn.disabled = unreadCount === 0;
                markAllBtn.textContent = '全部標為已讀';
            }

            let html = '';

            // 虛擬通知：每個有待審核申請的社團各顯示一張卡片（置頂，無刪除按鈕）
            // onclick 傳陣列索引避免字串引號衝突
            _pendingAppsClubs.forEach((club, idx) => {
                const safeDisplayName = PageUtils.escapeHtml(club.club_name || '');
                html += `
                <div class="feed-item-card">
                    <button class="feed-item-link feed-item-link--announcement"
                        onclick="goToClubApplications(${idx})">
                        <div class="feed-item-head">
                            <h3 class="feed-item-title">社團待審核申請</h3>
                            <span class="feed-item-badge">新</span>
                        </div>
                        <p class="feed-item-body">您管理的<strong>${safeDisplayName}</strong>有待審核的入社申請，請前往審核。</p>
                    </button>
                </div>`;
            });

            notifications.forEach(notification => {
                const notificationId = Number(notification.notification_id) || 0;
                const title = PageUtils.escapeHtml(notification.title || '通知');
                const message = PageUtils.escapeHtml(notification.message || '');
                const timeAgo = PageUtils.timeAgo(notification.created_at);
                const targetUrl = getNotificationTargetUrl(notification);
                const safeTargetUrl = PageUtils.escapeAttribute(targetUrl || '');
                const isUnread = !notification.is_read;
                const alreadyRead = notification.is_read ? 'true' : 'false';
                const isClickable = !!(targetUrl || isUnread);

                const clickAttr = targetUrl
                    ? ` onclick="handleNotificationClick(${notificationId}, '${safeTargetUrl}', ${alreadyRead})"`
                    : (isUnread ? ` onclick="handleNotificationClick(${notificationId}, '', false)"` : '');

                const deleteBtn = `<button class="notif-delete-btn" onclick="deleteNotification(event, ${notificationId})" title="刪除通知">✕</button>`;

                if (isClickable) {
                    html += `
                    <div class="feed-item-card notif-card-wrap">
                        <button class="feed-item-link feed-item-link--announcement"${clickAttr}>
                            <div class="feed-item-head">
                                <h3 class="feed-item-title"${isUnread ? '' : ' style="color:var(--text-muted);font-weight:400;"'}>${title}</h3>
                                ${isUnread ? '<span class="feed-item-badge">新</span>' : ''}
                            </div>
                            ${message ? `<p class="feed-item-body">${message}</p>` : ''}
                            <time class="feed-item-time">${timeAgo}</time>
                        </button>
                        ${deleteBtn}
                    </div>`;
                } else {
                    html += `
                    <div class="feed-item-card notif-card-wrap">
                        <div class="feed-item-link" style="cursor:default;">
                            <div class="feed-item-head">
                                <h3 class="feed-item-title" style="color:var(--text-muted);font-weight:400;">${title}</h3>
                            </div>
                            ${message ? `<p class="feed-item-body">${message}</p>` : ''}
                            <time class="feed-item-time">${timeAgo}</time>
                        </div>
                        ${deleteBtn}
                    </div>`;
                }
            });
            container.innerHTML = html;
        }

        function getNotificationTargetUrl(notification) {
            const notificationType = String(notification.notification_type || '').toLowerCase();
            const relatedType = String(notification.related_type || '').toLowerCase();
            const relatedId = Number(notification.related_id) || 0;

            // report notifications — handle both new (related_type='report') and old (title fallback)
            if (relatedType === 'report' || String(notification.title || '').includes('檢舉')) {
                return relatedId > 0
                    ? `admin-reports.html?report_id=${relatedId}`
                    : `admin-reports.html?tab=cases`;
            }

            // 場地申請通知
            if (String(notification.title || '').includes('場地申請')) {
                // 給行政管理端的「待審核」通知 → 活動申請審核頁
                if (String(notification.title).includes('待審核')) {
                    return 'admin-event-applications.html?status=pending';
                }
                // 給申請者的審核結果通知 → 幹部活動列表並標示該活動
                return relatedId > 0
                    ? `club-admin-events-list.html?highlight=${relatedId}`
                    : 'club-admin-events-list.html';
            }

            if (!relatedId) return '';
            if (relatedType === 'event') return `event-detail.html?id=${relatedId}`;
            if (notificationType === 'qa_reply') {
                const qaId = Number(notification.qa_id_from_reply) || 0;
                if (qaId > 0) return `qa-detail.html?id=${qaId}#reply-${relatedId}`;
            }
            if (relatedType === 'qa') return `qa-detail.html?id=${relatedId}`;
            return '';
        }

        async function markAsRead(notificationId) {
            try {
                await APIClient.post('notifications.php?action=mark_read', {
                    notification_id: notificationId
                });
            } catch (error) {
                console.error('Error:', error);
            }
        }

        async function handleNotificationClick(notificationId, targetUrl, alreadyRead) {
            if (!alreadyRead && notificationId > 0) {
                await markAsRead(notificationId);
                await loadNotifications();
            }
            if (targetUrl) {
                window.location.href = targetUrl;
            }
        }

        async function markAllAsRead() {
            const btn = document.getElementById('mark-all-read-btn');
            if (btn) { btn.disabled = true; btn.textContent = '處理中…'; }
            try {
                const response = await APIClient.post('notifications.php?action=mark_all_read', {});
                if (response.success) {
                    await loadNotifications(); // loadNotifications 內部會正確更新 syncBellDot
                } else {
                    PageUtils.showAlert(response.message || '操作失敗', 'error');
                    if (btn) { btn.disabled = false; btn.textContent = '全部標為已讀'; }
                }
            } catch (error) {
                console.error('Error:', error);
                PageUtils.showAlert('操作失敗', 'error');
                if (btn) { btn.disabled = false; btn.textContent = '全部標為已讀'; }
            }
        }

        async function deleteNotification(event, notificationId) {
            event.preventDefault();
            event.stopPropagation();
            if (!notificationId) return;
            try {
                const response = await APIClient.post('notifications.php?action=delete', {
                    notification_id: notificationId
                });
                if (response.success) {
                    await loadNotifications();
                } else {
                    PageUtils.showAlert(response.message || '刪除失敗', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                PageUtils.showAlert('刪除失敗', 'error');
            }
        }

        window.addEventListener('DOMContentLoaded', async function () {
            const user = StorageUtils.getUser();
            if (user && user.role === 'platform_admin') {
                const logoLink = document.querySelector('a.logo');
                if (logoLink) logoLink.href = 'admin-users.html';
            }
            if (window._pageInitReady) {
                await Promise.race([window._pageInitReady, new Promise(r => setTimeout(r, 3000))]);
            }
            loadNotifications();
        });
