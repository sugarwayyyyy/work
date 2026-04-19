        let currentClubId = null;
        let currentEventId = null;
        let currentClubName = '';
        let currentClubLastUpdated = null;
        
        // 標籤管理全局變量
        let selectedTagIds = new Set();
        let allTags = [];
        let suggestedTagIds = new Set();
        
        // 活動標籤管理
        let eventSelectedTagIds = new Set();
        let createEventSelectedTagIds = new Set();

        function getUploadApiUrl(action) {
            const base = (typeof API_URL === 'string' && API_URL)
                ? API_URL
                : '/社團活動資訊統整平台/backend/api';
            return `${base}/upload.php?action=${encodeURIComponent(action)}`;
        }

        function setFieldError(inputId, message) {
            const input = document.getElementById(inputId);
            const err = document.getElementById(`err-${inputId}`);
            if (!input || !err) return;
            input.classList.toggle('input-error', !!message);
            err.textContent = message || '';
        }

        function formatDateTime(value) {
            if (!value) return '-';
            if (window.PageUtils && typeof PageUtils.formatDate === 'function') return PageUtils.formatDate(value);
            return new Intl.DateTimeFormat('zh-TW', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
            }).format(new Date(value));
        }

        function hideManagementPanels() {
            document.getElementById('club-management-section').style.display = 'none';
            document.getElementById('create-event-section').style.display = 'none';
            document.getElementById('transfer-request-section').style.display = 'none';
            document.getElementById('club-events-section').style.display = 'none';
        }

        function showManagementPanel(panel) {
            hideManagementPanels();
            if (panel === 'club') {
                document.getElementById('club-management-section').style.display = 'block';
            } else if (panel === 'event') {
                document.getElementById('create-event-section').style.display = 'block';
            } else if (panel === 'transfer') {
                document.getElementById('transfer-request-section').style.display = 'block';
            } else if (panel === 'events') {
                document.getElementById('club-events-section').style.display = 'block';
            }
        }

        function setDefaultCreateEventDate() {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(14, 0, 0, 0);
            const pad = (value) => String(value).padStart(2, '0');
            const defaultValue = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
            setDateTimeParts('event-date', defaultValue);
            syncDateTimeFromParts('event-date', true);
        }

        function toDatetimeLocal(value) {
            if (!value) return '';
            return value.includes('T') ? value.slice(0, 16) : value.replace(' ', 'T').slice(0, 16);
        }

        function syncClubMeetingTimeValue() {
            const target = document.getElementById('update-club-meeting-time');
            const day = document.getElementById('update-club-meeting-day')?.value || '';
            const sh = document.getElementById('update-club-meeting-start-hour')?.value || '00';
            const sm = document.getElementById('update-club-meeting-start-minute')?.value || '00';
            const eh = document.getElementById('update-club-meeting-end-hour')?.value || '00';
            const em = document.getElementById('update-club-meeting-end-minute')?.value || '00';
            if (!target) return '';

            target.value = `${day} ${sh}:${sm}-${eh}:${em}`;
            return target.value;
        }

        function setClubMeetingTimeFromValue(value) {
            const raw = String(value || '').trim();
            const fallback = {
                day: '每週三',
                sh: '19',
                sm: '00',
                eh: '21',
                em: '00'
            };

            const matched = raw.match(/(每週[一二三四五六日])\s*(\d{1,2}):(\d{2})\s*[-~～]\s*(\d{1,2}):(\d{2})/);
            const next = matched
                ? {
                    day: matched[1],
                    sh: String(Math.max(0, Math.min(23, parseInt(matched[2], 10)))).padStart(2, '0'),
                    sm: matched[3] === '30' ? '30' : '00',
                    eh: String(Math.max(0, Math.min(23, parseInt(matched[4], 10)))).padStart(2, '0'),
                    em: matched[5] === '30' ? '30' : '00'
                }
                : fallback;

            document.getElementById('update-club-meeting-day').value = next.day;
            document.getElementById('update-club-meeting-start-hour').value = next.sh;
            document.getElementById('update-club-meeting-start-minute').value = next.sm;
            document.getElementById('update-club-meeting-end-hour').value = next.eh;
            document.getElementById('update-club-meeting-end-minute').value = next.em;

            syncClubMeetingTimeValue();
        }

        function initHourSelect(selectId) {
            const select = document.getElementById(selectId);
            if (!select || select.options.length > 0) return;

            for (let i = 0; i < 24; i++) {
                const option = document.createElement('option');
                option.value = String(i).padStart(2, '0');
                option.textContent = `${String(i).padStart(2, '0')} 時`;
                select.appendChild(option);
            }
        }

        function setDateTimeParts(baseId, value) {
            const raw = toDatetimeLocal(value);
            const dateInput = document.getElementById(`${baseId}-date`);
            const hourSelect = document.getElementById(`${baseId}-hour`);
            const minuteSelect = document.getElementById(`${baseId}-minute`);
            if (!dateInput || !hourSelect || !minuteSelect) return;

            if (!raw) {
                dateInput.value = '';
                hourSelect.value = '00';
                minuteSelect.value = '00';
                return;
            }

            const [datePart, timePart = '00:00'] = raw.split('T');
            const [hour = '00', minute = '00'] = timePart.split(':');
            dateInput.value = datePart;
            hourSelect.value = hour;
            minuteSelect.value = minute === '30' ? '30' : '00';
        }

        function syncDateTimeFromParts(baseId, required = false) {
            const hiddenInput = document.getElementById(baseId);
            const dateInput = document.getElementById(`${baseId}-date`);
            const hourSelect = document.getElementById(`${baseId}-hour`);
            const minuteSelect = document.getElementById(`${baseId}-minute`);
            if (!hiddenInput || !dateInput || !hourSelect || !minuteSelect) return true;

            const datePart = dateInput.value.trim();
            if (!datePart) {
                hiddenInput.value = '';
                if (required) {
                    setFieldError(baseId, '此為必填欄位');
                    return false;
                }
                setFieldError(baseId, '');
                return true;
            }

            hiddenInput.value = `${datePart}T${hourSelect.value}:${minuteSelect.value}`;
            return true;
        }

        function isHalfHourAligned(value) {
            if (!value) return false;
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return false;
            return date.getMinutes() % 30 === 0 && date.getSeconds() === 0;
        }

        function validateHalfHourField(inputId, message) {
            const value = document.getElementById(inputId).value.trim();
            if (!value) {
                setFieldError(inputId, '此為必填欄位');
                return false;
            }

            if (!isHalfHourAligned(value)) {
                setFieldError(inputId, message || '請選擇整點或半點時間');
                return false;
            }

            setFieldError(inputId, '');
            return true;
        }

        // ========== 標籤管理函數 ==========
        const TAG_KEYWORDS = {
            date: ['每週', '週一', '週二', '週三', '週四', '週五', '週六', '週日', '星期', '平日', '假日', '本週', '下週', '日期'],
            time: ['早上', '上午', '中午', '下午', '晚上', '凌晨', '時間', '時段', '點', ':'],
            experience: ['新手', '初心者', '初學', '新人', '無經驗', '經驗', '高手', '進階', '基礎'],
            fee: ['社費', '免費', '年費', '月費', '費用', '收費', '元', '塊錢', '不用錢', '無需', '需付費']
        };

        function getTagTypeKeywords(tagType) {
            // 目前後端 tag_type 仍使用 time，這裡將日期與時間關鍵字合併比對。
            if (tagType === 'time') {
                return Array.from(new Set([...(TAG_KEYWORDS.date || []), ...(TAG_KEYWORDS.time || [])]));
            }
            return TAG_KEYWORDS[tagType] || [];
        }

        function detectTagsFromDescription() {
            const description = document.getElementById('update-club-description').value.trim().toLowerCase();
            suggestedTagIds.clear();
            const suggestionContainer = document.getElementById('suggested-tags');
            suggestionContainer.innerHTML = '';
            
            // 根據標籤類型和關鍵字進行匹配
            allTags.forEach(tag => {
                const tagTypeKeywords = getTagTypeKeywords(tag.tag_type);
                const hasMatch = tagTypeKeywords.some(keyword => 
                    description.includes(keyword.toLowerCase())
                );
                if (hasMatch) {
                    suggestedTagIds.add(tag.tag_id);
                }
            });

            // 渲染推薦標籤（但不自動選中）
            suggestedTagIds.forEach(tagId => {
                const tag = allTags.find(t => t.tag_id === tagId);
                if (tag) {
                    const badge = createTagBadge(tag, 'suggested');
                    suggestionContainer.appendChild(badge);
                }
            });
            
            if (suggestedTagIds.size === 0) {
                suggestionContainer.innerHTML = '<span style="color: #999; font-size: 0.9rem;">掃描後無推薦標籤</span>';
            }
        }

        function createTagBadge(tag, mode = 'selected') {
            const span = document.createElement('span');
            span.style.cssText = `
                padding: 0.3rem 0.8rem;
                border-radius: 20px;
                font-size: 0.85rem;
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
                cursor: pointer;
                border: 1px solid #ddd;
                background: white;
                transition: all 0.2s;
            `;
            span.setAttribute('role', 'button');
            span.tabIndex = 0;

            const handleToggle = () => toggleTag(tag.tag_id, tag.tag_name);
            span.addEventListener('click', handleToggle);
            span.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleToggle();
                }
            });

            if (mode === 'suggested') {
                span.style.background = '#e7f5ff';
                span.style.borderColor = '#74c0fc';
                span.style.color = '#1971c2';
                span.innerHTML = `
                    <span>${tag.tag_name}</span>
                    <span style="font-size: 1.1rem; color: #1971c2; pointer-events: none;">+</span>
                `;
            } else if (mode === 'selected') {
                span.style.background = '#d3f9d8';
                span.style.borderColor = '#51cf66';
                span.style.color = '#2f8f2f';
                span.innerHTML = `
                    <span>${tag.tag_name}</span>
                    <span style="font-size: 1.1rem; color: #2f8f2f; pointer-events: none;">✕</span>
                `;
            } else if (mode === 'search') {
                span.style.background = '#fff3bf';
                span.style.borderColor = '#ffd43b';
                span.style.color = '#994d00';
                span.innerHTML = `
                    <span>${tag.tag_name}</span>
                    <span style="font-size: 1.1rem; color: #994d00; pointer-events: none;">+</span>
                `;
            }
            return span;
        }

        function toggleTag(tagId, tagName) {
            if (selectedTagIds.has(tagId)) {
                selectedTagIds.delete(tagId);
            } else {
                selectedTagIds.add(tagId);
            }
            renderSelectedTags();
            clearTagSearch();
        }

        function renderSelectedTags() {
            const container = document.getElementById('selected-tags');
            container.innerHTML = '';
            
            if (selectedTagIds.size === 0) {
                container.innerHTML = '<span style="color: #999; font-size: 0.9rem;">未選擇任何標籤</span>';
                return;
            }

            selectedTagIds.forEach(tagId => {
                const tag = allTags.find(t => t.tag_id === tagId);
                if (tag) {
                    const badge = createTagBadge(tag, 'selected');
                    container.appendChild(badge);
                }
            });
        }

        function clearTagSearch() {
            document.getElementById('tag-search-input').value = '';
            document.getElementById('tag-search-results').innerHTML = '';
        }

        async function loadAllTags() {
            try {
                const response = await APIClient.get('clubs.php?action=get_all_tags');
                if (response.success) {
                    allTags = response.data || [];
                } else {
                    console.error('載入標籤失敗:', response.message);
                }
            } catch (error) {
                console.error('載入標籤時發生錯誤:', error);
            }
        }

        async function searchOrCreateTag() {
            const input = document.getElementById('tag-search-input').value.trim();
            if (!input) {
                PageUtils.showAlert('請輸入標籤名稱', 'error');
                return;
            }

            const resultsContainer = document.getElementById('tag-search-results');
            resultsContainer.innerHTML = '<div class="loading"><p>搜尋中...</p></div>';

            try {
                // 先從現有標籤中搜尋
                const matchingTags = allTags.filter(t => 
                    t.tag_name.toLowerCase().includes(input.toLowerCase())
                );

                resultsContainer.innerHTML = '';

                if (matchingTags.length > 0) {
                    matchingTags.forEach(tag => {
                        const badge = createTagBadge(tag, 'search');
                        resultsContainer.appendChild(badge);
                    });
                } else {
                    // 沒有找到，提示建立新標籤
                    const createBtn = document.createElement('button');
                    createBtn.type = 'button';
                    createBtn.textContent = `✚ 建立新標籤「${input}」`;
                    createBtn.className = 'btn btn-primary btn-sm';
                    createBtn.style.marginTop = '0.5rem';
                    createBtn.onclick = async () => {
                        await createNewTag(input);
                    };
                    resultsContainer.appendChild(createBtn);
                }
            } catch (error) {
                console.error('搜尋標籤失敗:', error);
                PageUtils.showAlert('搜尋標籤失敗', 'error');
            }
        }

        async function createNewTag(tagName) {
            try {
                const response = await APIClient.post('clubs.php?action=create_tag', {
                    tag_name: tagName,
                    tag_type: 'other',
                    description: ''
                });

                if (response.success) {
                    const newTag = response.data;
                    allTags.push(newTag);
                    toggleTag(newTag.tag_id, newTag.tag_name);
                    PageUtils.showAlert('標籤已建立並選中', 'success');
                } else {
                    PageUtils.showAlert('建立標籤失敗：' + response.message, 'error');
                }
            } catch (error) {
                console.error('建立標籤失敗:', error);
                PageUtils.showAlert('建立標籤失敗', 'error');
            }
        }

        async function saveClubTags(clubId) {
            try {
                const response = await APIClient.post('clubs.php?action=update_tags', {
                    club_id: clubId,
                    tag_ids: Array.from(selectedTagIds)
                });

                if (!response.success) {
                    console.error('保存標籤失敗:', response.message);
                }
            } catch (error) {
                console.error('保存標籤時發生錯誤:', error);
            }
        }

        // ========== 活動標籤管理函數 ==========
        function toggleEventTag(tagId, tagName, mode = 'create') {
            const selectedSet = mode === 'create' ? createEventSelectedTagIds : eventSelectedTagIds;
            
            if (selectedSet.has(tagId)) {
                selectedSet.delete(tagId);
            } else {
                selectedSet.add(tagId);
            }
            
            renderEventSelectedTags(mode);
            if (mode === 'create') {
                document.getElementById('create-event-tag-search').value = '';
                document.getElementById('create-event-tag-results').innerHTML = '';
                detectEventTagsFromDescription();
            } else {
                document.getElementById('update-event-tag-search').value = '';
                document.getElementById('update-event-tag-results').innerHTML = '';
            }
        }

        function createEventTagBadge(tag, mode = 'selected', formMode = 'create') {
            const span = document.createElement('span');
            span.style.cssText = `
                padding: 0.3rem 0.8rem;
                border-radius: 20px;
                font-size: 0.85rem;
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
                cursor: pointer;
                border: 1px solid #ddd;
                background: white;
                transition: all 0.2s;
            `;
            span.setAttribute('role', 'button');
            span.tabIndex = 0;

            const handleToggle = () => toggleEventTag(tag.tag_id, tag.tag_name, formMode);
            const safeTagName = PageUtils.escapeHtml(tag.tag_name || '');
            span.addEventListener('click', handleToggle);
            span.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleToggle();
                }
            });

            if (mode === 'selected') {
                span.style.background = '#d3f9d8';
                span.style.borderColor = '#51cf66';
                span.style.color = '#2f8f2f';
                span.innerHTML = `<span>${safeTagName}</span><span style="font-size: 1.1rem; color: #2f8f2f; pointer-events: none;">✕</span>`;
            } else if (mode === 'suggested') {
                span.style.background = '#e7f5ff';
                span.style.borderColor = '#74c0fc';
                span.style.color = '#1971c2';
                span.innerHTML = `<span>${safeTagName}</span><span style="font-size: 1.1rem; color: #1971c2; pointer-events: none;">+</span>`;
            } else if (mode === 'search') {
                span.style.background = '#fff3bf';
                span.style.borderColor = '#ffd43b';
                span.style.color = '#994d00';
                span.innerHTML = `<span>${safeTagName}</span><span style="font-size: 1.1rem; color: #994d00; pointer-events: none;">+</span>`;
            }
            return span;
        }

        function detectEventTagsFromDescription() {
            const textarea = document.getElementById('event-description');
            const container = document.getElementById('create-event-suggested-tags');
            if (!textarea || !container) return;

            const description = textarea.value.trim().toLowerCase();
            container.innerHTML = '';

            if (!description) {
                container.innerHTML = '<span style="color: #999; font-size: 0.9rem;">輸入活動內容後會自動推薦</span>';
                return;
            }

            const suggestions = [];
            allTags.forEach(tag => {
                const tagTypeKeywords = getTagTypeKeywords(tag.tag_type);
                const hasMatch = tagTypeKeywords.some(keyword => description.includes(keyword.toLowerCase()));
                if (hasMatch && !createEventSelectedTagIds.has(tag.tag_id)) {
                    suggestions.push(tag);
                }
            });

            if (suggestions.length === 0) {
                container.innerHTML = '<span style="color: #999; font-size: 0.9rem;">掃描後無推薦標籤</span>';
                return;
            }

            suggestions.forEach(tag => {
                const badge = createEventTagBadge(tag, 'suggested', 'create');
                container.appendChild(badge);
            });
        }

        function renderEventSelectedTags(mode = 'create') {
            const selectedSet = mode === 'create' ? createEventSelectedTagIds : eventSelectedTagIds;
            const container = document.getElementById(`${mode}-event-selected-tags`);
            container.innerHTML = '';
            
            if (selectedSet.size === 0) {
                container.innerHTML = '<span style="color: #999; font-size: 0.9rem;">未選擇任何標籤</span>';
                return;
            }

            selectedSet.forEach(tagId => {
                const tag = allTags.find(t => t.tag_id === tagId);
                if (tag) {
                    const badge = createEventTagBadge(tag, 'selected', mode);
                    container.appendChild(badge);
                }
            });
        }

        async function searchEventTags(mode = 'create') {
            const input = document.getElementById(`${mode}-event-tag-search`).value.trim();
            if (!input) {
                PageUtils.showAlert('請輸入標籤名稱', 'error');
                return;
            }

            const resultsContainer = document.getElementById(`${mode}-event-tag-results`);
            resultsContainer.innerHTML = '<div class="loading"><p>搜尋中...</p></div>';

            try {
                const matchingTags = allTags.filter(t => 
                    t.tag_name.toLowerCase().includes(input.toLowerCase())
                );

                resultsContainer.innerHTML = '';

                if (matchingTags.length > 0) {
                    matchingTags.forEach(tag => {
                        const badge = createEventTagBadge(tag, 'search', mode);
                        resultsContainer.appendChild(badge);
                    });
                } else {
                    const createBtn = document.createElement('button');
                    createBtn.type = 'button';
                    createBtn.textContent = `✚ 建立新標籤「${input}」`;
                    createBtn.className = 'btn btn-primary btn-sm';
                    createBtn.style.marginTop = '0.5rem';
                    createBtn.onclick = async () => {
                        await createNewEventTag(input, mode);
                    };
                    resultsContainer.appendChild(createBtn);
                }
            } catch (error) {
                console.error('搜尋標籤失敗:', error);
                PageUtils.showAlert('搜尋標籤失敗', 'error');
            }
        }

        async function createNewEventTag(tagName, mode) {
            try {
                const response = await APIClient.post('clubs.php?action=create_tag', {
                    tag_name: tagName,
                    tag_type: 'other',
                    description: ''
                });

                if (response.success) {
                    const newTag = response.data;
                    allTags.push(newTag);
                    toggleEventTag(newTag.tag_id, newTag.tag_name, mode);
                    PageUtils.showAlert('標籤已建立並選中', 'success');
                } else {
                    PageUtils.showAlert('建立標籤失敗：' + response.message, 'error');
                }
            } catch (error) {
                console.error('建立標籤失敗:', error);
                PageUtils.showAlert('建立標籤失敗', 'error');
            }
        }

        function validateClubForm() {
            let ok = true;
            syncClubMeetingTimeValue();

            ['update-club-name', 'update-club-description', 'update-club-meeting-time', 'update-club-email', 'update-club-location'].forEach(id => {
                const value = document.getElementById(id).value.trim();
                if (!value) {
                    setFieldError(id, '此為必填欄位');
                    ok = false;
                } else {
                    setFieldError(id, '');
                }
            });
            return ok;
        }

        async function loadUnreadNotificationDot() {
            const dot = document.getElementById('club-admin-unread-dot');
            if (!dot || !StorageUtils.isLoggedIn()) return;

            try {
                const response = await APIClient.get('notifications.php');
                if (!response.success) return;
                const notifications = response?.data?.notifications || [];
                const unread = notifications.filter(item => Number(item.is_read || 0) === 0).length;
                if (unread > 0) {
                    dot.style.display = 'inline-block';
                    dot.textContent = unread > 99 ? '99+' : String(unread);
                } else {
                    dot.style.display = 'none';
                }
            } catch (error) {
                console.error('載入通知失敗:', error);
            }
        }

        function validateEventForm(prefix = '') {
            let ok = true;
            syncDateTimeFromParts(`${prefix}event-date`, true);
            syncDateTimeFromParts(`${prefix}event-deadline`, false);

            const required = [`${prefix}event-name`, `${prefix}event-description`, `${prefix}event-date`, `${prefix}event-location`];
            required.forEach(id => {
                const value = document.getElementById(id).value.trim();
                if (!value) {
                    setFieldError(id, '此為必填欄位');
                    ok = false;
                } else {
                    setFieldError(id, '');
                }
            });

            const dateFieldId = `${prefix}event-date`;
            const deadlineFieldId = `${prefix}event-deadline`;
            if (!validateHalfHourField(dateFieldId, '舉辦時間只能選整點或半點')) {
                ok = false;
            }

            const deadlineField = document.getElementById(deadlineFieldId);
            if (deadlineField && deadlineField.value.trim()) {
                if (!isHalfHourAligned(deadlineField.value.trim())) {
                    setFieldError(deadlineFieldId, '報名截止只能選整點或半點');
                    ok = false;
                } else {
                    setFieldError(deadlineFieldId, '');
                }
            }
            return ok;
        }

        function refreshClubPreview() {
            const name = document.getElementById('update-club-name').value.trim() || '未填寫';
            const desc = document.getElementById('update-club-description').value.trim() || '未填寫';
            const time = document.getElementById('update-club-meeting-time').value.trim() || '未填寫';
            const rawLoc = document.getElementById('update-club-location').value.trim();
            const loc = rawLoc
                ? (/^(https?:)?\/\//i.test(rawLoc) || rawLoc.startsWith('www.')
                    ? 'Google 地圖連結'
                    : rawLoc)
                : '未填寫';
            const mail = document.getElementById('update-club-email').value.trim() || '未填寫';
            document.getElementById('club-preview-text').textContent = `社團：${name}｜社課時間：${time}｜地點：${loc}｜信箱：${mail}｜介紹：${desc.slice(0, 40)}${desc.length > 40 ? '...' : ''}`;
        }

        function translateStatus(status) {
            const statusMap = {
                'active': '進行中',
                'published': '已發布',
                'ongoing': '進行中',
                'draft': '草稿',
                'completed': '已結束',
                'archived': '已歸檔',
                'inactive': '停止中'
            };
            return statusMap[status] || status || '-';
        }

        function renderEmptyState(container, title, description) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-illustration"></div>
                    <h4>${title}</h4>
                    <p>${description}</p>
                </div>
            `;
        }

        function transferStatusLabel(status) {
            const map = {
                pending: '待審核',
                approved: '已核准',
                rejected: '已退回',
                cancelled: '已取消'
            };
            return map[status] || status || '-';
        }

        async function loadMyTransferRequests() {
            const response = await APIClient.get('club-admin.php?action=my_transfer_requests');
            if (!response.success) return console.error(response.message);
            const container = document.getElementById('my-transfer-requests');
            if (!container) return;
            container.innerHTML = '';
            const rows = response.data.requests || [];
            if (rows.length === 0) {
                renderEmptyState(container, '尚未送出轉讓申請', '送出後，行政端審核進度會顯示在這裡。');
                return;
            }
            rows.forEach(item => {
                const card = document.createElement('div');
                card.className = 'admin-item-card';
                card.innerHTML = `
                    <div class="admin-item-head">
                        <h4>${item.club_name || '-'}（${item.club_code || '-'}）</h4>
                        <span class="status-chip">${transferStatusLabel(item.request_status)}</span>
                    </div>
                    <p class="admin-item-content">目標對象：${item.target_user_name || '-'}（ID:${item.target_user_id} / 學號:${item.target_student_id || '-' }）</p>
                    <p class="admin-item-content">原因：${item.reason || '-'}</p>
                    ${item.review_note ? `<p class="admin-item-content">審核意見：${item.review_note}</p>` : ''}
                    <div class="admin-item-footer">
                        <span class="admin-item-time">送出時間：${formatDateTime(item.requested_at)}</span>
                        <span class="admin-item-time">審核時間：${formatDateTime(item.reviewed_at)}</span>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        async function loadMyClubs() {
            const response = await APIClient.get('club-admin.php?action=my_clubs');
            if (!response.success) return console.error(response.message);
            const container = document.getElementById('my-clubs-container');
            const clubEventsSection = document.getElementById('club-events-section');
            container.innerHTML = '';
            if (clubEventsSection) {
                clubEventsSection.style.display = 'none';
            }
            (response.data.clubs || []).forEach(club => {
                const card = document.createElement('div');
                card.className = 'admin-item-card';
                card.innerHTML = `
                    <div class="admin-item-head">
                        <div>
                            <h4>${club.club_name || '-'}</h4>
                            <span class="status-chip">${translateStatus(club.activity_status)}</span>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="loadClubDetails(${club.club_id})">管理社團</button>
                    </div>
                `;
                container.appendChild(card);
            });
            if (container.children.length === 0) {
                renderEmptyState(container, '目前沒有可管理的社團', '如果你預期應該看到社團，請先確認帳號權限是否正確。');
            }
        }

        async function loadCollaborativeClubOptions(currentManagedClubId) {
            const createSelect = document.getElementById('event-collaborative-clubs');
            const updateSelect = document.getElementById('update-event-collaborative-clubs');
            if (!createSelect || !updateSelect) return;

            try {
                const response = await APIClient.get('clubs.php?action=all_for_filter');
                if (!response.success) {
                    return;
                }

                const clubs = (response.data?.clubs || []).filter(club => Number(club.club_id) !== Number(currentManagedClubId));
                const options = clubs
                    .map(club => `<option value="${Number(club.club_id)}">${PageUtils.escapeHtml(club.club_name || '-')}</option>`)
                    .join('');

                createSelect.innerHTML = options;
                updateSelect.innerHTML = options;
            } catch (error) {
                console.error('載入協辦社團清單失敗:', error);
            }
        }

        function getSelectedCollaborativeClubIds(selectId) {
            const select = document.getElementById(selectId);
            if (!select) return [];
            return Array.from(select.selectedOptions || []).map(option => Number(option.value)).filter(id => id > 0);
        }

        function setSelectedCollaborativeClubIds(selectId, clubIds) {
            const select = document.getElementById(selectId);
            if (!select) return;
            const selected = new Set((clubIds || []).map(id => Number(id)));
            Array.from(select.options).forEach(option => {
                option.selected = selected.has(Number(option.value));
            });
        }

        async function loadClubDetails(clubId) {
            currentClubId = clubId;
            const response = await APIClient.get('clubs.php?action=detail&id=' + clubId);
            if (!response.success) return console.error(response.message);

            const club = response.data;
            currentClubName = club.club_name || '';
            currentClubLastUpdated = club.last_updated || null;
            document.getElementById('club-action-selector').style.display = 'block';
            document.getElementById('club-action-subtitle').textContent = `目前管理社團：${club.club_name || ''}`;
            hideManagementPanels();
            document.getElementById('club-subtitle').textContent = club.club_name || '';
            document.getElementById('update-club-id').value = club.club_id;
            document.getElementById('event-club-id').value = club.club_id;
            document.getElementById('update-club-name').value = club.club_name || '';
            document.getElementById('update-club-description').value = club.description || '';
            setClubMeetingTimeFromValue(club.meeting_time || '');
            document.getElementById('update-club-location').value = club.meeting_location || '';
            document.getElementById('update-club-email').value = club.contact_email || '';
            document.getElementById('update-club-phone').value = club.contact_phone || '';
            document.getElementById('update-club-fee').value = club.club_fee || '';
            document.getElementById('create-event-submit').disabled = false;
            document.getElementById('create-event-hint').textContent = `目前建立活動目標社團：${club.club_name || ''}`;
            document.getElementById('transfer-request-subtitle').textContent = `目前申請社團：${club.club_name || ''}（${club.club_code || '-'}）`;
            document.getElementById('club-events-subtitle').textContent = `目前管理社團：${club.club_name || ''}`;
            setDefaultCreateEventDate();
            refreshClubPreview();
            await loadCollaborativeClubOptions(currentClubId);

            const logoImg = document.getElementById('club-logo-img');
            if (club.logo_path) {
                logoImg.src = club.logo_path.startsWith('http') ? club.logo_path : '../' + club.logo_path.replace(/^\.\//, '');
                logoImg.style.display = 'block';
            } else {
                logoImg.style.display = 'none';
            }

            // 加載標籤
            selectedTagIds.clear();
            if (club.tags && club.tags.length > 0) {
                club.tags.forEach(tag => selectedTagIds.add(tag.tag_id));
            }
            renderSelectedTags();
            detectTagsFromDescription();

            loadClubEvents(clubId);
        }

        async function loadClubEvents(clubId) {
            const response = await APIClient.get('club-admin.php?action=club_events&id=' + clubId);
            if (!response.success) return console.error(response.message);
            const container = document.getElementById('club-events-container');
            container.innerHTML = '';
            const events = response.data.events || [];
            if (events.length === 0) {
                renderEmptyState(container, '目前沒有活動', '建立第一場活動後，這裡就會顯示列表。');
                return;
            }
            events.forEach(event => {
                const coHostNames = (event.co_host_clubs || []).map(club => PageUtils.escapeHtml(club.club_name || '')).filter(Boolean);
                const card = document.createElement('div');
                card.className = 'admin-item-card';
                card.innerHTML = `
                    <div class="admin-item-head">
                        <div>
                            <h4>${event.event_name || '未命名活動'}</h4>
                            <div class="admin-item-badges">
                                <span class="status-chip">${translateStatus(event.event_status)}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end;">
                            <button class="btn btn-secondary btn-sm" onclick="editEvent(${event.event_id})">編輯</button>
                            <button class="btn btn-secondary btn-sm" onclick="exportRegistrations(${event.event_id})">匯出報名 CSV</button>
                            ${event.event_status === 'archived'
                                ? `<button class="btn btn-primary btn-sm" onclick="restoreEvent(${event.event_id})">還原</button>`
                                : `<button class="btn btn-secondary btn-sm" onclick="archiveEvent(${event.event_id})">歸檔</button>`}
                        </div>
                    </div>
                    <p class="admin-item-content">${formatDateTime(event.event_date)}${event.location ? '｜' + event.location : ''}</p>
                    <p class="admin-item-content">目前報名人數：${Number(event.registered_count || 0)} 人</p>
                    ${coHostNames.length > 0 ? `<p class="admin-item-content">協辦社團：${coHostNames.join('、')}</p>` : ''}
                `;
                container.appendChild(card);
            });
        }

        async function archiveEvent(eventId) {
            const confirmed = window.confirm('確定要將此活動歸檔嗎？歸檔後前台活動列表將不再顯示。');
            if (!confirmed) return;

            const response = await APIClient.put(`events.php?action=archive&id=${eventId}`, {});
            if (response.success) {
                PageUtils.showAlert('活動已歸檔', 'success');
                loadClubEvents(currentClubId);
            } else {
                PageUtils.showAlert(response.message || '歸檔失敗', 'error');
            }
        }

        async function restoreEvent(eventId) {
            const response = await APIClient.put(`events.php?action=restore&id=${eventId}`, {});
            if (response.success) {
                PageUtils.showAlert('活動已還原', 'success');
                loadClubEvents(currentClubId);
            } else {
                PageUtils.showAlert(response.message || '還原失敗', 'error');
            }
        }

        function exportRegistrations(eventId) {
            const token = StorageUtils.getToken();
            const base = APIClient.baseUrl || 'http://localhost/backend/api';
            const url = `${base}/events.php?action=export_registrations&id=${eventId}`;

            fetch(url, {
                method: 'GET',
                credentials: 'same-origin',
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
                .then(async (response) => {
                    if (!response.ok) {
                        let message = '匯出失敗';
                        try {
                            const data = await response.json();
                            message = data.message || message;
                        } catch (_err) {
                            // Ignore JSON parse errors for non-JSON error responses.
                        }
                        throw new Error(message);
                    }

                    const blob = await response.blob();
                    const disposition = response.headers.get('content-disposition') || '';
                    const match = disposition.match(/filename="?([^";]+)"?/i);
                    const fileName = match ? match[1] : `registrations_${eventId}.csv`;

                    const downloadUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(downloadUrl);
                    PageUtils.showAlert('報名名單已匯出', 'success');
                })
                .catch((error) => {
                    console.error('匯出報名失敗:', error);
                    PageUtils.showAlert(error.message || '匯出失敗', 'error');
                });
        }

        async function editEvent(eventId) {
            currentEventId = eventId;
            const response = await APIClient.get('events.php?action=detail&id=' + eventId);
            if (!response.success) return console.error(response.message);

            const event = response.data;
            document.getElementById('event-management-section').style.display = 'block';
            document.getElementById('event-manage-title').textContent = event.event_name || '';
            document.getElementById('update-event-id').value = event.event_id;
            document.getElementById('update-event-name').value = event.event_name || '';
            document.getElementById('update-event-description').value = event.description || '';
            setDateTimeParts('update-event-date', toDatetimeLocal(event.event_date));
            syncDateTimeFromParts('update-event-date', true);
            document.getElementById('update-event-location').value = event.location || '';
            document.getElementById('update-event-capacity').value = event.capacity || '';
            document.getElementById('update-event-fee').value = event.fee || '';
            document.getElementById('update-event-registration-open').checked = Number(event.is_registration_open) === 1;
            setDateTimeParts('update-event-deadline', toDatetimeLocal(event.registration_deadline));
            syncDateTimeFromParts('update-event-deadline', false);

            // 加載標籤
            eventSelectedTagIds.clear();
            if (event.tags && event.tags.length > 0) {
                event.tags.forEach(tag => eventSelectedTagIds.add(tag.tag_id));
            }
            renderEventSelectedTags('update');
            setSelectedCollaborativeClubIds('update-event-collaborative-clubs', (event.co_host_clubs || []).map(club => club.club_id));

            const posterImg = document.getElementById('update-event-poster-img');
            if (event.poster_path) {
                posterImg.src = event.poster_path.startsWith('http') ? event.poster_path : '../' + event.poster_path.replace(/^\.\//, '');
                posterImg.style.display = 'block';
            } else {
                posterImg.style.display = 'none';
            }
        }

        function previewClubLogo(event) {
            const file = event.target.files[0];
            const img = document.getElementById('club-logo-img');
            if (!file) {
                img.style.display = 'none';
                return;
            }
            const reader = new FileReader();
            reader.onload = e => {
                img.src = e.target.result;
                img.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }

        function previewEventPoster(event) {
            const file = event.target.files[0];
            const img = document.getElementById('event-poster-img');
            if (!file) {
                img.style.display = 'none';
                return;
            }
            const reader = new FileReader();
            reader.onload = e => {
                img.src = e.target.result;
                img.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }

        function previewUpdateEventPoster(event) {
            const file = event.target.files[0];
            const img = document.getElementById('update-event-poster-img');
            if (!file) {
                img.style.display = 'none';
                return;
            }
            const reader = new FileReader();
            reader.onload = e => {
                img.src = e.target.result;
                img.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }

        document.getElementById('update-club-form').addEventListener('submit', async event => {
            event.preventDefault();
            if (!validateClubForm()) return;

            const submitButton = event.currentTarget.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;

            try {
                if (!currentClubId) {
                    PageUtils.showAlert('請先選擇要管理的社團', 'error');
                    return;
                }

                const formData = new FormData();
                formData.append('club_name', document.getElementById('update-club-name').value);
                formData.append('description', document.getElementById('update-club-description').value);
                formData.append('meeting_time', document.getElementById('update-club-meeting-time').value);
                formData.append('meeting_location', document.getElementById('update-club-location').value);
                formData.append('contact_email', document.getElementById('update-club-email').value);
                formData.append('contact_phone', document.getElementById('update-club-phone').value);
                formData.append('club_fee', document.getElementById('update-club-fee').value);
                formData.append('last_updated', currentClubLastUpdated || '');

                const logoFile = document.getElementById('club-logo-upload').files[0];
                if (logoFile) {
                    const uploadFormData = new FormData();
                    uploadFormData.append('logo', logoFile);
                    uploadFormData.append('club_id', currentClubId);

                    const uploadResponse = await fetch(getUploadApiUrl('upload_club_logo'), {
                        method: 'POST',
                        body: uploadFormData,
                        credentials: 'same-origin',
                        headers: APIClient.getAuthHeaders()
                    });

                    const uploadRawText = await uploadResponse.text();
                    let uploadResult = null;
                    try {
                        uploadResult = JSON.parse(uploadRawText);
                    } catch (parseError) {
                        throw new Error(`Logo 上傳回應格式錯誤（HTTP ${uploadResponse.status}）：${uploadRawText.slice(0, 300)}`);
                    }

                    if (!uploadResponse.ok || !uploadResult.success) {
                        throw new Error(uploadResult.message || 'Logo 上傳失敗');
                    }

                    formData.append('logo_path', uploadResult.path);
                }

                const response = await APIClient.put('clubs.php?action=update&id=' + currentClubId, Object.fromEntries(formData));
                if (response.success) {
                    PageUtils.showAlert('社團更新成功', 'success');
                    // 保存標籤
                    await saveClubTags(currentClubId);
                    loadClubDetails(currentClubId);
                } else {
                    PageUtils.showAlert('更新社團失敗：' + (response.message || '未知錯誤'), 'error');
                }
            } catch (error) {
                console.error('更新社團失敗:', error);
                PageUtils.showAlert('更新社團失敗：' + error.message, 'error');
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });

        document.getElementById('create-event-form').addEventListener('submit', async event => {
            event.preventDefault();
            
            if (!currentClubId) {
                PageUtils.showAlert('請先從「我的社團」選擇要管理的社團', 'error');
                return;
            }
            
            if (!validateEventForm()) {
                return;
            }
            
            if (!confirm(`即將以「${currentClubName}」幹部身份發布活動，是否確認？`)) {
                return;
            }

            try {
                const formData = new FormData();
                formData.append('club_id', currentClubId);
                formData.append('event_name', document.getElementById('event-name').value);
                formData.append('description', document.getElementById('event-description').value);
                formData.append('event_date', document.getElementById('event-date').value);
                formData.append('location', document.getElementById('event-location').value);
                formData.append('capacity', document.getElementById('event-capacity').value);
                formData.append('fee', document.getElementById('event-fee').value);
                formData.append('registration_deadline', document.getElementById('event-deadline').value);
                formData.append('event_status', 'published');
                formData.append('is_registration_open', document.getElementById('event-registration-open').checked ? '1' : '0');
                const payload = Object.fromEntries(formData);
                payload.collaborative_club_ids = getSelectedCollaborativeClubIds('event-collaborative-clubs');
                const response = await APIClient.post('events.php?action=create', payload);
                
                if (response.success) {
                    const createdEventId = response?.data?.event_id;

                    const posterFile = document.getElementById('event-poster-upload').files[0];
                    if (posterFile && createdEventId) {
                        const uploadFormData = new FormData();
                        uploadFormData.append('poster', posterFile);
                        uploadFormData.append('event_id', String(createdEventId));
                        const uploadResponse = await fetch(getUploadApiUrl('upload_event_poster'), {
                            method: 'POST',
                            body: uploadFormData,
                            credentials: 'same-origin',
                            headers: APIClient.getAuthHeaders()
                        });

                        const uploadRawText = await uploadResponse.text();
                        let uploadResult = null;
                        try {
                            uploadResult = JSON.parse(uploadRawText);
                        } catch (parseError) {
                            throw new Error(`活動海報上傳回應格式錯誤（HTTP ${uploadResponse.status}）：${uploadRawText.slice(0, 300)}`);
                        }

                        if (!uploadResponse.ok || !uploadResult.success) {
                            throw new Error(uploadResult.message || '活動海報上傳失敗');
                        }
                    }

                    // 保存活動標籤
                    if (createEventSelectedTagIds.size > 0 && createdEventId) {
                        try {
                            await APIClient.post('events.php?action=update_event_tags', {
                                event_id: createdEventId,
                                tag_ids: Array.from(createEventSelectedTagIds)
                            });
                        } catch (error) {
                            console.error('保存活動標籤失敗:', error);
                        }
                    }
                    
                    PageUtils.showAlert('活動建立成功', 'success');
                    loadClubEvents(currentClubId);
                    event.target.reset();
                    document.getElementById('event-poster-img').style.display = 'none';
                    createEventSelectedTagIds.clear();
                    renderEventSelectedTags('create');
                    setDefaultCreateEventDate();
                    detectEventTagsFromDescription();
                } else {
                    PageUtils.showAlert('建立活動失敗：' + response.message, 'error');
                }
            } catch (error) {
                console.error('建立活動出現異常:', error);
                PageUtils.showAlert('建立活動錯誤：' + error.message, 'error');
            }
        });

        document.getElementById('update-event-form').addEventListener('submit', async event => {
            event.preventDefault();
            if (!validateEventForm('update-')) return;

            const formData = new FormData();
            formData.append('event_name', document.getElementById('update-event-name').value);
            formData.append('description', document.getElementById('update-event-description').value);
            formData.append('event_date', document.getElementById('update-event-date').value);
            formData.append('location', document.getElementById('update-event-location').value);
            formData.append('capacity', document.getElementById('update-event-capacity').value);
            formData.append('fee', document.getElementById('update-event-fee').value);
            formData.append('registration_deadline', document.getElementById('update-event-deadline').value);
            formData.append('is_registration_open', document.getElementById('update-event-registration-open').checked ? '1' : '0');

            const posterFile = document.getElementById('update-event-poster-upload').files[0];
            if (posterFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('poster', posterFile);
                uploadFormData.append('event_id', currentEventId);
                const uploadResponse = await fetch(getUploadApiUrl('upload_event_poster'), {
                    method: 'POST',
                    body: uploadFormData,
                    credentials: 'same-origin',
                    headers: APIClient.getAuthHeaders()
                });

                const uploadRawText = await uploadResponse.text();
                let uploadResult = null;
                try {
                    uploadResult = JSON.parse(uploadRawText);
                } catch (parseError) {
                    throw new Error(`活動海報上傳回應格式錯誤（HTTP ${uploadResponse.status}）：${uploadRawText.slice(0, 300)}`);
                }

                if (!uploadResponse.ok || !uploadResult.success) {
                    throw new Error(uploadResult.message || '活動海報上傳失敗');
                }

                formData.append('poster_path', uploadResult.path);
            }

            const updatePayload = Object.fromEntries(formData);
            updatePayload.collaborative_club_ids = getSelectedCollaborativeClubIds('update-event-collaborative-clubs');
            const response = await APIClient.put('events.php?action=update&id=' + currentEventId, updatePayload);
            if (response.success) {
                // 保存活動標籤
                if (eventSelectedTagIds.size > 0 || eventSelectedTagIds.size === 0) {
                    try {
                        await APIClient.post('events.php?action=update_event_tags', {
                            event_id: currentEventId,
                            tag_ids: Array.from(eventSelectedTagIds)
                        });
                    } catch (error) {
                        console.error('保存活動標籤失敗:', error);
                    }
                }
                
                PageUtils.showAlert('活動更新成功', 'success');
                loadClubEvents(currentClubId);
                document.getElementById('event-management-section').style.display = 'none';
                eventSelectedTagIds.clear();
                renderEventSelectedTags('update');
                setSelectedCollaborativeClubIds('update-event-collaborative-clubs', []);
            } else {
                PageUtils.showAlert('更新活動失敗：' + response.message, 'error');
            }
        });

        document.getElementById('transfer-request-form').addEventListener('submit', async event => {
            event.preventDefault();
            if (!currentClubId) {
                PageUtils.showAlert('請先選擇要管理的社團', 'error');
                return;
            }

            const targetUserId = document.getElementById('transfer-target-user-id').value.trim();
            const reason = document.getElementById('transfer-request-reason').value.trim();
            const studentId = document.getElementById('transfer-target-student-id').value.trim();
            const note = document.getElementById('transfer-request-note').value.trim();

            setFieldError('transfer-target-user-id', targetUserId ? '' : '此為必填欄位');
            setFieldError('transfer-request-reason', reason ? '' : '此為必填欄位');
            if (!targetUserId || !reason) return;

            const payload = {
                club_id: currentClubId,
                target_user_id: Number(targetUserId),
                reason,
                handover_note: [studentId ? `目標學號：${studentId}` : '', note].filter(Boolean).join('｜')
            };

            const response = await APIClient.post('club-admin.php?action=submit_transfer_request', payload);
            if (response.success) {
                PageUtils.showAlert('轉讓申請已送出，請等待行政端審核', 'success');
                event.target.reset();
                loadMyTransferRequests();
            } else {
                PageUtils.showAlert('送出申請失敗：' + response.message, 'error');
            }
        });

        ['update-club-name', 'update-club-description', 'update-club-meeting-time', 'update-club-email', 'update-club-location'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', refreshClubPreview);
        });

        initHourSelect('update-club-meeting-start-hour');
        initHourSelect('update-club-meeting-end-hour');
        ['update-club-meeting-day', 'update-club-meeting-start-hour', 'update-club-meeting-start-minute', 'update-club-meeting-end-hour', 'update-club-meeting-end-minute'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    syncClubMeetingTimeValue();
                    refreshClubPreview();
                });
            }
        });
        setClubMeetingTimeFromValue('');

        ['event-date', 'event-deadline', 'update-event-date', 'update-event-deadline'].forEach(baseId => {
            initHourSelect(`${baseId}-hour`);
            const dateInput = document.getElementById(`${baseId}-date`);
            const hourSelect = document.getElementById(`${baseId}-hour`);
            const minuteSelect = document.getElementById(`${baseId}-minute`);
            [dateInput, hourSelect, minuteSelect].forEach(control => {
                if (control) {
                    control.addEventListener('change', () => {
                        syncDateTimeFromParts(baseId, baseId.endsWith('event-date'));
                    });
                }
            });

            setDateTimeParts(baseId, '');
            syncDateTimeFromParts(baseId, false);
        });

        loadAllTags().then(() => {
            renderEventSelectedTags('create');
            detectEventTagsFromDescription();
        });
        loadMyClubs();
        loadMyTransferRequests();
        loadUnreadNotificationDot();
