const clubId = new URLSearchParams(window.location.search).get('id');
let selectedRating = 0;
let hasReviewedClub = false;
let reportTarget = null;
let followRequestPending = false;
let _membershipJustLeft = false;

function getFollowStateCache() {
    try {
        return JSON.parse(localStorage.getItem('club-follow-state-cache') || '{}');
    } catch (error) {
        return {};
    }
}

function setFollowStateCache(clubId, isFollowing) {
    const cache = getFollowStateCache();
    cache[String(clubId)] = !!isFollowing;
    localStorage.setItem('club-follow-state-cache', JSON.stringify(cache));
}

function clearFollowStateCache(clubId) {
    const cache = getFollowStateCache();
    const key = String(clubId);
    if (!Object.prototype.hasOwnProperty.call(cache, key)) return;
    delete cache[key];
    localStorage.setItem('club-follow-state-cache', JSON.stringify(cache));
}

function updateReviewActionState() {
    const reviewBtn = document.getElementById('review-btn');
    if (!reviewBtn) return;

    if (hasReviewedClub) {
        reviewBtn.textContent = '您已評價過此社團';
        reviewBtn.disabled = true;
        reviewBtn.classList.remove('btn-primary');
        reviewBtn.classList.add('btn-secondary');
        reviewBtn.title = '每位使用者對同一社團僅能評價一次';
        return;
    }

    reviewBtn.textContent = '發布評價';
    reviewBtn.disabled = false;
    reviewBtn.classList.remove('btn-secondary');
    reviewBtn.classList.add('btn-primary');
    reviewBtn.title = '';
}

function syncFollowSummary(isFollowing, memberCount) {
    const followBtn = document.getElementById('follow-btn');
    const memberCountEl = document.getElementById('member-count');

    if (followBtn) {
        followBtn.textContent = isFollowing ? '已追蹤' : '追蹤社團';
        followBtn.classList.toggle('btn-primary', !isFollowing);
        followBtn.classList.toggle('btn-secondary', isFollowing);
        followBtn.title = '';
    }

    if (memberCountEl) {
        memberCountEl.textContent = Number.isFinite(Number(memberCount)) ? Number(memberCount) : 0;
    }
}

