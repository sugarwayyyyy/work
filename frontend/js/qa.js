        let qaTags = [];
        let selectedQATagIds = new Set();
        const qaStatusOptions = [
            { key: '', label: '全部' },
            { key: 'open', label: '開放中' },
            { key: 'closed', label: '已關閉' }
        ];

        function getQAUrlParams() {
            const params = new URLSearchParams(window.location.search);
            return {
                search: params.get('search') || '',
                club_id: params.get('club_id') || '',
                status: params.get('status') || ''
            };
        }

        async function loadQACategories() {
            try {
                const response = await APIClient.get('clubs.php?action=categories');
                if (!response.success) return;

                const HIDDEN_CATEGORY_NAMES = new Set(['綜合性', '宗教性']);
                const categories = (response.data.categories || []).filter(cat =>
                    !HIDDEN_CATEGORY_NAMES.has(String(cat.category_name || '').trim())
                );
                const select = document.getElementById('qa-category-filter');
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.category_id;
                    option.textContent = cat.category_name;
                    select.appendChild(option);
                });
            } catch (error) {
                console.error('Error:', error);
            }
        }

        async function loadQAClubsByCategory(categoryId) {
            const clubSelect = document.getElementById('qa-club-filter');
            clubSelect.innerHTML = '';

            if (!categoryId) {
                clubSelect.disabled = true;
                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = '請先選擇類別';
                clubSelect.appendChild(placeholder);
                return;
            }

            try {
                const response = await APIClient.get(`clubs.php?action=by_category&category_id=${encodeURIComponent(categoryId)}`);
                if (!response.success) return;

                const clubs = response.data.clubs || [];
                const allOption = document.createElement('option');
                allOption.value = '';
                allOption.textContent = '全部社團';
                clubSelect.appendChild(allOption);

                clubs.forEach(club => {
                    const option = document.createElement('option');
                    option.value = club.club_id;
                    option.textContent = club.club_name;
                    clubSelect.appendChild(option);
                });

                clubSelect.disabled = false;
            } catch (error) {
                console.error('Error:', error);
            }
        }

        function normalizeKeyword(text) {
            return String(text || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
        }

        function renderQATagSelector() {
            const container = document.getElementById('ask-tags');
            if (!container) return;

            if (!qaTags.length) {
                container.innerHTML = '<span style="color: var(--text-light); font-size: 0.9rem;">目前尚無可用標籤</span>';
                return;
            }

            container.innerHTML = qaTags.map(tag => {
                const isSelected = selectedQATagIds.has(Number(tag.qa_tag_id));
                const style = isSelected
                    ? 'background: var(--primary-color); color: white; border-color: var(--primary-color);'
                    : 'background: rgba(99, 102, 241, 0.08); color: var(--primary-color); border-color: rgba(99, 102, 241, 0.25);';
                return `<button type="button" class="tag" data-tag-id="${Number(tag.qa_tag_id) || 0}" style="margin: 0; border: 1px solid; cursor: pointer; ${style}">#${PageUtils.escapeHtml(tag.tag_name || '')}</button>`;
            }).join('');
        }

        function updateTagRecommendations() {
            const title = document.getElementById('ask-title').value || '';
            const content = document.getElementById('ask-content').value || '';
            const source = normalizeKeyword(`${title} ${content}`);
            const hint = document.getElementById('ask-tag-hint');

            selectedQATagIds = new Set();
            qaTags.forEach(tag => {
                const keyword = normalizeKeyword(tag.tag_name);
                if (keyword && source.includes(keyword)) {
                    selectedQATagIds.add(Number(tag.qa_tag_id));
                }
            });

            if (hint) {
                hint.textContent = selectedQATagIds.size > 0
                    ? `已抓到 ${selectedQATagIds.size} 個推薦標籤，可自行點擊增減。`
                    : '尚未抓到對應標籤，可手動點擊選擇。';
            }

            renderQATagSelector();
        }

        async function loadQATags() {
            try {
                const response = await APIClient.get('qa.php?action=tags');
                if (response.success) {
                    qaTags = response.data.tags || [];
                } else {
                    qaTags = [];
                }
            } catch (error) {
                console.error('Error:', error);
                qaTags = [];
            }

            renderQATagSelector();
        }

        async function loadQA() {
            document.getElementById('qa-container').innerHTML = '<div class="loading"><div class="spinner"></div><p>載入中...</p></div>';
            try {
                const search      = document.getElementById('qa-search').value.trim();
                const club_id     = document.getElementById('qa-club-filter').value;
                const category_id = document.getElementById('qa-category-filter').value;
                const status      = document.getElementById('qa-status-filter').value;
                let url = 'qa.php';
                const params = new URLSearchParams();
                if (search) params.append('search', search);
                if (club_id) {
                    params.append('club_id', club_id);
                } else if (category_id) {
                    params.append('category_id', category_id);
                }
                if (status) params.append('status', status);
                if ([...params.keys()].length > 0) {
                    url += `?${params.toString()}`;
                }

                const response = await APIClient.get(url);
                if (response.success) {
                    renderQA(response.data.questions);
                } else {
                    document.getElementById('qa-container').innerHTML = '<p>載入失敗</p>';
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('qa-container').innerHTML = '<p>發生錯誤</p>';
            }
        }

        function openQAAdvancedFilters() {
            const panel = document.getElementById('qa-advanced-filters');
            const btn = document.getElementById('qa-advanced-toggle-btn');
            if (!panel || !btn) return;
            panel.classList.add('is-open');
            panel.setAttribute('aria-hidden', 'false');
            btn.classList.add('is-active');
            btn.setAttribute('aria-expanded', 'true');
        }

        function closeQAAdvancedFilters() {
            const panel = document.getElementById('qa-advanced-filters');
            const btn = document.getElementById('qa-advanced-toggle-btn');
            if (!panel || !btn) return;
            panel.classList.remove('is-open');
            panel.setAttribute('aria-hidden', 'true');
            btn.classList.remove('is-active');
            btn.setAttribute('aria-expanded', 'false');
        }

        function hasQAAdvancedFilters() {
            const categoryId = document.getElementById('qa-category-filter').value;
            const clubId = document.getElementById('qa-club-filter').value;
            const status = document.getElementById('qa-status-filter').value;
            return Boolean(categoryId || clubId || status);
        }

        function resetQAFilters() {
            document.getElementById('qa-search').value = '';
            document.getElementById('qa-category-filter').value = '';
            const clubSelect = document.getElementById('qa-club-filter');
            clubSelect.disabled = true;
            clubSelect.innerHTML = '<option value="">請先選擇類別</option>';
            document.getElementById('qa-status-filter').value = '';
            renderQAStatusFilters();
            loadQA();
        }

        function renderQAStatusFilters() {
            const container = document.getElementById('qa-status-filters');
            const statusSelect = document.getElementById('qa-status-filter');
            if (!container || !statusSelect) return;

            const current = statusSelect.value || '';
            container.innerHTML = '';

            qaStatusOptions.forEach(option => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `badge badge-filter${current === option.key ? ' is-selected' : ''}`;
                button.textContent = option.label;
                button.addEventListener('click', () => {
                    if (statusSelect.value === option.key) return;
                    statusSelect.value = option.key;
                    renderQAStatusFilters();
                    loadQA();
                });
                container.appendChild(button);
            });
        }

        function renderQA(questions) {
            const container = document.getElementById('qa-container');
            container.innerHTML = '';

            if (questions.length === 0) {
                container.innerHTML = '<p style="text-align: center;">還沒有提問，成為第一個提問者吧！</p>';
                return;
            }

            questions.forEach(question => {
                const authorRaw = question.author_name || question.user_name || question.display_name || '匿名用戶';
                const author = PageUtils.escapeHtml(authorRaw);
                const qaUserId = Number(question.user_id || 0);
                const urgencyLabel = question.urgency_label || '一般';
                const safeQuestionTitle = PageUtils.escapeHtml(question.question_title || '未命名提問');
                const safeQuestionContent = PageUtils.escapeHtml(question.question_content || '');
                const safeUrgencyLabel = PageUtils.escapeHtml(urgencyLabel);
                const safeQaId = Number(question.qa_id) || 0;
                const safeClubName = PageUtils.escapeHtml(question.club_name || '未指定社團');
                const isSolved = question.status === 'closed' || Number(question.is_solved) === 1;
                const urgencyBadgeClass = question.urgency_level === 'urgent'
                    ? 'feed-item-badge--accent'
                    : (question.urgency_level === 'important' ? '' : 'feed-item-badge--neutral');

                const card = document.createElement('article');
                card.className = 'feed-item-card';
                // 注意：不在 innerHTML 內嵌 <a> 連結，避免 <a> 巢狀導致瀏覽器截斷外層連結
                card.innerHTML = `
                    <a href="qa-detail.html?id=${safeQaId}" class="feed-item-link">
                        <div class="feed-item-head">
                            <h3 class="feed-item-title">${safeQuestionTitle}</h3>
                            <span class="feed-item-badge ${isSolved ? 'feed-item-badge--neutral' : ''}">${isSolved ? '已解決' : '待解決'}</span>
                        </div>
                        <div class="feed-item-subtitle">${safeClubName} • ${author}<span class="qa-user-id-placeholder"></span> • ${PageUtils.timeAgo(question.created_at)}</div>
                        <p class="feed-item-body">${safeQuestionContent}</p>
                        <div class="feed-item-meta">
                            <span data-qa-views="${safeQaId}">👁️ ${question.views_count} 次瀏覽</span>
                            <span data-qa-replies="${safeQaId}">💬 ${question.replies_count} 個回覆</span>
                            ${question.urgency_level !== 'normal' ? `<span class="feed-item-badge ${urgencyBadgeClass}">${safeUrgencyLabel}</span>` : ''}
                        </div>
                    </a>
                `;
                // 用 DOM 插入私訊連結，避免 innerHTML 巢狀 <a> 問題
                if (qaUserId > 0) {
                    const placeholder = card.querySelector('.qa-user-id-placeholder');
                    if (placeholder) {
                        const idLink = document.createElement('a');
                        idLink.href = `messages.html?user_id=${qaUserId}&name=${encodeURIComponent(authorRaw)}`;
                        idLink.style.cssText = 'margin-left:4px;font-size:0.73rem;color:var(--text-muted,#6b7280);font-family:monospace;text-decoration:none;';
                        idLink.title = '傳送私訊';
                        idLink.textContent = `#${qaUserId}`;
                        idLink.addEventListener('click', e => e.stopPropagation());
                        placeholder.replaceWith(idLink);
                    }
                } else {
                    const placeholder = card.querySelector('.qa-user-id-placeholder');
                    if (placeholder) { placeholder.remove(); }
                }
                container.appendChild(card);
            });
        }

        async function loadCategoriesForModal() {
            try {
                const response = await APIClient.get('clubs.php?action=categories');
                if (response.success) {
                    const select = document.getElementById('ask-category');
                    select.innerHTML = '<option value="">-- 請先選擇類別 --</option>';
                    (response.data.categories || []).forEach(category => {
                        const option = document.createElement('option');
                        option.value = category.category_id;
                        option.textContent = category.category_name;
                        select.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }

        async function loadClubsByCategoryForModal(categoryId) {
            const clubSelect = document.getElementById('ask-club');
            clubSelect.innerHTML = '<option value="">載入中...</option>';
            clubSelect.disabled = true;

            if (!categoryId) {
                clubSelect.innerHTML = '<option value="">-- 請先選擇類別 --</option>';
                return;
            }

            try {
                const response = await APIClient.get(`clubs.php?action=by_category&category_id=${encodeURIComponent(categoryId)}`);
                if (!response.success) {
                    clubSelect.innerHTML = '<option value="">-- 載入失敗 --</option>';
                    return;
                }

                const clubs = response.data.clubs || [];
                if (clubs.length === 0) {
                    clubSelect.innerHTML = '<option value="">-- 此類別尚無可選社團 --</option>';
                    return;
                }

                clubSelect.innerHTML = '<option value="">-- 請選擇社團 --</option>';
                clubs.forEach(club => {
                    const option = document.createElement('option');
                    option.value = club.club_id;
                    option.textContent = `${club.club_name || '-'}${club.club_code ? `（${club.club_code}）` : ''}`;
                    clubSelect.appendChild(option);
                });
                clubSelect.disabled = false;
            } catch (error) {
                console.error('Error:', error);
                clubSelect.innerHTML = '<option value="">-- 載入失敗 --</option>';
            }
        }

        function setUrgencyLevel(level) {
            document.getElementById('ask-urgency').value = level;
            document.querySelectorAll('.urgency-btn').forEach(button => {
                const active = button.dataset.urgency === level;
                button.classList.toggle('btn-primary', active);
                button.classList.toggle('btn-secondary', !active);
                button.classList.toggle('is-active', active);
            });
        }

        function openAskModal() {
            ensureCanAsk().then(canAsk => {
                if (!canAsk) {
                    PageUtils.showAlert('請先登入', 'warning');
                    window.location.href = 'login.html';
                    return;
                }
                document.getElementById('ask-modal').style.display = 'flex';
            });
        }

        async function ensureCanAsk() {
            if (StorageUtils.isLoggedIn()) return true;
            try {
                const response = await APIClient.get('auth.php?action=current');
                if (response.success && response.data) {
                    StorageUtils.setUser({
                        user_id: response.data.user_id,
                        name: response.data.name,
                        email: response.data.email,
                        role: response.data.role,
                        student_id: response.data.student_id || null,
                        avatar_path: response.data.avatar_path || null
                    });
                    return true;
                }
            } catch (error) {
            }
            return false;
        }

        function closeAskModal() {
            document.getElementById('ask-modal').style.display = 'none';
            setUrgencyLevel('normal');
            selectedQATagIds = new Set();
            const hint = document.getElementById('ask-tag-hint');
            if (hint) {
                hint.textContent = '輸入標題或內容後，系統會自動抓字推薦標籤。';
            }
            renderQATagSelector();
        }

        document.getElementById('ask-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const club_id = document.getElementById('ask-club').value;
            const question_title = document.getElementById('ask-title').value;
            const question_content = document.getElementById('ask-content').value;
            const urgency_level = document.getElementById('ask-urgency').value;
            const is_anonymous = document.getElementById('ask-anonymous').checked;
            const tag_ids = Array.from(selectedQATagIds);

            try {
                const response = await APIClient.post('qa.php?action=create', {
                    club_id,
                    question_title,
                    question_content,
                    urgency_level,
                    is_anonymous,
                    tag_ids
                });

                if (response.success) {
                    PageUtils.showAlert('提問發布成功', 'success');
                    closeAskModal();
                    document.getElementById('ask-form').reset();
                    loadQA();
                } else {
                    PageUtils.showAlert(response.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                PageUtils.showAlert('發布失敗', 'error');
            }
        });

        // bfcache 還原時把 qa-detail 記下的瀏覽數 / 回覆數同步到列表 DOM
        window.addEventListener('pageshow', function () {
            try {
                const vUpd = JSON.parse(sessionStorage.getItem('qa-views-updates') || '{}');
                Object.entries(vUpd).forEach(([id, count]) => {
                    const el = document.querySelector(`[data-qa-views="${id}"]`);
                    if (el) el.textContent = `👁️ ${count} 次瀏覽`;
                });
                const rUpd = JSON.parse(sessionStorage.getItem('qa-replies-updates') || '{}');
                Object.entries(rUpd).forEach(([id, count]) => {
                    const el = document.querySelector(`[data-qa-replies="${id}"]`);
                    if (el) el.textContent = `💬 ${count} 個回覆`;
                });
            } catch (_) {}
        });

        window.addEventListener('DOMContentLoaded', async function() {
            const params = getQAUrlParams();
            document.getElementById('qa-search').value = params.search;
            document.getElementById('qa-status-filter').value = params.status;

            await loadQACategories();
            renderQAStatusFilters();
            loadQA();
            loadCategoriesForModal();
            loadQATags();

            const advancedToggleBtn = document.getElementById('qa-advanced-toggle-btn');
            if (advancedToggleBtn) {
                advancedToggleBtn.addEventListener('click', () => {
                    const panel = document.getElementById('qa-advanced-filters');
                    if (!panel) return;
                    if (panel.classList.contains('is-open')) {
                        closeQAAdvancedFilters();
                    } else {
                        openQAAdvancedFilters();
                    }
                });
            }

            if (hasQAAdvancedFilters()) {
                openQAAdvancedFilters();
            } else {
                closeQAAdvancedFilters();
            }

            document.getElementById('ask-category').addEventListener('change', event => {
                loadClubsByCategoryForModal(event.target.value);
            });

            document.getElementById('ask-title').addEventListener('input', updateTagRecommendations);
            document.getElementById('ask-content').addEventListener('input', updateTagRecommendations);

            document.getElementById('ask-tags').addEventListener('click', event => {
                const button = event.target.closest('[data-tag-id]');
                if (!button) return;
                const tagId = Number(button.dataset.tagId);
                if (selectedQATagIds.has(tagId)) {
                    selectedQATagIds.delete(tagId);
                } else {
                    selectedQATagIds.add(tagId);
                }

                const hint = document.getElementById('ask-tag-hint');
                if (hint) {
                    hint.textContent = selectedQATagIds.size > 0
                        ? `目前已選 ${selectedQATagIds.size} 個標籤。`
                        : '尚未選擇標籤。';
                }

                renderQATagSelector();
            });

            document.querySelectorAll('.urgency-btn').forEach(button => {
                button.addEventListener('click', () => setUrgencyLevel(button.dataset.urgency));
            });
            setUrgencyLevel('normal');

            document.getElementById('qa-search-btn').addEventListener('click', () => {
                loadQA();
            });

            document.getElementById('qa-reset-btn').addEventListener('click', () => {
                resetQAFilters();
            });

            document.getElementById('qa-search').addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    loadQA();
                }
            });

            document.getElementById('qa-status-filter').addEventListener('change', () => {
                renderQAStatusFilters();
                loadQA();
            });

            document.getElementById('qa-category-filter').addEventListener('change', async (e) => {
                await loadQAClubsByCategory(e.target.value);
                loadQA();
            });

            document.getElementById('qa-club-filter').addEventListener('change', () => {
                loadQA();
            });
        });
