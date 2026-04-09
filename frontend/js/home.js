        async function loadPinnedAnnouncements() {
            try {
                const response = await APIClient.get('admin.php?action=announcements');
                const container = document.getElementById('pinned-announcements');

                if (!response.success) {
                    container.innerHTML = '<p>公告載入失敗</p>';
                    return;
                }

                const announcements = (response.data.announcements || []).filter(a => Number(a.is_pinned) === 1);
                if (announcements.length === 0) {
                    container.innerHTML = '<p>目前沒有置頂公告</p>';
                    return;
                }

                container.innerHTML = '';
                announcements.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'announcement-card announcement-card-pinned';
                    card.innerHTML = `
                        <div class="announcement-head">
                            <span class="announcement-badge">置頂公告</span>
                            <span class="announcement-time">${PageUtils.formatDate(item.created_at)}</span>
                        </div>
                        <h3>${item.title || '公告'}</h3>
                        <p>${item.content || ''}</p>
                    `;
                    container.appendChild(card);
                });
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('pinned-announcements').innerHTML = '<p>公告載入失敗</p>';
            }
        }

        async function loadFeaturedClubs() {
            try {
                const response = await APIClient.get('clubs.php');
                if (response.success) {
                    const clubs = response.data.clubs.slice(0, 3);
                    const container = document.getElementById('featured-clubs');
                    container.innerHTML = '';

                    clubs.forEach(club => {
                        const tagHtml = club.tags.map(tag => `<span class="tag tag-primary">#${tag.tag_name}</span>`).join('');
                        const logoHtml = PageUtils.renderClubAvatar(club, 52);
                        const html = `
                            <div class="card">
                                <div class="card-header" style="display: flex; justify-content: space-between; align-items: start;">
                                    <div style="min-width: 0;">
                                        <h3 style="margin: 0 0 0.5rem 0;">${club.club_name || '-'}</h3>
                                        <span class="badge">${club.activity_badge === 'high_active' ? '高活躍' : '活躍中'}</span>
                                    </div>
                                    ${logoHtml}
                                </div>
                                <div style="margin-bottom: 1rem;">
                                    ${tagHtml}
                                </div>
                                <div class="card-body" style="margin-bottom: 1rem;">
                                    ${club.description || ''}
                                </div>
                                <div style="display: flex; gap: 1rem; font-size: 0.875rem; color: var(--text-light); margin-bottom: 1rem;">
                                    <span>👥 ${club.member_count} 成員</span>
                                    <span>⭐ ${(club.average_rating || 0).toFixed(1)}（${club.reviews_count || 0} 人評分）</span>
                                </div>
                                <a href="pages/club-detail.html?id=${club.club_id}" class="btn btn-primary btn-sm">查看詳情</a>
                            </div>
                        `;
                        container.innerHTML += html;
                    });
                } else {
                    document.getElementById('featured-clubs').innerHTML = '<p>載入失敗</p>';
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('featured-clubs').innerHTML = '<p>發生錯誤</p>';
            }
        }

        async function loadFeaturedEvents() {
            try {
                const response = await APIClient.get('events.php');
                if (response.success) {
                    const events = response.data.events.slice(0, 3);
                    const container = document.getElementById('featured-events');
                    container.innerHTML = '';

                    events.forEach(event => {
                        const eventDate = PageUtils.formatDate(event.event_date);
                        const html = `
                            <div class="card">
                                <div class="card-header">
                                    <h3 style="margin: 0 0 0.5rem 0;">${event.event_name || '未命名活動'}</h3>
                                    <span style="color: var(--text-light); font-size: 0.875rem;">${event.club_name || '-'}</span>
                                </div>
                                <div class="card-body" style="margin: 1rem 0;">
                                    ${event.description || ''}
                                </div>
                                <div style="display: flex; gap: 1rem; font-size: 0.875rem; color: var(--text-light); margin-bottom: 1rem;">
                                    <span>📅 ${eventDate}</span>
                                    <span>📍 ${event.location || '-'}</span>
                                    <span>👥 ${event.registered_count} 人報名</span>
                                </div>
                                <a href="pages/event-detail.html?id=${event.event_id}" class="btn btn-primary btn-sm">查看活動</a>
                            </div>
                        `;
                        container.innerHTML += html;
                    });
                } else {
                    document.getElementById('featured-events').innerHTML = '<p>載入失敗</p>';
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('featured-events').innerHTML = '<p>發生錯誤</p>';
            }
        }

        async function loadFollowedClubs() {
            const section = document.getElementById('followed-clubs-section');
            const container = document.getElementById('followed-clubs-container');
            const title = document.getElementById('followed-clubs-title');
            const subtitle = document.getElementById('followed-clubs-subtitle');
            const countBadge = document.getElementById('followed-clubs-count');

            if (!StorageUtils.isLoggedIn()) {
                if (section) section.style.display = 'block';
                if (title) title.textContent = '登入後可看追蹤社團';
                if (subtitle) subtitle.textContent = '登入後會顯示你追蹤的社團，方便快速切換。';
                if (countBadge) countBadge.textContent = '未登入';
                if (container) {
                    container.innerHTML = `
                        <div class="home-sidebar-empty">
                            <p>登入後即可把你追蹤的社團固定在左側。</p>
                            <a href="pages/login.html" class="btn btn-primary btn-sm">前往登入</a>
                        </div>
                    `;
                }
                return;
            }

            try {
                const response = await APIClient.get('clubs.php?action=my_follows');
                if (!response.success) {
                    if (section) section.style.display = 'block';
                    if (title) title.textContent = '我追蹤的社團';
                    if (subtitle) subtitle.textContent = '無法載入追蹤清單，請稍後再試。';
                    if (countBadge) countBadge.textContent = '載入失敗';
                    if (container) container.innerHTML = '<div class="home-sidebar-empty"><p>追蹤社團載入失敗。</p></div>';
                    return;
                }

                const clubs = response.data.clubs || [];
                if (section) section.style.display = 'block';
                if (title) title.textContent = '我追蹤的社團';
                if (subtitle) subtitle.textContent = '像訂閱頻道一樣，從左側快速進入你常看的社團。';
                if (countBadge) countBadge.textContent = `${clubs.length} 個社團`;

                if (clubs.length === 0) {
                    if (container) {
                        container.innerHTML = `
                            <div class="home-sidebar-empty">
                                <p>你目前尚未追蹤任何社團。</p>
                                <a href="pages/club-list.html" class="btn btn-secondary btn-sm">前往社團列表</a>
                            </div>
                        `;
                    }
                    return;
                }

                if (container) {
                    container.innerHTML = '';
                    clubs.forEach(club => {
                        const item = document.createElement('a');
                        item.className = 'home-sidebar-item';
                        item.href = `pages/club-detail.html?id=${club.club_id}`;
                        item.title = club.club_name || '社團';
                        item.innerHTML = `
                            ${PageUtils.renderClubAvatar(club, 44)}
                            <span class="home-sidebar-item__body">
                                <span class="home-sidebar-item__title">${club.club_name || '-'}</span>
                            </span>
                        `;
                        container.appendChild(item);
                    });
                }
            } catch (error) {
                console.error('Error loading followed clubs:', error);
                if (section) section.style.display = 'block';
                if (title) title.textContent = '我追蹤的社團';
                if (subtitle) subtitle.textContent = '載入時發生錯誤。';
                if (countBadge) countBadge.textContent = '載入失敗';
                if (container) container.innerHTML = '<div class="home-sidebar-empty"><p>追蹤社團載入失敗。</p></div>';
            }
        }

        // 頁面載入時加載數據
        window.addEventListener('DOMContentLoaded', function() {
            loadPinnedAnnouncements();
            loadFollowedClubs();
            loadFeaturedClubs();
            loadFeaturedEvents();
            loadClubCategories();
            setupSearchFilters();
        });

        // 加載社團分類
        async function loadClubCategories() {
            try {
                const response = await APIClient.get('clubs.php?action=categories');
                if (response.success) {
                    const select = document.getElementById('club-category');
                    response.data.categories.forEach(category => {
                        const option = document.createElement('option');
                        option.value = category.category_id;
                        option.textContent = category.category_name;
                        select.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        }

        // 設置搜尋過濾器
        function setupSearchFilters() {
            const searchType = document.getElementById('search-type');
            const clubsFilters = document.getElementById('clubs-filters');
            const eventsFilters = document.getElementById('events-filters');
            const qaFilters = document.getElementById('qa-filters');

            searchType.addEventListener('change', function() {
                clubsFilters.style.display = 'none';
                eventsFilters.style.display = 'none';
                qaFilters.style.display = 'none';

                if (this.value === 'clubs') {
                    clubsFilters.style.display = 'grid';
                } else if (this.value === 'events') {
                    eventsFilters.style.display = 'grid';
                } else if (this.value === 'qa') {
                    qaFilters.style.display = 'grid';
                }
            });

            // 搜尋表單提交
            document.getElementById('advanced-search-form').addEventListener('submit', function(e) {
                e.preventDefault();
                performAdvancedSearch();
            });

            // 清除搜尋
            document.getElementById('clear-search').addEventListener('click', function() {
                document.getElementById('advanced-search-form').reset();
                clubsFilters.style.display = 'grid';
                eventsFilters.style.display = 'none';
                qaFilters.style.display = 'none';
            });
        }

        // 執行高級搜尋
        async function performAdvancedSearch() {
            const searchType = document.getElementById('search-type').value;
            const keyword = document.getElementById('search-keyword').value.trim();

            let params = new URLSearchParams();
            params.append('search', keyword);

            if (searchType === 'clubs') {
                const category = document.getElementById('club-category').value;
                const feeRange = document.getElementById('club-fee-range').value;

                if (category) params.append('category_id', category);
                if (feeRange) {
                    if (feeRange === '0-500') {
                        params.append('max_fee', '500');
                    } else if (feeRange === '500-1000') {
                        params.append('min_fee', '500');
                        params.append('max_fee', '1000');
                    } else if (feeRange === '1000+') {
                        params.append('min_fee', '1000');
                    }
                }

                window.location.href = `pages/club-list.html?${params.toString()}`;

            } else if (searchType === 'events') {
                const dateFrom = document.getElementById('event-date-from').value;
                const dateTo = document.getElementById('event-date-to').value;
                const feeRange = document.getElementById('event-fee-range').value;

                if (dateFrom) params.append('date_from', dateFrom);
                if (dateTo) params.append('date_to', dateTo);
                if (feeRange) {
                    if (feeRange === 'free') {
                        params.append('max_fee', '0');
                    } else if (feeRange === '0-100') {
                        params.append('max_fee', '100');
                    } else if (feeRange === '100+') {
                        params.append('min_fee', '100');
                    }
                }

                window.location.href = `pages/events.html?${params.toString()}`;

            } else if (searchType === 'qa') {
                const status = document.getElementById('qa-status').value;
                if (status) params.append('status', status);

                window.location.href = `pages/qa.html?${params.toString()}`;
            }
        }