async function loadClubDetail() {
    try {
        const response = await APIClient.get(`clubs.php?action=detail&id=${clubId}`);
        if (response.success) {
            const club = response.data;
            renderClubDetail(club);
        } else {
            document.querySelector('.container').innerHTML = '<p>無法載入社團資訊</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        document.querySelector('.container').innerHTML = '<p>發生錯誤</p>';
    } finally {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('club-detail').style.display = 'block';
    }
}

function renderClubDetail(club) {
    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (Number.isNaN(d.getTime())) return '-';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${day} ${hh}:${mm}`;
    };

    const MAPS_URL_RE = /https?:\/\/(?:www\.)?(?:(?:[a-z0-9-]+\.)?google\.[^\/\s]+\/maps(?:[/?#][^\s]*)?|maps\.app\.goo\.gl\/\S+|goo\.gl\/maps\/\S+)/i;
    const extractMapsUrl   = (v) => { const m = String(v || '').match(MAPS_URL_RE); return m ? m[0] : null; };
    const locationLabel    = (v) => String(v || '').replace(MAPS_URL_RE, '').trim();

    const renderLocationActions = (locationValue) => {
        const actions = document.getElementById('meeting-location-actions');
        if (!actions) return;
        const mapsUrl = extractMapsUrl(locationValue);
        if (!mapsUrl) { actions.innerHTML = ''; return; }
        actions.innerHTML = '';
        const link = document.createElement('a');
        link.className = 'btn btn-primary btn-sm';
        link.href = mapsUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = '在 Google Maps 導航';
        actions.appendChild(link);
    };

    const formatMeetingLocation = (locationValue) => {
        const rawValue = String(locationValue || '').trim();
        if (!rawValue) return '-';
        const label = locationLabel(rawValue);
        if (label) return label;
        if (extractMapsUrl(rawValue)) return '幹部提供的 Google 地圖連結';
        return rawValue;
    };

    document.getElementById('club-name').textContent = club.club_name;
    document.getElementById('club-category').textContent = club.category_name || '-';
    const _hasOnetime = (club.club_fee ?? 0) > 0;
    const _hasSemester = club.club_fee_semester != null && club.club_fee_semester > 0;
    const _hasSession = club.club_fee_per_session != null && club.club_fee_per_session > 0;
    _clubFeeInfo = {
        onetime:  _hasOnetime  ? Number(club.club_fee) : 0,
        semester: _hasSemester ? Number(club.club_fee_semester) : 0,
        session:  _hasSession  ? Number(club.club_fee_per_session) : 0,
    };
    const _feeParts = [
        _hasOnetime   ? `入會費 $${club.club_fee}` : null,
        _hasSemester  ? `學期費 $${club.club_fee_semester} / 學期` : null,
        _hasSession   ? `單堂費 $${club.club_fee_per_session} / 堂` : null
    ].filter(Boolean);
    document.getElementById('club-fee').textContent = _feeParts.length ? _feeParts.join('、') : '免費';
    document.getElementById('meeting-time').textContent = club.meeting_time || '-';
    document.getElementById('meeting-location').textContent = formatMeetingLocation(club.meeting_location);
    renderLocationActions(club.meeting_location);
    document.getElementById('contact-email').textContent = club.contact_email || '-';
    document.getElementById('contact-phone').textContent = club.president_phone || club.contact_phone || '-';
    document.getElementById('last-updated').textContent = formatDateTime(club.last_updated);
    document.getElementById('club-last-updated-banner').textContent = `最後更新時間：${formatDateTime(club.last_updated)}`;
    document.getElementById('club-description').textContent = club.description || '-';
    document.getElementById('member-count').textContent = club.member_count || 0;
    const avgRating = Number(club.average_rating || 0);
    const starsHtml = PageUtils.renderStars(avgRating);
    document.getElementById('avg-rating-stars').innerHTML = starsHtml;
    document.getElementById('avg-rating-value').textContent = Number.isFinite(avgRating) ? avgRating.toFixed(1) : '0.0';
    document.getElementById('review-count').textContent = club.reviews_count || 0;

    const summaryEl = document.getElementById('reviews-rating-summary');
    if (summaryEl) {
        const ratingDisplay = Number.isFinite(avgRating) ? avgRating.toFixed(1) : '0.0';
        summaryEl.textContent = `⭐ ${ratingDisplay}（${club.reviews_count || 0} 人評分）`;
    }

    const tags = Array.isArray(club.tags) ? club.tags : [];
    const tagsHtml = tags.map(tag => {
        const safeTagName = PageUtils.escapeHtml(tag.tag_name || '');
        const tagId = Number(tag.tag_id || 0);
        const href = tagId > 0
            ? `club-list.html?tags=${tagId}`
            : `club-list.html?search=${encodeURIComponent(tag.tag_name || '')}`;
        return `<a class="tag tag-primary" href="${href}" style="text-decoration: none;">#${safeTagName}</a>`;
    }).join('');
    document.getElementById('club-tags').innerHTML = tagsHtml || '暫無標籤';

    const badgesHtml = `<span class="badge">${club.activity_badge === 'high_active' ? '高活躍' : (club.activity_badge === 'no_recent_activity' ? '近期無活動' : '活躍中')}</span>`;
    document.getElementById('club-badges').innerHTML = badgesHtml;

    const logoImg = document.getElementById('club-logo-img');
    const logoPlaceholder = document.getElementById('club-logo-placeholder');
    const logoPlaceholderAvatar = document.getElementById('club-logo-placeholder-avatar');
    const logoPlaceholderLabel = document.getElementById('club-logo-placeholder-label');
    const logoNote = document.getElementById('club-logo-note');
    const uploadedLogoUrl = PageUtils.resolveMediaUrl(club.logo_path);
    const pixelLogoUrl = PageUtils.getClubPixelAvatarUrl(club);

    if (uploadedLogoUrl) {
        logoImg.src = uploadedLogoUrl;
        logoImg.style.imageRendering = 'auto';
        logoImg.style.display = 'block';
        if (logoPlaceholder) logoPlaceholder.style.display = 'none';
        if (logoNote) { logoNote.style.display = 'none'; logoNote.textContent = ''; }
    } else if (pixelLogoUrl) {
        logoImg.src = pixelLogoUrl;
        logoImg.style.imageRendering = 'pixelated';
        logoImg.style.display = 'block';
        if (logoPlaceholder) logoPlaceholder.style.display = 'none';
        if (logoNote) { logoNote.style.display = 'block'; logoNote.textContent = '提醒：此為系統生成示意 Logo，非社團官方提供的實際 Logo。'; }
    } else {
        const avatarEmoji = PageUtils.getClubAvatarEmoji(club.club_name || '', club.category_name || '', club.description || '');
        const avatarText = avatarEmoji || PageUtils.getInitial(club.club_name || '');
        logoImg.removeAttribute('src');
        logoImg.style.imageRendering = 'auto';
        logoImg.style.display = 'none';
        if (logoPlaceholderAvatar) {
            logoPlaceholderAvatar.textContent = avatarText;
            logoPlaceholderAvatar.classList.toggle('club-avatar--emoji', !!avatarEmoji);
            logoPlaceholderAvatar.classList.toggle('club-avatar--fallback', !avatarEmoji);
        }
        if (logoPlaceholderLabel) {
            logoPlaceholderLabel.textContent = avatarEmoji ? '預設貼圖頭像' : '預設首字頭像';
        }
        if (logoPlaceholder) logoPlaceholder.style.display = 'flex';
        if (logoNote) { logoNote.style.display = 'block'; logoNote.textContent = '提醒：此為系統預設頭像，非社團官方提供的實際 Logo。'; }
    }

    const _application = _membershipJustLeft ? null : (club.my_application ?? null);
    _membershipJustLeft = false;
    syncJoinBtn(!!club.is_member, club.my_fee_type ?? null, _application);

    const followBtn = document.getElementById('follow-btn');
    if (club.follow_state_known === false) {
        const isLoggedIn = StorageUtils.isLoggedIn();
        followBtn.classList.remove('btn-secondary');
        followBtn.classList.add('btn-primary');

        if (!isLoggedIn) {
            clearFollowStateCache(clubId);
            followBtn.textContent = '登入後可查看追蹤狀態';
            followBtn.title = '請先登入後再查看或操作追蹤';
        } else {
            followBtn.textContent = '追蹤狀態同步中';
            followBtn.title = '目前無法確認最新追蹤狀態，請稍後再試';
        }
    } else if (club.is_following) {
        followBtn.textContent = '已追蹤';
        followBtn.classList.remove('btn-primary');
        followBtn.classList.add('btn-secondary');
        followBtn.title = '';
        setFollowStateCache(clubId, true);
    } else {
        followBtn.textContent = '追蹤社團';
        followBtn.classList.add('btn-primary');
        followBtn.classList.remove('btn-secondary');
        followBtn.title = '';
        setFollowStateCache(clubId, false);
    }

    renderUpcomingEvents(club.upcoming_events || []);
    renderReviews(club.reviews || []);
    renderAdmins(club.members || []);

    hasReviewedClub = !!club.user_has_reviewed;
    updateReviewActionState();
}

