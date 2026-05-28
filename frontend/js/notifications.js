        async function loadNotifications() {
            try {
                const response = await APIClient.get('notifications.php');
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

            if (notifications.length === 0) {
                container.innerHTML = '<div class="feed-item-card" style="text-align:center;padding:2.5rem 0;color:var(--text-muted);">目前沒有通知</div>';
                if (unreadCountEl) unreadCountEl.textContent = '';
                const markAllBtn = document.getElementById('mark-all-read-btn');
                if (markAllBtn) { markAllBtn.style.display = 'none'; }
                syncBellDot(0);
                return;
            }

            const unreadCount = notifications.filter(n => !n.is_read).length;
            syncBellDot(unreadCount);
            if (unreadCountEl) unreadCountEl.textContent = unreadCount > 0 ? `${unreadCount} 則未讀` : '';
            const markAllBtn = document.getElementById('mark-all-read-btn');
            if (markAllBtn) {
                markAllBtn.style.display = '';
                markAllBtn.disabled = unreadCount === 0;
                markAllBtn.textContent = '全部標為已讀';
            }

            let html = '';
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
                    syncBellDot(0);
                    await loadNotifications();
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
