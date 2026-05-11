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

        // 活動列表快取（供搜尋/排序使用）
        let _eventsListCache = [];
        let _eventsCurrentPage = 1;
        const _eventsPerPage = 10;

        // 活動 modal 模式：'create' | 'edit'
        let _eventModalMode = 'edit';

        function getUploadApiUrl(action) {
            const base = (typeof APIClient !== 'undefined' && typeof APIClient.getBaseUrl === 'function')
                ? APIClient.getBaseUrl()
                : ((typeof API_URL === 'string' && API_URL) ? API_URL : '/社團活動資訊統整平台/backend/api');
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
            ['club-management-section','create-event-section','transfer-request-section','club-events-section','event-management-section'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
        }

        function showManagementPanel(panel) {
            hideManagementPanels();
            const map = { club:'club-management-section', event:'create-event-section', transfer:'transfer-request-section', events:'club-events-section' };
            const el = document.getElementById(map[panel]);
            if (el) el.style.display = 'block';
        }

        // Called when user selects a club. Override per page for navigation behaviour.
        function handleClubSelect(clubId, clubName) {
            loadClubDetails(clubId);
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
            const descEl = document.getElementById('update-club-description');
            if (!descEl) return;
            const description = descEl.value.trim().toLowerCase();
            suggestedTagIds.clear();
            const suggestionContainer = document.getElementById('suggested-tags');
            if (!suggestionContainer) return;
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
            if (!container) return;
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
            const inp = document.getElementById('tag-search-input');
            const res = document.getElementById('tag-search-results');
            if (inp) inp.value = '';
            if (res) res.innerHTML = '';
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
                detectUpdateEventTagsFromDescription();
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

        function detectUpdateEventTagsFromDescription() {
            const textarea = document.getElementById('update-event-description');
            const container = document.getElementById('update-event-suggested-tags');
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
                if (hasMatch && !eventSelectedTagIds.has(tag.tag_id)) {
                    suggestions.push(tag);
                }
            });

            if (suggestions.length === 0) {
                container.innerHTML = '<span style="color: #999; font-size: 0.9rem;">掃描後無推薦標籤</span>';
                return;
            }

            suggestions.forEach(tag => {
                const badge = createEventTagBadge(tag, 'suggested', 'update');
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

            ['update-club-description', 'update-club-meeting-time', 'update-club-email', 'update-club-location'].forEach(id => {
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
            syncDateTimeFromParts(`${prefix}event-end`, false);
            syncDateTimeFromParts(`${prefix}event-reg-start`, false);
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

            if (!validateHalfHourField(`${prefix}event-date`, '舉辦時間只能選整點或半點')) ok = false;

            [`${prefix}event-end`, `${prefix}event-reg-start`, `${prefix}event-deadline`].forEach(id => {
                const el = document.getElementById(id);
                if (el && el.value.trim() && !isHalfHourAligned(el.value.trim())) {
                    setFieldError(id, '只能選整點或半點時間');
                    ok = false;
                } else if (el) {
                    setFieldError(id, '');
                }
            });
            return ok;
        }

        function refreshClubPreview() {
            if (!document.getElementById('club-preview-text')) return;
            const name = (currentClubName || '').trim() || '未填寫';
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
            const safeTitle = PageUtils.escapeHtml(title || '');
            const safeDescription = PageUtils.escapeHtml(description || '');
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-illustration"></div>
                    <h4>${safeTitle}</h4>
                    <p>${safeDescription}</p>
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
                const safeClubName = PageUtils.escapeHtml(item.club_name || '-');
                const safeClubCode = PageUtils.escapeHtml(item.club_code || '-');
                const safeTargetName = PageUtils.escapeHtml(item.target_user_name || '-');
                const safeTargetStudentId = PageUtils.escapeHtml(item.target_student_id || '-');
                const safeReason = PageUtils.escapeHtml(item.reason || '-');
                const safeReviewNote = PageUtils.escapeHtml(item.review_note || '');
                const safeStatus = PageUtils.escapeHtml(transferStatusLabel(item.request_status));
                const card = document.createElement('div');
                card.className = 'admin-item-card';
                card.innerHTML = `
                    <div class="admin-item-head">
                        <h4>${safeClubName}（${safeClubCode}）</h4>
                        <span class="status-chip">${safeStatus}</span>
                    </div>
                    <p class="admin-item-content">目標對象：${safeTargetName}（學號:${safeTargetStudentId}）</p>
                    <p class="admin-item-content">原因：${safeReason}</p>
                    ${safeReviewNote ? `<p class="admin-item-content">審核意見：${safeReviewNote}</p>` : ''}
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
            if (!container) return;
            container.innerHTML = '';
            (response.data.clubs || []).forEach(club => {
                const safeClubName = PageUtils.escapeHtml(club.club_name || '-');
                const safeStatus = PageUtils.escapeHtml(translateStatus(club.activity_status));
                const card = document.createElement('div');
                card.className = 'admin-item-card';
                card.innerHTML = `
                    <div class="admin-item-head">
                        <div>
                            <h4>${safeClubName}</h4>
                            <span class="status-chip">${safeStatus}</span>
                        </div>
                        <button class="btn btn-primary btn-sm"
                            data-manage-club-id="${Number(club.club_id)}"
                            data-manage-club-name="${safeClubName}">管理社團</button>
                    </div>
                `;
                container.appendChild(card);
            });
            if (container.children.length === 0) {
                renderEmptyState(container, '目前沒有可管理的社團', '如果你預期應該看到社團，請先確認帳號權限是否正確。');
            }
            container.addEventListener('click', e => {
                const btn = e.target.closest('[data-manage-club-id]');
                if (!btn) return;
                handleClubSelect(Number(btn.dataset.manageClubId), btn.dataset.manageClubName);
            });
        }

        async function loadClubAdminStats(clubId) {
            try {
                const [res, myRes] = await Promise.all([
                    APIClient.get(`club-admin.php?action=club_stats&id=${clubId}`),
                    APIClient.get('club-admin.php?action=my_clubs'),
                ]);
                const myClubsEl = document.getElementById('stat-my-clubs');
                if (myClubsEl && myRes.success) {
                    const count = (myRes.data.clubs || []).length;
                    myClubsEl.textContent = count || '-';
                }
                if (!res.success) return;
                const s = res.data;
                const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
                setText('stat-followers',       s.follower_count ?? '-');
                setText('stat-total-events',    s.total_events ?? '-');
                setText('stat-upcoming',        s.upcoming_events ?? '-');
                setText('stat-published',       s.published_events ?? '-');
                setText('stat-cancelled',       s.cancelled_events ?? '-');
                setText('stat-registrations',   s.total_registrations ?? '-');
                setText('stat-avg-rating',      s.average_rating !== null ? Number(s.average_rating).toFixed(1) : '-');
                const qaEl = document.getElementById('stat-unanswered-qa');
                if (qaEl) {
                    qaEl.textContent = s.unanswered_qa ?? '-';
                    qaEl.classList.toggle('stat-alert', (s.unanswered_qa ?? 0) > 0);
                }
                document.querySelectorAll('.stat-club-only').forEach(el => el.classList.add('is-loaded'));
            } catch (e) {
                console.error('loadClubAdminStats error', e);
            }
        }

        async function loadCollaborativeClubOptions(currentManagedClubId) {
            const createContainer = document.getElementById('event-collaborative-clubs');
            const updateContainer = document.getElementById('update-event-collaborative-clubs');
            if (!createContainer && !updateContainer) return;

            try {
                const response = await APIClient.get('clubs.php?action=all_for_filter');
                if (!response.success) return;

                const clubs = (response.data?.clubs || []).filter(club => Number(club.club_id) !== Number(currentManagedClubId));
                if (createContainer) {
                    renderCollaborativeClubCheckboxes(createContainer, clubs, 'create-collab-club');
                    bindCollaborativeClubDropdown('event-collaborative-clubs');
                }
                if (updateContainer) {
                    renderCollaborativeClubCheckboxes(updateContainer, clubs, 'update-collab-club');
                    bindCollaborativeClubDropdown('update-event-collaborative-clubs');
                }
            } catch (error) {
                console.error('載入協辦社團清單失敗:', error);
            }
        }

        function getCollaborativeClubDropdownRefs(containerId) {
            return {
                container: document.getElementById(containerId),
                trigger: document.querySelector(`[data-collab-trigger="${containerId}"]`)
            };
        }

        function setCollaborativeClubDropdownSummary(containerId) {
            const refs = getCollaborativeClubDropdownRefs(containerId);
            if (!refs.container || !refs.trigger) return;

            const checkedInputs = Array.from(refs.container.querySelectorAll('input[type="checkbox"][data-collab-club-id]:checked'));
            if (checkedInputs.length === 0) {
                refs.trigger.textContent = '請選擇協辦社團';
                refs.trigger.title = '';
                return;
            }

            const names = checkedInputs.map(input => {
                const label = input.closest('label');
                const text = label ? label.textContent : '';
                return (text || '').trim();
            }).filter(Boolean);

            refs.trigger.textContent = names.length <= 2 ? names.join('、') : `已選 ${names.length} 個社團`;
            refs.trigger.title = names.join('、');
        }

        function closeCollaborativeClubDropdown(containerId) {
            const refs = getCollaborativeClubDropdownRefs(containerId);
            if (!refs.container || !refs.trigger) return;
            refs.container.hidden = true;
            refs.trigger.setAttribute('aria-expanded', 'false');
        }

        function closeAllCollaborativeClubDropdowns(exceptId = '') {
            document.querySelectorAll('.cad-collab-dropdown-trigger[data-collab-trigger]').forEach(trigger => {
                const targetId = trigger.getAttribute('data-collab-trigger') || '';
                if (targetId && targetId !== exceptId) {
                    closeCollaborativeClubDropdown(targetId);
                }
            });
        }

        function isClickInsideCollaborativeDropdown(event) {
            if (!event) return false;
            if (typeof event.composedPath === 'function') {
                return event.composedPath().some(node => {
                    return node && node.classList && node.classList.contains('cad-collab-dropdown');
                });
            }

            let current = event.target;
            while (current) {
                if (current.classList && current.classList.contains('cad-collab-dropdown')) {
                    return true;
                }
                current = current.parentElement;
            }
            return false;
        }

        function bindCollaborativeClubDropdown(containerId) {
            const refs = getCollaborativeClubDropdownRefs(containerId);
            if (!refs.container || !refs.trigger) return;

            if (refs.trigger.dataset.bound !== '1') {
                refs.trigger.addEventListener('click', event => {
                    event.stopPropagation();
                    const shouldOpen = refs.container.hidden;
                    closeAllCollaborativeClubDropdowns(containerId);
                    refs.container.hidden = !shouldOpen;
                    refs.trigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
                });
                refs.trigger.dataset.bound = '1';
            }

            if (refs.container.dataset.bound !== '1') {
                refs.container.addEventListener('change', event => {
                    if (event.target && event.target.matches('input[type="checkbox"][data-collab-club-id]')) {
                        setCollaborativeClubDropdownSummary(containerId);
                    }
                });
                refs.container.dataset.bound = '1';
            }

            if (document.body.dataset.collabDropdownOutsideBound !== '1') {
                document.addEventListener('click', event => {
                    if (!isClickInsideCollaborativeDropdown(event)) {
                        closeAllCollaborativeClubDropdowns();
                    }
                });
                document.addEventListener('keydown', event => {
                    if (event.key === 'Escape') {
                        closeAllCollaborativeClubDropdowns();
                    }
                });
                document.body.dataset.collabDropdownOutsideBound = '1';
            }

            setCollaborativeClubDropdownSummary(containerId);
        }

        function renderCollaborativeClubCheckboxes(container, clubs, inputIdPrefix) {
            if (!container) return;
            if (!clubs.length) {
                container.innerHTML = '<p class="cad-help-text">目前沒有可選的協辦社團。</p>';
                return;
            }

            container.innerHTML = clubs
                .map(club => {
                    const clubId = Number(club.club_id);
                    const inputId = `${inputIdPrefix}-${clubId}`;
                    const clubName = PageUtils.escapeHtml(club.club_name || '-');
                    return `<label class="cad-collab-club-item" for="${inputId}">
                        <input type="checkbox" id="${inputId}" value="${clubId}" data-collab-club-id="${clubId}">
                        <span>${clubName}</span>
                    </label>`;
                })
                .join('');
        }

        function getSelectedCollaborativeClubIds(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return [];
            return Array.from(container.querySelectorAll('input[type="checkbox"][data-collab-club-id]:checked'))
                .map(input => Number(input.value))
                .filter(id => id > 0);
        }

        function setSelectedCollaborativeClubIds(containerId, clubIds) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const selected = new Set((clubIds || []).map(id => Number(id)));
            Array.from(container.querySelectorAll('input[type="checkbox"][data-collab-club-id]')).forEach(input => {
                input.checked = selected.has(Number(input.value));
            });
            setCollaborativeClubDropdownSummary(containerId);
        }

        async function loadClubDetails(clubId) {
            currentClubId = clubId;
            const response = await APIClient.get('clubs.php?action=detail&id=' + clubId);
            if (!response.success) return console.error(response.message);

            const club = response.data;
            currentClubName = club.club_name || '';
            currentClubLastUpdated = club.last_updated || null;

            const $e = id => document.getElementById(id);
            const setVal = (id, v) => { const e = $e(id); if (e) e.value = String(v ?? ''); };
            const setTxt = (id, v) => { const e = $e(id); if (e) e.textContent = String(v ?? ''); };

            if ($e('club-action-selector')) $e('club-action-selector').style.display = 'block';
            setTxt('club-action-subtitle', `目前管理社團：${club.club_name || ''}`);
            hideManagementPanels();
            setTxt('club-subtitle', club.club_name || '');
            setVal('update-club-id', club.club_id);
            setVal('event-club-id', club.club_id);
            setVal('update-club-description', club.description || '');
            if ($e('update-club-meeting-day')) setClubMeetingTimeFromValue(club.meeting_time || '');
            setVal('update-club-location', club.meeting_location || '');
            setVal('update-club-email', club.contact_email || '');
            setVal('update-club-phone', club.contact_phone || '');
            const hasOnetime = (club.club_fee ?? 0) > 0;
            const hasSemester = club.club_fee_semester != null && club.club_fee_semester > 0;
            const onetimeCb = $e('update-fee-onetime-enabled');
            const semesterCb = $e('update-fee-semester-enabled');
            const onetimeIn = $e('update-club-fee');
            const semesterIn = $e('update-club-fee-semester');
            if (onetimeCb && onetimeIn) {
                onetimeCb.checked = hasOnetime;
                onetimeIn.disabled = !hasOnetime;
                onetimeIn.value = hasOnetime ? club.club_fee : '';
            }
            if (semesterCb && semesterIn) {
                semesterCb.checked = hasSemester;
                semesterIn.disabled = !hasSemester;
                semesterIn.value = hasSemester ? club.club_fee_semester : '';
            }
            if ($e('create-event-submit')) $e('create-event-submit').disabled = false;
            setTxt('create-event-hint', `目前建立活動目標社團：${club.club_name || ''}`);
            setTxt('transfer-request-subtitle', `目前申請社團：${club.club_name || ''}（${club.club_code || '-'}）`);
            setTxt('club-events-subtitle', `目前管理社團：${club.club_name || ''}`);
            if ($e('event-date-date')) setDefaultCreateEventDate();
            refreshClubPreview();
            await loadCollaborativeClubOptions(currentClubId);

            const logoImg = $e('club-logo-img');
            if (logoImg) {
                if (club.logo_path) {
                    logoImg.src = PageUtils.resolveMediaUrl(club.logo_path);
                    logoImg.style.display = 'block';
                } else {
                    logoImg.style.display = 'none';
                }
            }

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
            if (!document.getElementById('club-events-container')) return;
            _eventsListCache = response.data.events || [];
            _eventsCurrentPage = 1;
            renderFilteredEvents();
        }

        function ensureEventsPaginationContainer() {
            const list = document.getElementById('club-events-container');
            if (!list) return null;
            let el = document.getElementById('club-events-pagination');
            if (!el) {
                el = document.createElement('div');
                el.id = 'club-events-pagination';
                el.className = 'club-events-pagination';
                list.insertAdjacentElement('afterend', el);
            }
            return el;
        }

        function renderEventsPagination(totalItems) {
            const host = ensureEventsPaginationContainer();
            if (!host) return;

            const totalPages = Math.max(1, Math.ceil(totalItems / _eventsPerPage));
            if (_eventsCurrentPage > totalPages) _eventsCurrentPage = totalPages;

            if (totalItems <= _eventsPerPage) {
                host.innerHTML = '';
                host.style.display = 'none';
                return;
            }

            host.style.display = '';
            const info = document.createElement('div');
            info.className = 'club-events-pagination__info';
            info.textContent = `Page ${_eventsCurrentPage} / ${totalPages} | Total ${totalItems}`;

            const controls = document.createElement('div');
            controls.className = 'club-events-pagination__controls';

            const makeBtn = (label, page, disabled = false, active = false) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `btn btn-secondary btn-sm${active ? ' is-active' : ''}`;
                btn.textContent = label;
                btn.disabled = disabled;
                btn.addEventListener('click', () => {
                    if (disabled || page === _eventsCurrentPage) return;
                    _eventsCurrentPage = page;
                    renderFilteredEvents();
                });
                return btn;
            };

            controls.appendChild(makeBtn('Prev', Math.max(1, _eventsCurrentPage - 1), _eventsCurrentPage === 1));

            const maxVisiblePages = 5;
            const half = Math.floor(maxVisiblePages / 2);
            let start = Math.max(1, _eventsCurrentPage - half);
            let end = Math.min(totalPages, start + maxVisiblePages - 1);
            start = Math.max(1, end - maxVisiblePages + 1);
            for (let p = start; p <= end; p++) {
                controls.appendChild(makeBtn(String(p), p, false, p === _eventsCurrentPage));
            }

            controls.appendChild(makeBtn('Next', Math.min(totalPages, _eventsCurrentPage + 1), _eventsCurrentPage === totalPages));

            host.innerHTML = '';
            host.appendChild(info);
            host.appendChild(controls);
        }

        function renderFilteredEvents() {
            const container = document.getElementById('club-events-container');
            if (!container) return;

            const q = (document.getElementById('events-search')?.value || '').trim().toLowerCase();
            const sort = document.getElementById('events-sort')?.value || 'date-desc';

            let events = _eventsListCache.slice();
            if (q) events = events.filter(ev =>
                (ev.event_name || '').toLowerCase().includes(q) ||
                (ev.event_date || '').slice(0, 10).includes(q)
            );

            events.sort((a, b) => {
                if (sort === 'date-asc')  return new Date(a.event_date) - new Date(b.event_date);
                if (sort === 'date-desc') return new Date(b.event_date) - new Date(a.event_date);
                if (sort === 'name-asc')  return (a.event_name || '').localeCompare(b.event_name || '', 'zh-Hant');
                if (sort === 'reg-desc')  return Number(b.registered_count || 0) - Number(a.registered_count || 0);
                return 0;
            });

            container.innerHTML = '';
            if (events.length === 0) {
                renderEmptyState(container,
                    q ? '找不到符合的活動' : '目前沒有活動',
                    q ? '請嘗試其他關鍵字或日期' : '建立第一場活動後，這裡就會顯示列表。');
                renderEventsPagination(0);
                return;
            }
            const totalItems = events.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / _eventsPerPage));
            if (_eventsCurrentPage > totalPages) _eventsCurrentPage = totalPages;
            const startIndex = (_eventsCurrentPage - 1) * _eventsPerPage;
            const pagedEvents = events.slice(startIndex, startIndex + _eventsPerPage);

            pagedEvents.forEach(event => {
                const coHostNames = (event.co_host_clubs || []).map(club => PageUtils.escapeHtml(club.club_name || '')).filter(Boolean);
                const safeEventName = PageUtils.escapeHtml(event.event_name || '未命名活動');
                const safeStatus = PageUtils.escapeHtml(translateStatus(event.event_status));
                const MAPS_URL_RE = /https?:\/\/(?:www\.)?(?:(?:[a-z0-9-]+\.)?google\.[^\/\s]+\/maps(?:[/?#][^\s]*)?|maps\.app\.goo\.gl\/\S+|goo\.gl\/maps\/\S+)/i;
                const rawLocation = String(event.location || '').trim();
                const mapsMatch = rawLocation.match(MAPS_URL_RE);
                const locationText = mapsMatch
                    ? (rawLocation.replace(MAPS_URL_RE, '').trim() || 'Google 地圖')
                    : rawLocation;
                const locationHtml = (() => {
                    if (!rawLocation) return '';
                    const safeText = PageUtils.escapeHtml(locationText);
                    if (mapsMatch) {
                        const safeUrl = PageUtils.escapeHtml(mapsMatch[0]);
                        return `｜<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
                    }
                    return `｜${safeText}`;
                })();
                const card = document.createElement('div');
                card.className = 'club-admin-event-row';
                card.innerHTML = `
                    <div class="admin-item-head">
                        <div>
                            <h4>${safeEventName}</h4>
                            <div class="admin-item-badges">
                                <span class="status-chip">${safeStatus}</span>
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
                    <p class="admin-item-content">${formatDateTime(event.event_date)}${locationHtml}</p>
                    <p class="admin-item-content">目前報名人數：${Number(event.registered_count || 0)} 人</p>
                    ${coHostNames.length > 0 ? `<p class="admin-item-content">協辦社團：${coHostNames.join('、')}</p>` : ''}
                `;
                container.appendChild(card);
            });
            renderEventsPagination(totalItems);
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
            const base = APIClient.getBaseUrl();
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

        function closeEventModal() {
            const modal = document.getElementById('event-modal');
            if (modal) modal.style.display = 'none';
            document.body.style.overflow = '';
        }

        function openEventModal(mode) {
            _eventModalMode = mode;
            const modal = document.getElementById('event-modal');
            if (!modal) return;
            const submitBtn = document.getElementById('event-modal-submit');
            const title = document.getElementById('event-modal-title');

            if (mode === 'create') {
                if (title) title.textContent = '建立活動';
                if (submitBtn) submitBtn.textContent = '建立活動';
                const form = document.getElementById('update-event-form');
                if (form) form.reset();
                ['update-event-date', 'update-event-end', 'update-event-reg-start', 'update-event-deadline'].forEach(id => {
                    setDateTimeParts(id, '');
                    syncDateTimeFromParts(id, false);
                });
                const today = new Date();
                const dateInput = document.getElementById('update-event-date-date');
                if (dateInput) {
                    dateInput.value = today.toISOString().slice(0, 10);
                    syncDateTimeFromParts('update-event-date', true);
                }
                const regOpen = document.getElementById('update-event-registration-open');
                if (regOpen) regOpen.checked = true;
                const posterImg = document.getElementById('update-event-poster-img');
                if (posterImg) { posterImg.src = ''; posterImg.style.display = 'none'; }
                eventSelectedTagIds.clear();
                renderEventSelectedTags('update');
                detectUpdateEventTagsFromDescription();
                setSelectedCollaborativeClubIds('update-event-collaborative-clubs', []);
                if (currentClubId) loadCollaborativeClubOptions(currentClubId);
            } else {
                if (title) title.textContent = '編輯活動';
                if (submitBtn) submitBtn.textContent = '更新活動';
            }

            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            modal.scrollTop = 0;
        }

        async function uploadEventPosterFile(eventId, fileInput) {
            const posterFile = fileInput ? fileInput.files[0] : null;
            if (!posterFile) return null;
            if (!eventId) return null;
            if (posterFile.size > 10 * 1024 * 1024) {
                throw new Error('海報檔案超過 10MB 上限，請壓縮後再上傳');
            }
            const uploadFormData = new FormData();
            uploadFormData.append('poster', posterFile);
            uploadFormData.append('event_id', String(eventId));
            const csrfHeaders = await APIClient.getCSRFHeaders();
            const uploadResponse = await fetch(getUploadApiUrl('upload_event_poster'), {
                method: 'POST',
                body: uploadFormData,
                credentials: 'include',
                headers: { ...APIClient.getAuthHeaders(), ...csrfHeaders }
            });
            const rawText = await uploadResponse.text();
            let result = null;
            try { result = JSON.parse(rawText); }
            catch (e) { throw new Error(`活動海報上傳回應格式錯誤（HTTP ${uploadResponse.status}）：${rawText.slice(0, 300)}`); }
            if (!uploadResponse.ok || !result.success) throw new Error(result.message || '活動海報上傳失敗');
            return result.path;
        }

        async function editEvent(eventId) {
            currentEventId = eventId;
            const response = await APIClient.get('events.php?action=detail&id=' + eventId);
            if (!response.success) return console.error(response.message);

            const event = response.data;
            openEventModal('edit');
            const modalTitle = document.getElementById('event-modal-title');
            if (modalTitle) modalTitle.textContent = `編輯活動 — ${PageUtils.escapeHtml(event.event_name || '')}`;
            document.getElementById('update-event-id').value = event.event_id;
            document.getElementById('update-event-name').value = event.event_name || '';
            document.getElementById('update-event-description').value = event.description || '';
            setDateTimeParts('update-event-date', toDatetimeLocal(event.event_date));
            syncDateTimeFromParts('update-event-date', true);
            setDateTimeParts('update-event-end', toDatetimeLocal(event.event_end_date));
            syncDateTimeFromParts('update-event-end', false);
            document.getElementById('update-event-location').value = event.location || '';
            document.getElementById('update-event-capacity').value = event.capacity || '';
            document.getElementById('update-event-fee').value = event.fee || '';
            document.getElementById('update-event-registration-open').checked = Number(event.is_registration_open) === 1;
            setDateTimeParts('update-event-reg-start', toDatetimeLocal(event.registration_start));
            syncDateTimeFromParts('update-event-reg-start', false);
            setDateTimeParts('update-event-deadline', toDatetimeLocal(event.registration_deadline));
            syncDateTimeFromParts('update-event-deadline', false);

            // 加載標籤
            eventSelectedTagIds.clear();
            if (event.tags && event.tags.length > 0) {
                event.tags.forEach(tag => eventSelectedTagIds.add(tag.tag_id));
            }
            renderEventSelectedTags('update');
            detectUpdateEventTagsFromDescription();
            setSelectedCollaborativeClubIds('update-event-collaborative-clubs', (event.co_host_clubs || []).map(club => club.club_id));

            const posterImg = document.getElementById('update-event-poster-img');
            if (event.poster_path) {
                posterImg.src = PageUtils.resolveMediaUrl(event.poster_path);
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

        // ── Club switch popup ────────────────────────────────────────────────
        function closeClubSwitchPopup() {
            const modal = document.getElementById('club-switch-modal');
            if (modal) modal.style.display = 'none';
            document.body.style.overflow = '';
        }

        async function openClubSwitchPopup() {
            let modal = document.getElementById('club-switch-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'club-switch-modal';
                modal.innerHTML = `
                    <div class="csm-overlay" id="csm-overlay">
                        <div class="csm-panel">
                            <div class="csm-head">
                                <h3 class="csm-title">切換社團</h3>
                                <button class="csm-close" id="csm-close" aria-label="關閉">&times;</button>
                            </div>
                            <div class="csm-body" id="csm-body"></div>
                        </div>
                    </div>`;
                document.body.appendChild(modal);
                document.getElementById('csm-overlay').addEventListener('click', e => {
                    if (e.target.id === 'csm-overlay') closeClubSwitchPopup();
                });
                document.getElementById('csm-close').addEventListener('click', closeClubSwitchPopup);
                document.addEventListener('keydown', e => {
                    if (e.key === 'Escape') closeClubSwitchPopup();
                });
            }

            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';

            const body = document.getElementById('csm-body');
            body.innerHTML = '<p class="csm-status">載入中⋯</p>';

            try {
                const res = await APIClient.get('club-admin.php?action=my_clubs');
                if (!res.success) throw new Error(res.message);
                const clubs = res.data.clubs || [];
                if (!clubs.length) {
                    body.innerHTML = '<p class="csm-status">目前沒有可管理的社團。</p>';
                    return;
                }
                body.innerHTML = '';
                clubs.forEach(club => {
                    const isCurrent = Number(club.club_id) === Number(currentClubId);
                    const safeName = PageUtils.escapeHtml(club.club_name || '-');
                    const item = document.createElement('div');
                    item.className = 'csm-item' + (isCurrent ? ' csm-item--current' : '');
                    item.innerHTML = isCurrent
                        ? `<span class="csm-item-name">${safeName}</span><span class="csm-item-tag">目前管理中</span>`
                        : `<span class="csm-item-name">${safeName}</span><button class="btn btn-primary btn-sm csm-pick" data-club-id="${Number(club.club_id)}" data-club-name="${safeName}">選擇</button>`;
                    body.appendChild(item);
                });

                body.addEventListener('click', e => {
                    const btn = e.target.closest('.csm-pick');
                    if (!btn) return;
                    const clubId = Number(btn.dataset.clubId);
                    const clubName = btn.dataset.clubName;

                    sessionStorage.setItem('clubAdmin_clubId', clubId);
                    sessionStorage.setItem('clubAdmin_clubName', clubName);
                    currentClubId = clubId;
                    currentClubName = clubName;

                    const banner = document.getElementById('selected-club-banner');
                    if (banner) banner.style.display = '';
                    const bannerName = document.getElementById('selected-club-name');
                    if (bannerName) bannerName.textContent = clubName;
                    const statName = document.getElementById('stat-current-club');
                    if (statName) statName.textContent = clubName;
                    document.querySelectorAll('.stat-club-only').forEach(el => el.classList.remove('is-loaded'));
                    loadClubAdminStats(clubId);

                    closeClubSwitchPopup();
                    document.dispatchEvent(new CustomEvent('clubadmin:switch', { detail: { clubId, clubName } }));
                }, { once: true });
            } catch (err) {
                body.innerHTML = `<p class="csm-status csm-status--error">載入失敗：${PageUtils.escapeHtml(err.message)}</p>`;
            }
        }

        // ── club-admin-club-manage.html ──────────────────────────────────────
        (function () {
            const form = document.getElementById('update-club-form');
            if (!form) return;

            ['update-fee-onetime-enabled', 'update-fee-semester-enabled'].forEach(cbId => {
                const cb = document.getElementById(cbId);
                if (!cb) return;
                const inputId = cbId === 'update-fee-onetime-enabled' ? 'update-club-fee' : 'update-club-fee-semester';
                cb.addEventListener('change', () => {
                    const inp = document.getElementById(inputId);
                    if (!inp) return;
                    inp.disabled = !cb.checked;
                    if (!cb.checked) inp.value = '';
                });
            });

            form.addEventListener('submit', async event => {
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
                    formData.append('description', document.getElementById('update-club-description').value);
                    formData.append('meeting_time', document.getElementById('update-club-meeting-time').value);
                    formData.append('meeting_location', document.getElementById('update-club-location').value);
                    formData.append('contact_email', document.getElementById('update-club-email').value);
                    formData.append('contact_phone', document.getElementById('update-club-phone').value);
                    const onetimeEnabled = document.getElementById('update-fee-onetime-enabled')?.checked;
                    const semesterEnabled = document.getElementById('update-fee-semester-enabled')?.checked;
                    formData.append('club_fee', onetimeEnabled ? (document.getElementById('update-club-fee').value || '0') : '0');
                    formData.append('club_fee_semester', semesterEnabled ? (document.getElementById('update-club-fee-semester').value || '0') : '');
                    formData.append('last_updated', currentClubLastUpdated || '');

                    const logoFile = document.getElementById('club-logo-upload').files[0];
                    if (logoFile) {
                        const uploadFormData = new FormData();
                        uploadFormData.append('logo', logoFile);
                        uploadFormData.append('club_id', currentClubId);
                        const csrfHeaders = await APIClient.getCSRFHeaders();

                        const uploadResponse = await fetch(getUploadApiUrl('upload_club_logo'), {
                            method: 'POST',
                            body: uploadFormData,
                            credentials: 'include',
                            headers: {
                                ...APIClient.getAuthHeaders(),
                                ...csrfHeaders
                            }
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

            ['update-club-description', 'update-club-meeting-time', 'update-club-email', 'update-club-location'].forEach(id => {
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

            loadAllTags();
            const saved = sessionStorage.getItem('clubAdmin_clubId');
            if (saved) loadClubDetails(Number(saved));

            document.addEventListener('clubadmin:switch', e => loadClubDetails(e.detail.clubId));
        })();

        // ── club-admin-create-event.html ─────────────────────────────────────
        (function () {
            const form = document.getElementById('create-event-form');
            if (!form) return;

            ['event-date', 'event-end', 'event-reg-start', 'event-deadline'].forEach(baseId => {
                initHourSelect(`${baseId}-hour`);
                const dateInput = document.getElementById(`${baseId}-date`);
                const hourSelect = document.getElementById(`${baseId}-hour`);
                const minuteSelect = document.getElementById(`${baseId}-minute`);
                [dateInput, hourSelect, minuteSelect].forEach(control => {
                    if (control) {
                        control.addEventListener('change', () => {
                            syncDateTimeFromParts(baseId, baseId === 'event-date');
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

            const savedForCollab = sessionStorage.getItem('clubAdmin_clubId');
            if (savedForCollab) loadCollaborativeClubOptions(Number(savedForCollab));

            form.addEventListener('submit', async event => {
                event.preventDefault();

                if (!currentClubId) {
                    PageUtils.showAlert('請先從「我的社團」選擇要管理的社團', 'error');
                    return;
                }

                if (!validateEventForm()) return;

                if (!confirm(`即將以「${currentClubName}」幹部身份發布活動，是否確認？`)) return;

                try {
                    const formData = new FormData();
                    formData.append('club_id', currentClubId);
                    formData.append('event_name', document.getElementById('event-name').value);
                    formData.append('description', document.getElementById('event-description').value);
                    formData.append('event_date', document.getElementById('event-date').value);
                    formData.append('event_end_date', document.getElementById('event-end').value);
                    formData.append('registration_start', document.getElementById('event-reg-start').value);
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
                            const csrfHeaders = await APIClient.getCSRFHeaders();
                            const uploadResponse = await fetch(getUploadApiUrl('upload_event_poster'), {
                                method: 'POST',
                                body: uploadFormData,
                                credentials: 'include',
                                headers: {
                                    ...APIClient.getAuthHeaders(),
                                    ...csrfHeaders
                                }
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
                        event.target.reset();
                        const posterImg = document.getElementById('event-poster-img');
                        if (posterImg) posterImg.style.display = 'none';
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

            document.addEventListener('clubadmin:switch', e => {
                const hint = document.getElementById('create-event-hint');
                if (hint) hint.textContent = `以「${e.detail.clubName}」幹部身份發布活動`;
                loadCollaborativeClubOptions(e.detail.clubId);
            });
        })();

        // ── club-admin-events-list.html ──────────────────────────────────────
        (function () {
            const form = document.getElementById('update-event-form');
            if (!form) return;

            ['update-event-date', 'update-event-end', 'update-event-reg-start', 'update-event-deadline'].forEach(baseId => {
                initHourSelect(`${baseId}-hour`);
                const dateInput = document.getElementById(`${baseId}-date`);
                const hourSelect = document.getElementById(`${baseId}-hour`);
                const minuteSelect = document.getElementById(`${baseId}-minute`);
                [dateInput, hourSelect, minuteSelect].forEach(control => {
                    if (control) {
                        control.addEventListener('change', () => {
                            syncDateTimeFromParts(baseId, false);
                        });
                    }
                });
                setDateTimeParts(baseId, '');
                syncDateTimeFromParts(baseId, false);
            });

            loadAllTags();

            const savedForCollab = sessionStorage.getItem('clubAdmin_clubId');
            if (savedForCollab) loadCollaborativeClubOptions(Number(savedForCollab));

            form.addEventListener('submit', async event => {
                event.preventDefault();
                if (!validateEventForm('update-')) return;

                const submitButton = event.currentTarget.querySelector('button[type="submit"]');
                if (submitButton) submitButton.disabled = true;

                const g = id => document.getElementById(id);
                const collabIds = getSelectedCollaborativeClubIds('update-event-collaborative-clubs');
                const posterFileInput = g('update-event-poster-upload');

                try {
                    if (_eventModalMode === 'create') {
                        if (!currentClubId) {
                            PageUtils.showAlert('請先選擇要管理的社團', 'error');
                            return;
                        }
                        const payload = {
                            club_id: currentClubId,
                            event_name: g('update-event-name').value,
                            description: g('update-event-description').value,
                            event_date: g('update-event-date').value,
                            event_end_date: g('update-event-end').value,
                            registration_start: g('update-event-reg-start').value,
                            location: g('update-event-location').value,
                            capacity: g('update-event-capacity').value,
                            fee: g('update-event-fee').value,
                            registration_deadline: g('update-event-deadline').value,
                            event_status: 'published',
                            is_registration_open: g('update-event-registration-open').checked ? '1' : '0',
                            collaborative_club_ids: collabIds
                        };
                        const response = await APIClient.post('events.php?action=create', payload);
                        if (!response.success) {
                            PageUtils.showAlert('建立活動失敗：' + response.message, 'error');
                            return;
                        }
                        const createdId = response?.data?.event_id;
                        if (createdId) await uploadEventPosterFile(createdId, posterFileInput);
                        if (eventSelectedTagIds.size > 0 && createdId) {
                            try {
                                await APIClient.post('events.php?action=update_event_tags', {
                                    event_id: createdId,
                                    tag_ids: Array.from(eventSelectedTagIds)
                                });
                            } catch (e) { console.error('保存活動標籤失敗:', e); }
                        }
                        PageUtils.showAlert('活動建立成功', 'success');
                        closeEventModal();
                        loadClubEvents(currentClubId);
                    } else {
                        if (!currentEventId) {
                            PageUtils.showAlert('找不到活動識別碼，請重新點選要編輯的活動', 'error');
                            return;
                        }
                        const formData = new FormData();
                        formData.append('event_name', g('update-event-name').value);
                        formData.append('description', g('update-event-description').value);
                        formData.append('event_date', g('update-event-date').value);
                        formData.append('event_end_date', g('update-event-end').value);
                        formData.append('registration_start', g('update-event-reg-start').value);
                        formData.append('location', g('update-event-location').value);
                        formData.append('capacity', g('update-event-capacity').value);
                        formData.append('fee', g('update-event-fee').value);
                        formData.append('registration_deadline', g('update-event-deadline').value);
                        formData.append('is_registration_open', g('update-event-registration-open').checked ? '1' : '0');
                        const posterPath = await uploadEventPosterFile(currentEventId, posterFileInput);
                        if (posterPath) formData.append('poster_path', posterPath);
                        const updatePayload = Object.fromEntries(formData);
                        updatePayload.collaborative_club_ids = collabIds;
                        const response = await APIClient.put('events.php?action=update&id=' + currentEventId, updatePayload);
                        if (!response.success) {
                            PageUtils.showAlert('更新活動失敗：' + (response.message || '未知錯誤'), 'error');
                            return;
                        }
                        try {
                            await APIClient.post('events.php?action=update_event_tags', {
                                event_id: currentEventId,
                                tag_ids: Array.from(eventSelectedTagIds)
                            });
                        } catch (e) { console.error('保存活動標籤失敗:', e); }
                        PageUtils.showAlert('活動更新成功', 'success');
                        closeEventModal();
                        loadClubEvents(currentClubId);
                    }
                } catch (error) {
                    console.error('活動操作異常:', error);
                    PageUtils.showAlert((_eventModalMode === 'create' ? '建立' : '更新') + '活動錯誤：' + (error.message || '未知錯誤'), 'error');
                } finally {
                    if (submitButton) submitButton.disabled = false;
                }
            });

            const searchInput = document.getElementById('events-search');
            const sortSelect = document.getElementById('events-sort');
            if (searchInput) searchInput.addEventListener('input', () => {
                _eventsCurrentPage = 1;
                renderFilteredEvents();
            });
            if (sortSelect) sortSelect.addEventListener('change', () => {
                _eventsCurrentPage = 1;
                renderFilteredEvents();
            });

            const modalCloseBtn = document.getElementById('event-modal-close');
            if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeEventModal);
            const eventModal = document.getElementById('event-modal');
            if (eventModal) eventModal.addEventListener('click', e => { if (e.target === eventModal) closeEventModal(); });
            document.addEventListener('keydown', e => { if (e.key === 'Escape') closeEventModal(); });

            const saved = sessionStorage.getItem('clubAdmin_clubId');
            if (saved) loadClubEvents(Number(saved));

            document.addEventListener('clubadmin:switch', e => {
                loadClubEvents(e.detail.clubId);
                closeEventModal();
            });
        })();

        // ── club-admin-transfer.html ─────────────────────────────────────────
        (function () {
            const form = document.getElementById('transfer-request-form');
            if (!form) return;

            form.addEventListener('submit', async event => {
                event.preventDefault();
                if (!currentClubId) {
                    PageUtils.showAlert('請先選擇要管理的社團', 'error');
                    return;
                }

                const targetUserEmail = document.getElementById('transfer-target-user-email').value.trim().toLowerCase();
                const reason = document.getElementById('transfer-request-reason').value.trim();
                const studentId = document.getElementById('transfer-target-student-id').value.trim();
                const note = document.getElementById('transfer-request-note').value.trim();
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                if (!targetUserEmail) {
                    setFieldError('transfer-target-user-email', '此為必填欄位');
                } else if (!emailPattern.test(targetUserEmail)) {
                    setFieldError('transfer-target-user-email', 'Email 格式不正確');
                } else {
                    setFieldError('transfer-target-user-email', '');
                }
                setFieldError('transfer-request-reason', reason ? '' : '此為必填欄位');
                if (!targetUserEmail || !emailPattern.test(targetUserEmail) || !reason) return;

                const payload = {
                    club_id: currentClubId,
                    target_user_email: targetUserEmail,
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

            loadMyTransferRequests();

            document.addEventListener('clubadmin:switch', () => loadMyTransferRequests());
        })();

        // ── (legacy my-clubs IIFE — kept but guarded, page removed) ─────────
        (function () {
            if (!document.getElementById('my-clubs-container')) return;
            loadMyClubs();
        })();

        loadUnreadNotificationDot();