function renderUpcomingEvents(events) {
    const container = document.getElementById('upcoming-events');
    container.innerHTML = '';

    if (events.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-light);">目前尚無近期活動</p>';
        return;
    }

    const MAPS_URL_RE = /https?:\/\/(?:www\.)?(?:(?:[a-z0-9-]+\.)?google\.[^\/\s]+\/maps(?:[/?#][^\s]*)?|maps\.app\.goo\.gl\/\S+|goo\.gl\/maps\/\S+)/i;
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

    events.forEach(event => {
        const eventId = Number(event.event_id || 0);
        const safeEventName = PageUtils.escapeHtml(event.event_name || '未命名活動');
        const rawLocation = String(event.location || '').trim();
        const mapsMatch = rawLocation.match(MAPS_URL_RE);
        const mapsUrl = mapsMatch ? mapsMatch[0] : '';
        const locationText = (() => {
            if (!rawLocation) return '-';
            if (!mapsMatch) return rawLocation;
            const label = rawLocation.replace(MAPS_URL_RE, '').trim();
            return label || 'Google 地圖';
        })();
        const safeLocation = PageUtils.escapeHtml(locationText);
        const safeMapsUrl = PageUtils.escapeHtml(mapsUrl);
        const locationHtml = mapsUrl
            ? `<a href="${safeMapsUrl}" target="_blank" rel="noopener noreferrer" class="feed-item-map-link">📍 ${safeLocation}</a>`
            : `<span>📍 ${safeLocation}</span>`;

        const d = event.event_date
            ? new Date(String(event.event_date).replace(' ', 'T'))
            : null;
        const month = d && !isNaN(d) ? d.getMonth() + 1 : null;
        const day   = d && !isNaN(d) ? d.getDate() : null;
        const weekday = d && !isNaN(d) ? weekdays[d.getDay()] : null;
        const dateText = month ? `${month}月${day}日 週${weekday}` : '-';

        const deadline = event.registration_deadline
            ? new Date(String(event.registration_deadline).replace(' ', 'T'))
            : null;
        const isOpen = event.is_registration_open == 1
            || (deadline && deadline > new Date());

        const capacity = Number(event.capacity) || 0;
        const capacityText = capacity > 0 ? `名額 ${capacity}` : '';

        const card = document.createElement('article');
        card.className = 'feed-item-card';
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (!e.target.closest('a')) {
                window.location.href = `event-detail.html?id=${eventId}`;
            }
        });
        card.innerHTML = `
            <div class="feed-item-link">
                <div class="feed-item-head">
                    <h3 class="feed-item-title">${safeEventName}</h3>
                    <span class="feed-item-badge ${isOpen ? '' : 'feed-item-badge--neutral'}">${isOpen ? '報名中' : '已截止'}</span>
                </div>
                <div class="feed-item-meta">
                    <span>${dateText}</span>
                    ${locationHtml}
                    ${capacityText ? `<span>${capacityText}</span>` : ''}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderReviews(reviews) {
    const container = document.getElementById('reviews-section');
    if (reviews.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light);">暫無評價</p>';
        return;
    }

    const formatDateOnly = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (Number.isNaN(d.getTime())) return '-';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    let html = '';
    reviews.forEach(review => {
        const stars = PageUtils.renderStars(review.rating);
        const author = PageUtils.escapeHtml(review.author_name || review.display_name || '匿名用戶');
        const relativeTime = PageUtils.timeAgo(review.created_at);
        const absoluteDate = formatDateOnly(review.created_at);
        const safeReviewTitle = PageUtils.escapeHtml(review.review_title || author);
        const safeReviewContent = PageUtils.escapeHtml(review.review_content || '');
        const reviewId = Number(review.review_id || 0);
        const reviewUserId = Number(review.user_id || 0);
        const reviewAuthorRaw = review.author_name || review.display_name || '';
        const reviewIdTagHtml = reviewUserId > 0
            ? `<a href="messages.html?user_id=${reviewUserId}&name=${encodeURIComponent(reviewAuthorRaw)}" style="margin-left:5px;font-size:0.73rem;color:var(--text-muted,#6b7280);font-family:monospace;text-decoration:none;" title="傳送私訊">#${reviewUserId}</a>`
            : '';
        html += `
            <div style="padding: 1.5rem 0; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <div>
                        <strong>${safeReviewTitle}</strong>
                        <div style="color: var(--text-light); font-size: 0.9rem;">
                            ${author}${reviewIdTagHtml} • ${relativeTime}（${absoluteDate}）
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div>${stars}</div>
                        <div style="color: var(--text-light); font-size: 0.8rem;">${review.rating}/5 分</div>
                    </div>
                </div>
                <p style="margin: 0.5rem 0; color: var(--text-light);">${safeReviewContent}</p>
                ${reviewId > 0 ? `<div style="margin-top: 0.5rem;"><button class="btn btn-secondary btn-sm" onclick="reportContent('review', ${reviewId})">檢舉</button></div>` : ''}
            </div>
        `;
    });
    container.innerHTML = html;
}

async function reportContent(contentType, contentId) {
    if (!StorageUtils.isLoggedIn()) {
        PageUtils.showAlert('請先登入', 'warning');
        return;
    }

    reportTarget = {
        contentType: contentType,
        contentId: Number(contentId)
    };

    document.getElementById('report-type-select').value = '';
    document.getElementById('report-reason-input').value = '';
    document.getElementById('report-modal').style.display = 'flex';
}

function closeReportModal() {
    reportTarget = null;
    document.getElementById('report-modal').style.display = 'none';
}

async function submitReportForm(event) {
    event.preventDefault();
    if (!reportTarget) return;

    const reportType = document.getElementById('report-type-select').value;
    const reason = document.getElementById('report-reason-input').value.trim();
    if (!reportType) {
        PageUtils.showAlert('請選擇檢舉事由', 'warning');
        return;
    }

    try {
        const response = await APIClient.post('reports.php?action=create', {
            reported_content_type: reportTarget.contentType,
            reported_content_id: reportTarget.contentId,
            report_type: reportType,
            reason: reason
        });

        if (response.success) {
            PageUtils.showAlert('檢舉已送出', 'success');
            closeReportModal();
        } else {
            PageUtils.showAlert(response.message || '檢舉失敗', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        PageUtils.showAlert('檢舉失敗', 'error');
    }
}

function renderAdmins(members) {
    const container = document.getElementById('club-admins');
    const admins = members.filter(m => ['president', 'vice_president', 'director'].includes(m.role));

    if (admins.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light);">暫無幹部信息</p>';
        return;
    }

    let html = '';
    admins.forEach(admin => {
        const roleText = {
            'president': '社長',
            'vice_president': '副社長',
            'director': '常務理事'
        }[admin.role] || admin.role;
        const safeAdminName = PageUtils.escapeHtml(admin.name || '未命名幹部');
        const safeRoleText = PageUtils.escapeHtml(roleText || '-');

        html += `
            <div style="padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                <div style="font-weight: 500;">${safeAdminName}</div>
                <div style="font-size: 0.85rem; color: var(--text-light);">${safeRoleText}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function toggleFollow() {
    if (!StorageUtils.isLoggedIn()) {
        PageUtils.showAlert('請先登入', 'warning');
        window.location.href = 'login.html';
        return;
    }

    if (followRequestPending) {
        return;
    }

    try {
        followRequestPending = true;
        const response = await APIClient.post(`clubs.php?action=toggle_follow&id=${clubId}`, {});
        if (response.success) {
            const isFollowing = !!response.data?.is_following;
            const memberCount = Number(response.data?.member_count ?? 0);
            setFollowStateCache(clubId, isFollowing);
            syncFollowSummary(isFollowing, memberCount);

            if (typeof window.refreshGlobalFollowSidebar === 'function') {
                await window.refreshGlobalFollowSidebar();
            }

            loadClubDetail();
            return;
        } else {
            PageUtils.showAlert(response.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        PageUtils.showAlert('操作失敗', 'error');
    } finally {
        followRequestPending = false;
    }
}

function openReviewModal() {
    if (!StorageUtils.isLoggedIn()) {
        PageUtils.showAlert('請先登入', 'warning');
        window.location.href = 'login.html';
        return;
    }

    if (hasReviewedClub) {
        PageUtils.showAlert('您已評價過此社團，每位使用者僅能評價一次', 'warning');
        return;
    }

    loadEligibleReviewEvents();
    document.getElementById('review-modal').style.display = 'flex';
}

async function loadEligibleReviewEvents() {
    const select = document.getElementById('review-event-id');
    const submitBtn = document.querySelector('#review-form button[type="submit"]');
    if (!select) return;

    select.innerHTML = '';
    select.disabled = false;
    if (submitBtn) submitBtn.disabled = false;

    try {
        const response = await APIClient.get(`reviews.php?action=eligible_events&club_id=${clubId}`);
        if (!response.success) return;

        const events = response.data?.events || [];
        const canReviewAsMember = !!response.data?.can_review_as_member;
        const hasEvents = events.length > 0;

        if (!canReviewAsMember && !hasEvents) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '您尚未加入此社團，也未參加過已結束的活動';
            select.appendChild(opt);
            select.disabled = true;
            if (submitBtn) submitBtn.disabled = true;
            return;
        }

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '請選擇評價依據';
        select.appendChild(placeholder);

        if (canReviewAsMember) {
            const opt = document.createElement('option');
            opt.value = '0';
            opt.textContent = '以社員身份評價（不指定特定活動）';
            select.appendChild(opt);
        }

        events.forEach(event => {
            const option = document.createElement('option');
            option.value = String(event.event_id || '');
            option.textContent = `${event.event_name || '未命名活動'}（${PageUtils.formatDate(event.event_date)}）`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

function closeReviewModal() {
    document.getElementById('review-modal').style.display = 'none';
}

document.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        selectedRating = parseInt(btn.dataset.rating);
        document.getElementById('review-rating').value = selectedRating;

        document.querySelectorAll('.star-btn').forEach((b, idx) => {
            b.classList.toggle('is-active', idx < selectedRating);
        });
    });
});

document.getElementById('review-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (selectedRating === 0) {
        PageUtils.showAlert('請選擇評分', 'warning');
        return;
    }

    const selectedEventId = document.getElementById('review-event-id').value;
    if (!selectedEventId && selectedEventId !== '0') {
        PageUtils.showAlert('請選擇評價依據', 'warning');
        return;
    }

    try {
        const response = await APIClient.post('reviews.php?action=create', {
            club_id: clubId,
            rating: selectedRating,
            review_title: document.getElementById('review-title').value,
            review_content: document.getElementById('review-content').value,
            event_attended_id: selectedEventId === '0' ? null : selectedEventId,
            is_anonymous: document.getElementById('review-anonymous').checked
        });

        if (response.success) {
            PageUtils.showAlert('評價已發布', 'success');
            closeReviewModal();
            document.getElementById('review-form').reset();
            selectedRating = 0;
            updateReviewActionState();
            loadClubDetail();
        } else {
            PageUtils.showAlert(response.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        PageUtils.showAlert('提交失敗', 'error');
    }
});

// ── 加入社團 ────────────────────────────────────────────────────────────

let _clubFeeInfo = {};

function syncJoinBtn(isMember, feeType, application) {
    const btn = document.getElementById('join-btn');
    if (!btn) return;
    if (isMember) {
        btn.textContent = '已加入';
        btn.className = 'btn btn-secondary';
        btn.title = '點擊可退出社團';
        btn.disabled = false;
        btn.onclick = leaveClub;
    } else if (application && application.status === 'pending') {
        btn.textContent = '申請審核中';
        btn.className = 'btn btn-secondary';
        btn.title = '您的申請正在等待幹部審核';
        btn.disabled = true;
        btn.onclick = null;
    } else if (application && application.status === 'approved') {
        btn.textContent = '前往驗證';
        btn.className = 'btn btn-primary';
        btn.title = '申請已通過，請前往私訊 Bot 輸入驗證碼';
        btn.disabled = false;
        btn.onclick = () => window.location.href = 'messages.html?open=bot';
    } else {
        btn.textContent = '申請加入';
        btn.className = 'btn btn-primary';
        btn.title = '';
        btn.disabled = false;
        btn.onclick = openJoinModal;
    }
}

function openJoinModal() {
    if (!StorageUtils.isLoggedIn()) {
        PageUtils.showAlert('請先登入', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const fees = _clubFeeInfo;
    const hasOnetime  = fees.onetime  > 0;
    const hasSemester = fees.semester > 0;
    const hasSession  = fees.session  > 0;
    const feeCount = [hasOnetime, hasSemester, hasSession].filter(Boolean).length;

    let feeHtml = '';
    if (feeCount === 0) {
        feeHtml = '<p style="margin:0.5rem 0 1rem;">此社團免費加入。</p>'
            + '<input type="hidden" id="join-fee-type" value="none">';
    } else if (feeCount === 1) {
        const type  = hasOnetime ? 'onetime' : hasSemester ? 'semester' : 'session';
        const label = hasOnetime
            ? `一次付清 $${fees.onetime} 元`
            : hasSemester
            ? `學期費 $${fees.semester} 元／學期`
            : `單堂費 $${fees.session} 元／堂`;
        feeHtml = `<p style="margin:0.5rem 0 1rem;">費用：${label}</p>`
            + `<input type="hidden" id="join-fee-type" value="${type}">`;
    } else {
        const opts = [
            hasOnetime  ? `<label class="join-fee-opt"><input type="radio" name="join-fee" value="onetime"> 一次付清 $${fees.onetime} 元</label>` : '',
            hasSemester ? `<label class="join-fee-opt"><input type="radio" name="join-fee" value="semester"> 學期費 $${fees.semester} 元／學期</label>` : '',
            hasSession  ? `<label class="join-fee-opt"><input type="radio" name="join-fee" value="session"> 單堂費 $${fees.session} 元／堂</label>` : '',
        ].filter(Boolean).join('');
        feeHtml = `<p style="margin:0.5rem 0 0.25rem;">請選擇付費方式：</p><div class="join-fee-group" style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:1rem;">${opts}</div>`;
    }

    let modal = document.getElementById('join-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'join-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="join-modal-box">
            <h3 class="join-modal-title">申請加入社團</h3>
            <p class="join-modal-desc">送出申請後由幹部審核，通過後將透過私訊 Bot 傳送驗證碼</p>
            ${feeHtml}
            <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
                <button class="btn btn-secondary btn-sm" onclick="closeJoinModal()">取消</button>
                <button class="btn btn-primary btn-sm" id="join-confirm-btn" onclick="confirmJoin()">送出申請</button>
            </div>
        </div>`;
    modal.style.display = 'flex';
    modal.onclick = (e) => { if (e.target === modal) closeJoinModal(); };

    const firstRadio = modal.querySelector('input[type="radio"]');
    if (firstRadio) firstRadio.checked = true;
}

function closeJoinModal() {
    const modal = document.getElementById('join-modal');
    if (modal) modal.style.display = 'none';
}

async function confirmJoin() {
    const confirmBtn = document.getElementById('join-confirm-btn');
    if (confirmBtn) confirmBtn.disabled = true;

    let feeType = 'none';
    const hidden = document.getElementById('join-fee-type');
    if (hidden) {
        feeType = hidden.value;
    } else {
        const checked = document.querySelector('input[name="join-fee"]:checked');
        if (!checked) {
            PageUtils.showAlert('請選擇付費方式', 'warning');
            if (confirmBtn) confirmBtn.disabled = false;
            return;
        }
        feeType = checked.value;
    }

    try {
        const res = await APIClient.post(`clubs.php?action=apply_join&id=${clubId}`, { fee_type: feeType });
        if (res && res.success) {
            closeJoinModal();
            PageUtils.showAlert('申請已送出，等待幹部審核！', 'success');
            syncJoinBtn(false, null, { status: 'pending' });
        } else {
            PageUtils.showAlert(res?.message || '申請失敗', 'error');
        }
    } catch (err) {
        PageUtils.showAlert('申請失敗：' + err.message, 'error');
    } finally {
        if (confirmBtn) confirmBtn.disabled = false;
    }
}

function leaveClub() {
    let modal = document.getElementById('leave-confirm-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'leave-confirm-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="join-modal-box" style="max-width:360px;">
            <h3 class="join-modal-title" style="color:#dc2626;">退出社團</h3>
            <p style="margin:0.5rem 0 1.5rem;color:var(--text-muted);">確定要退出此社團嗎？退出後您的申請紀錄也將一併取消，需重新申請才能再次加入。</p>
            <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
                <button id="leave-cancel-btn" class="btn btn-secondary btn-sm">取消</button>
                <button id="leave-confirm-btn" class="btn btn-sm" style="background:#dc2626;color:#fff;border-color:#dc2626;">確認退出</button>
            </div>
        </div>`;
    modal.style.display = 'flex';

    document.getElementById('leave-cancel-btn').onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    document.getElementById('leave-confirm-btn').onclick = async () => {
        const confirmBtn = document.getElementById('leave-confirm-btn');
        if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = '處理中…'; }
        try {
            const res = await APIClient.post(`clubs.php?action=leave_club&id=${clubId}`, {});
            modal.style.display = 'none';
            if (res && res.success) {
                PageUtils.showAlert('已退出社團', 'success');
                _membershipJustLeft = true;
                syncJoinBtn(false, null, null);
            } else {
                PageUtils.showAlert(res?.message || '退出失敗', 'error');
            }
        } catch (err) {
            modal.style.display = 'none';
            PageUtils.showAlert('退出失敗：' + err.message, 'error');
        }
    };
}

window.addEventListener('DOMContentLoaded', function() {
    if (!clubId) {
        document.querySelector('.container').innerHTML = '<p>無效的社團ID</p>';
        return;
    }
    document.getElementById('report-form').addEventListener('submit', submitReportForm);
    document.getElementById('report-cancel-btn').addEventListener('click', closeReportModal);
    loadClubDetail();
});

// bfcache 還原時重新載入社團資料，確保加入申請狀態（pending/rejected/approved）即時正確
window.addEventListener('pageshow', function (e) {
    if (e.persisted && clubId) {
        loadClubDetail();
    }
});
