let currentUserId = 0;
let currentConvUserId = 0;
let pollTimer = null;
let _notepadMode = false;
let _openMenuMsgId = null;
let _replyTo = null;
let _quizStep = -1;
let _quizAnswers = {};

const QUIZ_QUESTIONS = [
    { id: 'q1', text: '你對哪種活動最感興趣？', options: [
        { value: '體育性', label: '🏃 運動競賽' },
        { value: '學術性', label: '🧠 學術技能' },
        { value: '藝文性', label: '🎨 藝術文化' },
        { value: '服務性', label: '🤝 服務公益' },
        { value: '休閒性', label: '🎮 休閒娛樂' },
    ]},
    { id: 'q2', text: '你期望從社團得到什麼？', options: [
        { value: 'sport',    label: '💪 強身健體、運動樂趣' },
        { value: 'academic', label: '📚 技能提升、知識學習' },
        { value: 'arts',     label: '🎵 創意表達、藝術欣賞' },
        { value: 'social',   label: '🌍 服務社會、廣交朋友' },
    ]},
    { id: 'q3', text: '希望的參與強度？', options: [
        { value: 'light',  label: '🍃 輕鬆型，偶爾參加就好' },
        { value: 'active', label: '🔥 積極型，定期出席投入' },
    ]},
    { id: 'q4', text: '社費預算大約是？', options: [
        { value: '0',   label: '🆓 越便宜越好' },
        { value: '500', label: '💰 一學期 500 元以內可以' },
        { value: 'any', label: '💳 不在意費用，以興趣優先' },
    ]},
];

function isMobileView() { return window.innerWidth <= 640; }

function toggleSidebar() {
    if (isMobileView()) return;
    const sidebar = document.querySelector('.msg-sidebar');
    if (sidebar.classList.contains('sidebar-collapsed')) {
        sidebar.classList.remove('sidebar-collapsed');
        try {
            const saved = parseInt(localStorage.getItem('msg_sidebar_w'), 10);
            if (saved >= 200 && saved <= 520) {
                sidebar.style.width = saved + 'px';
                sidebar.style.minWidth = saved + 'px';
            }
        } catch (_) {}
    } else {
        sidebar.style.width = '';
        sidebar.style.minWidth = '';
        sidebar.classList.add('sidebar-collapsed');
    }
}

// ── sidebar resize ──────────────────────────────────────────
(function () {
    const MIN_W = 200, MAX_W = 520;
    let dragging = false, startX = 0, startW = 0;

    const handle = document.getElementById('sidebar-resize-handle');

    function applyDesktopWidth() {
        try {
            const saved = parseInt(localStorage.getItem('msg_sidebar_w'), 10);
            if (saved >= MIN_W && saved <= MAX_W) {
                const s = document.querySelector('.msg-sidebar');
                s.style.width = saved + 'px';
                s.style.minWidth = saved + 'px';
            }
        } catch (_) {}
    }

    function clearInlineWidth() {
        const s = document.querySelector('.msg-sidebar');
        s.style.width = '';
        s.style.minWidth = '';
        s.style.transition = '';
        // Collapsed state uses different mechanism on desktop; reset it on mobile
        s.classList.remove('sidebar-collapsed');
    }

    handle.addEventListener('mousedown', function (e) {
        if (isMobileView()) return;
        const sidebar = document.querySelector('.msg-sidebar');
        if (sidebar.classList.contains('sidebar-collapsed')) return;
        e.preventDefault();
        dragging = true;
        startX = e.clientX;
        startW = sidebar.offsetWidth;
        sidebar.style.transition = 'none';
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        const sidebar = document.querySelector('.msg-sidebar');
        const w = Math.min(MAX_W, Math.max(MIN_W, startW + (e.clientX - startX)));
        sidebar.style.width = w + 'px';
        sidebar.style.minWidth = w + 'px';
    });

    document.addEventListener('mouseup', function () {
        if (!dragging) return;
        dragging = false;
        const sidebar = document.querySelector('.msg-sidebar');
        sidebar.style.transition = '';
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try { localStorage.setItem('msg_sidebar_w', sidebar.offsetWidth); } catch (_) {}
    });

    // Restore saved width only when NOT on mobile (inline style overrides media query)
    if (!isMobileView()) applyDesktopWidth();

    // On resize across the mobile/desktop boundary, fix inline styles
    let _wasMobile = isMobileView();
    window.addEventListener('resize', function () {
        const nowMobile = isMobileView();
        if (nowMobile === _wasMobile) return;
        _wasMobile = nowMobile;
        if (nowMobile) {
            clearInlineWidth();
        } else {
            applyDesktopWidth();
        }
    });
})();

function showMobilePanel() {
    if (!isMobileView()) return;
    document.querySelector('.msg-panel').classList.add('mobile-active');
    document.querySelector('.msg-sidebar').classList.add('mobile-hidden');
}

function showMobileSidebar() {
    document.querySelector('.msg-panel').classList.remove('mobile-active');
    document.querySelector('.msg-sidebar').classList.remove('mobile-hidden');
    clearInterval(pollTimer);
    currentConvUserId = 0;
    _notepadMode = false;
    cancelReply();
}

function makeAvatar(name, avatarPath, size) {
    const sz = size || 40;
    if (avatarPath) {
        const url = PageUtils.resolveMediaUrl(avatarPath);
        const safe = PageUtils.escapeAttribute(url);
        return `<div class="msg-conv-avatar" style="width:${sz}px;height:${sz}px;"><img src="${safe}" alt="" onerror="this.onerror=null;this.style.display='none'"></div>`;
    }
    const initial = String(name || '?').charAt(0).toUpperCase();
    return `<div class="msg-conv-avatar" style="width:${sz}px;height:${sz}px;">${PageUtils.escapeHtml(initial)}</div>`;
}

function setAvatarEl(el, name, avatarPath) {
    if (avatarPath) {
        const url = PageUtils.resolveMediaUrl(avatarPath);
        el.innerHTML = `<img src="${PageUtils.escapeAttribute(url)}" alt="" onerror="this.onerror=null;this.style.display='none'">`;
    } else {
        el.textContent = String(name || '?').charAt(0).toUpperCase();
    }
}

async function loadConversations() {
    try {
        const res = await APIClient.get('messages.php?action=conversations');
        if (!res || !res.success) return;
        renderConvList(res.data.conversations || []);
    } catch (e) {
        console.error('loadConversations', e);
    }
}

async function loadBotUnreadStatus() {
    try {
        const res = await APIClient.get('messages.php?action=bot_messages');
        if (!res || !res.success) return;
        const msgs = res.data.messages || [];
        const preview = document.getElementById('bot-preview');
        if (preview) preview.textContent = msgs.length > 0 ? msgs[msgs.length - 1].title : '目前沒有訊息';
    } catch (e) { /* silent */ }
}

function renderConvList(convs) {
    const list = document.getElementById('conv-list');
    if (!convs.length) {
        list.innerHTML = '<div class="msg-empty-conv">還沒有對話<br>點擊 ＋ 開始</div>';
        return;
    }
    list.innerHTML = convs.map(c => {
        const isActive = c.user_id == currentConvUserId;
        const initial = String(c.name || '?').charAt(0).toUpperCase();
        const avatarHtml = c.avatar_path
            ? `<img src="${PageUtils.escapeAttribute(PageUtils.resolveMediaUrl(c.avatar_path))}" alt="" onerror="this.onerror=null;this.style.display='none'">`
            : PageUtils.escapeHtml(initial);
        const badge = Number(c.unread_count) > 0
            ? `<span class="msg-conv-badge">${Number(c.unread_count)}</span>` : '';
        const timeStr = c.last_time ? PageUtils.timeAgo(c.last_time) : '';
        const preview = PageUtils.escapeHtml((c.last_content || '').substring(0, 40));
        return `<div class="msg-conv-item${isActive ? ' msg-conv-item--active' : ''}" onclick="openConversation(${Number(c.user_id)}, '${PageUtils.escapeAttribute(c.name || '')}', '${PageUtils.escapeAttribute(c.avatar_path || '')}')">
            <div class="msg-conv-avatar">${avatarHtml}</div>
            <div class="msg-conv-info">
                <div class="msg-conv-name">${PageUtils.escapeHtml(c.name || '')}</div>
                <div class="msg-conv-preview">${preview}</div>
            </div>
            <div class="msg-conv-meta">
                <span class="msg-conv-time">${timeStr}</span>
                ${badge}
            </div>
        </div>`;
    }).join('');
}

function deactivateAllSidebarItems() {
    currentConvUserId = 0;
    _notepadMode = false;
    clearInterval(pollTimer);
    document.querySelectorAll('.msg-conv-item').forEach(el => el.classList.remove('msg-conv-item--active'));
    document.getElementById('bot-item').classList.remove('msg-bot-item--active');
    document.getElementById('notepad-item').classList.remove('msg-bot-item--active');
    document.getElementById('forms-item').classList.remove('msg-bot-item--active');
}

async function openBotConversation() {
    deactivateAllSidebarItems();
    document.getElementById('bot-item').classList.add('msg-bot-item--active');

    const panelHead = document.getElementById('panel-head');
    const panelAvatar = document.getElementById('panel-avatar');
    const panelName = document.getElementById('panel-name');
    const sendBar = document.getElementById('send-bar');

    panelAvatar.innerHTML = '🤖';
    panelAvatar.style.background = 'linear-gradient(135deg,#6366f1,#8b5cf6)';
    panelAvatar.style.fontSize = '1.1rem';
    panelName.innerHTML = '平台機器人 <span class="msg-bot-badge">BOT</span>';
    panelHead.style.display = '';
    sendBar.style.display = 'none';
    showMobilePanel();

    const area = document.getElementById('messages-area');
    area.innerHTML = '<div class="msg-placeholder"><div class="msg-spinner"></div></div>';

    try {
        const res = await APIClient.get('messages.php?action=bot_messages');
        if (!res || !res.success) throw new Error('載入失敗');
        const msgs = res.data.messages || [];
        renderBotMessages(msgs, area);
        // Mark all bot messages as read
        if (msgs.some(m => !m.is_read)) {
            await APIClient.post('messages.php?action=mark_bot_read', {});
        }
    } catch (e) {
        area.innerHTML = '<div class="msg-placeholder"><span style="color:var(--color-text-muted);">載入失敗，請重試</span></div>';
    }
}

function _renderQuizInvitation() {
    return `<div id="bot-quiz-card" class="quiz-card" style="display:flex;align-items:center;gap:10px;padding:10px 16px;">
        <div class="quiz-icon-wrap">🎯</div>
        <div style="flex:1;min-width:0;">
            <div class="quiz-title">社團適配測驗</div>
            <div class="quiz-subtitle">回答 4 題，找到最適合你的社團</div>
        </div>
        <button onclick="startClubQuiz()" style="flex-shrink:0;background:#7c3aed;color:#fff;border:none;padding:6px 16px;border-radius:20px;cursor:pointer;font-size:0.8rem;font-weight:600;letter-spacing:.02em;">開始</button>
    </div>`;
}

function _renderQuizStep() {
    const q = QUIZ_QUESTIONS[_quizStep];
    const total = QUIZ_QUESTIONS.length;
    const pct = Math.round(((_quizStep) / total) * 100);
    const optionsHtml = q.options.map(o =>
        `<button class="quiz-option-btn" onclick="advanceQuiz('${o.value}')">${o.label}</button>`
    ).join('');
    return `<div id="bot-quiz-card" class="quiz-card" style="padding:12px 16px 14px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <div class="quiz-progress-track">
                <div style="width:${pct}%;height:100%;background:#7c3aed;border-radius:2px;transition:width .3s;"></div>
            </div>
            <span class="quiz-step-counter">${_quizStep + 1} / ${total}</span>
        </div>
        <div class="quiz-question-text">${q.text}</div>
        <div style="display:flex;flex-direction:column;gap:6px;">${optionsHtml}</div>
    </div>`;
}

function _renderQuizLoading() {
    return `<div id="bot-quiz-card" class="quiz-card" style="display:flex;align-items:center;gap:10px;padding:11px 16px;">
        <div class="msg-spinner"></div>
        <span class="quiz-title" style="font-weight:500;">正在為你分析最適合的社團…</span>
    </div>`;
}

function startClubQuiz() {
    _quizStep = 0;
    _quizAnswers = {};
    const card = document.getElementById('bot-quiz-card');
    if (card) card.outerHTML = _renderQuizStep();
}

function advanceQuiz(value) {
    const q = QUIZ_QUESTIONS[_quizStep];
    _quizAnswers[q.id] = value;
    _quizStep++;
    if (_quizStep >= QUIZ_QUESTIONS.length) {
        submitQuiz();
    } else {
        const card = document.getElementById('bot-quiz-card');
        if (card) card.outerHTML = _renderQuizStep();
    }
}

async function submitQuiz() {
    const card = document.getElementById('bot-quiz-card');
    if (card) card.outerHTML = _renderQuizLoading();
    const category  = _quizAnswers.q1 || '';
    const intensity = _quizAnswers.q3 || 'any';
    const budget    = _quizAnswers.q4 || 'any';
    try {
        const res = await APIClient.get(
            `messages.php?action=quiz_recommend&category=${encodeURIComponent(category)}&intensity=${encodeURIComponent(intensity)}&budget=${encodeURIComponent(budget)}`
        );
        if (res && res.success) {
            // 恢復常駐卡，結果顯示在訊息串流中
            const qCard = document.getElementById('bot-quiz-card');
            if (qCard) qCard.outerHTML = _renderQuizInvitation();
            await _reloadBotMessageFeed();
        } else {
            throw new Error(res?.message || '取得推薦失敗');
        }
    } catch (e) {
        const errCard = document.getElementById('bot-quiz-card');
        if (errCard) errCard.outerHTML = `<div id="bot-quiz-card" class="quiz-card" style="display:flex;align-items:center;gap:10px;padding:10px 16px;">
            <span style="color:var(--color-danger,#dc2626);font-size:0.83rem;flex:1;">取得推薦時發生錯誤，請稍後再試。</span>
            <button onclick="startClubQuiz()" style="flex-shrink:0;background:#7c3aed;color:#fff;border:none;padding:5px 14px;border-radius:20px;cursor:pointer;font-size:0.8rem;font-weight:600;">重試</button>
        </div>`;
    }
}

async function _reloadBotMessageFeed() {
    const area = document.getElementById('messages-area');
    if (!area) return;
    try {
        const res = await APIClient.get('messages.php?action=bot_messages');
        if (!res?.success) return;
        const msgs = res.data.messages || [];
        const quizCard = document.getElementById('bot-quiz-card');
        const quizHtml = quizCard ? quizCard.outerHTML : _renderQuizInvitation();
        area.innerHTML = quizHtml + msgs.map(msg => renderBotCard(msg)).join('');
        area.scrollTop = area.scrollHeight;
    } catch (_) {}
}

function renderBotMessages(msgs, area) {
    const quizHtml = _renderQuizInvitation();
    if (msgs.length === 0) {
        area.innerHTML = quizHtml + `<div class="msg-placeholder" style="flex-direction:column;gap:12px;">
            <div style="font-size:3rem;">🤖</div>
            <div style="font-weight:700;font-size:1rem;color:var(--color-text-strong,#111827);">平台機器人</div>
            <div style="font-size:0.88rem;color:var(--color-text-muted,#6b7280);text-align:center;max-width:260px;line-height:1.6;">
                目前沒有 Bot 訊息。<br>申請加入社團通過後，驗證碼將在此顯示。
            </div>
        </div>`;
        return;
    }
    area.innerHTML = quizHtml + msgs.map(msg => renderBotCard(msg)).join('');
    area.scrollTop = area.scrollHeight;
}

function renderBotCard(msg) {
    const isVerification = msg.message_type === 'join_verification';
    const isRejected = msg.message_type === 'join_rejected';
    const meta = msg.meta || {};
    const time = PageUtils.timeAgo ? PageUtils.timeAgo(msg.created_at) : msg.created_at;
    const unreadDot = !msg.is_read ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-left:6px;vertical-align:middle;"></span>' : '';

    // 社團匹配結果
    if (msg.message_type === 'club_match_result') {
        const clubs = meta.clubs || [];
        const clubsHtml = clubs.length === 0
            ? `<p style="color:var(--color-text-muted,#6b7280);font-size:0.83rem;margin:0;">目前找不到符合條件的社團，可重新測驗調整條件。</p>`
            : clubs.map(c => `<div class="quiz-result-card">
                <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:3px;">
                    <span class="quiz-result-club-name">${PageUtils.escapeHtml(c.club_name)}</span>
                    <span class="quiz-result-category-badge">${PageUtils.escapeHtml(c.category_name || '')}</span>
                </div>
                ${c.description ? `<div class="quiz-result-description">${PageUtils.escapeHtml(c.description)}</div>` : ''}
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    ${c.meeting_day ? `<span class="quiz-result-meeting">📅 ${PageUtils.escapeHtml(c.meeting_day)}</span>` : '<span></span>'}
                    <a href="club-detail.html?id=${c.club_id}" class="quiz-result-link">查看社團 →</a>
                </div>
            </div>`).join('');
        return `<div class="quiz-result-header">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <span style="font-size:1rem;">🎯</span>
                <span class="quiz-result-header-title">社團適配結果</span>
                <span class="quiz-result-time">${time}</span>
            </div>
            ${clubsHtml}
        </div>`;
    }

    let cardBody = '';
    if (isVerification && meta.verification_code) {
        cardBody = `
            <p style="margin:0 0 10px;color:var(--color-text,#374151);">${PageUtils.escapeHtml(msg.content)}</p>
            <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:12px 16px;margin-bottom:10px;">
                <div style="font-size:0.78rem;color:#166534;margin-bottom:4px;font-weight:500;">社團：${PageUtils.escapeHtml(meta.club_name || '')}</div>
                <div style="font-size:1.5rem;letter-spacing:0.3em;font-weight:700;color:#15803d;font-family:monospace;">${PageUtils.escapeHtml(meta.verification_code)}</div>
            </div>
            ${meta.code_used
                ? '<span style="color:#166534;font-size:0.88rem;font-weight:500;">✅ 已完成驗證</span>'
                : `<div id="verify-area-${msg.message_id}" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <input id="verify-input-${msg.message_id}" type="text" placeholder="輸入驗證碼" maxlength="8"
                    style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:0.9rem;width:140px;font-family:monospace;text-transform:uppercase;"
                    oninput="this.value=this.value.toUpperCase()">
                <button class="btn btn-primary btn-sm" onclick="submitVerifyCode(${msg.message_id},${meta.club_id || 0})">驗證並加入</button>
            </div>`
            }`;
    } else if (isRejected) {
        cardBody = `<p style="margin:0;color:var(--color-text,#374151);">${PageUtils.escapeHtml(msg.content)}</p>`;
    } else {
        cardBody = `<p style="margin:0;color:var(--color-text,#374151);">${PageUtils.escapeHtml(msg.content)}</p>`;
    }

    const borderColor = isVerification ? '#86efac' : isRejected ? '#fca5a5' : '#e5e7eb';
    const iconBg = isVerification ? '#dcfce7' : isRejected ? '#fee2e2' : '#f3f4f6';
    const icon = isVerification ? '✅' : isRejected ? '❌' : '📢';

    return `<div style="display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid #f3f4f6;align-items:flex-start;">
        <div style="width:36px;height:36px;border-radius:50%;background:${iconBg};display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">${icon}</div>
        <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.88rem;margin-bottom:6px;color:var(--color-text-strong,#111827);">
                ${PageUtils.escapeHtml(msg.title)}${unreadDot}
            </div>
            ${cardBody}
            <div style="font-size:0.75rem;color:var(--color-text-muted,#9ca3af);margin-top:8px;">${time}</div>
        </div>
    </div>`;
}

function buildSuccessCard(clubName) {
    const name = PageUtils.escapeHtml(clubName || '社團');
    return `<div style="display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid #f3f4f6;align-items:flex-start;">
        <div style="width:36px;height:36px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">✅</div>
        <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.88rem;margin-bottom:6px;color:var(--color-text-strong,#111827);">你已成功加入${name}！</div>
            <p style="margin:0;color:var(--color-text,#374151);font-size:0.88rem;">歡迎成為社團成員，祝你參與愉快！</p>
            <div style="font-size:0.75rem;color:var(--color-text-muted,#9ca3af);margin-top:8px;">剛剛</div>
        </div>
    </div>`;
}

async function submitVerifyCode(msgId, clubId) {
    const input = document.getElementById(`verify-input-${msgId}`);
    const code = input ? input.value.trim().toUpperCase() : '';
    if (!code) { PageUtils.showAlert('請輸入驗證碼', 'warning'); return; }
    const areaEl = document.getElementById(`verify-area-${msgId}`);
    const btn = areaEl ? areaEl.querySelector('button') : null;
    if (btn) btn.disabled = true;
    try {
        const res = await APIClient.post('messages.php?action=verify_join_code', { club_id: clubId, code });
        if (res && res.success) {
            // Remove the input area
            if (areaEl) areaEl.remove();
            // Append success Bot card
            const area = document.getElementById('messages-area');
            if (area) {
                area.insertAdjacentHTML('beforeend', buildSuccessCard(res.data?.club_name));
                area.scrollTop = area.scrollHeight;
            }
        } else {
            PageUtils.showAlert(res?.message || '驗證失敗', 'error');
            if (btn) btn.disabled = false;
        }
    } catch (e) {
        PageUtils.showAlert('驗證失敗：' + e.message, 'error');
        if (btn) btn.disabled = false;
    }
}

const FJU_FORMS_BASE = 'https://activity.fju.edu.tw/DownloadSubLabelFileServlet?menuID=4&labelID=21';

const FJU_FORMS = [
    { category: '行政課程講義', icon: '📖', items: [
        { name: '114行政課程', url: 'https://www.canva.com/design/DAGxsZXQGJk/MjhmQWrs3VwpEml60hVVOQ/view', external: true },
    ]},
    { category: '活動申請資料', icon: '📝', items: [
        { name: '活動名冊',              url: FJU_FORMS_BASE + '&subLabelID=861&fileID=2' },
        { name: '車輛進出知會單 1140729', url: FJU_FORMS_BASE + '&subLabelID=861&fileID=3' },
        { name: '活動申請表（黃單）1141120', url: FJU_FORMS_BASE + '&subLabelID=861&fileID=4' },
    ]},
    { category: '辦理酒精飲品活動', icon: '🍺', items: [
        { name: '辦理提供酒精飲品活動辦理實施要點', url: FJU_FORMS_BASE + '&subLabelID=821&fileID=1' },
        { name: '酒精飲品活動辦理須知',            url: FJU_FORMS_BASE + '&subLabelID=821&fileID=2' },
    ]},
    { category: '臨時攤位申請', icon: '🏪', items: [
        { name: '附表一、攤位圖冊',                        url: FJU_FORMS_BASE + '&subLabelID=890&fileID=1' },
        { name: '附表二、一般臨時攤位申請表',              url: FJU_FORMS_BASE + '&subLabelID=890&fileID=2' },
        { name: '附表三、特別臨時攤位申請表',              url: FJU_FORMS_BASE + '&subLabelID=890&fileID=3' },
        { name: '附表四、臨時食品攤位衛生安全自主管理檢核表', url: FJU_FORMS_BASE + '&subLabelID=890&fileID=4' },
    ]},
    { category: '場地器材相關表格', icon: '🏟️', items: [
        { name: '例行活動場地核定登記表',        url: FJU_FORMS_BASE + '&subLabelID=863&fileID=3'  },
        { name: '旗幟插立申請表',               url: FJU_FORMS_BASE + '&subLabelID=863&fileID=18' },
        { name: '旗幟桿地圖',                   url: FJU_FORMS_BASE + '&subLabelID=863&fileID=19' },
        { name: '行政及教學單位場地借用申請表',  url: FJU_FORMS_BASE + '&subLabelID=863&fileID=20' },
        { name: '課指組器材一覽表 115.02.01',   url: FJU_FORMS_BASE + '&subLabelID=863&fileID=22' },
        { name: '課指組器材借用申請表 115.02.01', url: FJU_FORMS_BASE + '&subLabelID=863&fileID=23' },
        { name: '總務處場地申請表',             url: FJU_FORMS_BASE + '&subLabelID=863&fileID=24' },
        { name: '課指組場地收費一覽表',         url: FJU_FORMS_BASE + '&subLabelID=863&fileID=25' },
    ]},
    { category: '核銷相關表格', icon: '💰', items: [
        { name: '單據報銷清單',         url: FJU_FORMS_BASE + '&subLabelID=862&fileID=1'  },
        { name: '請款單',               url: FJU_FORMS_BASE + '&subLabelID=862&fileID=2'  },
        { name: '黏貼憑證用紙',         url: FJU_FORMS_BASE + '&subLabelID=862&fileID=3'  },
        { name: '非合格收據證明單',     url: FJU_FORMS_BASE + '&subLabelID=862&fileID=9'  },
        { name: '支出分攤表',           url: FJU_FORMS_BASE + '&subLabelID=862&fileID=10' },
        { name: '「餐費」明細表',       url: FJU_FORMS_BASE + '&subLabelID=862&fileID=12' },
        { name: '「住宿費」明細表',     url: FJU_FORMS_BASE + '&subLabelID=862&fileID=13' },
        { name: '「交通費」明細表',     url: FJU_FORMS_BASE + '&subLabelID=862&fileID=14' },
        { name: '「門票、場地費」明細表', url: FJU_FORMS_BASE + '&subLabelID=862&fileID=15' },
        { name: '個人領據',             url: FJU_FORMS_BASE + '&subLabelID=862&fileID=16' },
    ]},
    { category: '成果相關表格', icon: '📊', items: [
        { name: '學生活動成果報告書', url: FJU_FORMS_BASE + '&subLabelID=864&fileID=1' },
    ]},
    { category: '相關範例', icon: '📄', items: [
        { name: '函稿-大專體總',         url: FJU_FORMS_BASE + '&subLabelID=865&fileID=14' },
        { name: '函稿-民間團體經費',     url: FJU_FORMS_BASE + '&subLabelID=865&fileID=15' },
        { name: '函稿-服務隊行政協助',   url: FJU_FORMS_BASE + '&subLabelID=865&fileID=16' },
        { name: '函稿-門票優待',         url: FJU_FORMS_BASE + '&subLabelID=865&fileID=17' },
        { name: '函稿-參賽公文',         url: FJU_FORMS_BASE + '&subLabelID=865&fileID=18' },
        { name: '企畫書-服務隊',         url: FJU_FORMS_BASE + '&subLabelID=865&fileID=19' },
        { name: '企畫書-週系列',         url: FJU_FORMS_BASE + '&subLabelID=865&fileID=20' },
        { name: '企畫書-體育競賽',       url: FJU_FORMS_BASE + '&subLabelID=865&fileID=21' },
        { name: '開會通知單',            url: FJU_FORMS_BASE + '&subLabelID=865&fileID=22' },
        { name: '會議議程格式',          url: FJU_FORMS_BASE + '&subLabelID=865&fileID=23' },
        { name: '會議紀錄格式',          url: FJU_FORMS_BASE + '&subLabelID=865&fileID=24' },
        { name: '報告書-經費取消（新）', url: FJU_FORMS_BASE + '&subLabelID=865&fileID=26' },
        { name: '報告書-經費轉移（新）', url: FJU_FORMS_BASE + '&subLabelID=865&fileID=27' },
    ]},
    { category: '負責人證書補發申請', icon: '🪪', items: [
        { name: '自治組織或社團負責人證書補發換發申請表', url: FJU_FORMS_BASE + '&subLabelID=738&fileID=1' },
    ]},
    { category: '用火相關參考資訊', icon: '🔥', items: [
        { name: '輔仁大學學生活動用火安全細則',             url: FJU_FORMS_BASE + '&subLabelID=526&fileID=1' },
        { name: '輔仁大學學生活動用火確認表（光火藝術社範例）', url: FJU_FORMS_BASE + '&subLabelID=526&fileID=2' },
    ]},
    { category: '校內申請免徵娛樂稅', icon: '🧾', items: [
        { name: '校內申請免徵娛樂稅證明文件', url: FJU_FORMS_BASE + '&subLabelID=557&fileID=1' },
    ]},
    { category: '紙本交接資料', icon: '📦', items: [
        { name: '紙本交接檔案（odt 格式）',  url: FJU_FORMS_BASE + '&subLabelID=609&fileID=1' },
        { name: '紙本交接檔案（docx 格式）', url: FJU_FORMS_BASE + '&subLabelID=609&fileID=2' },
    ]},
    { category: '電子交接資料', icon: '💻', items: [
        { name: '電子交接資料填寫網址',         url: 'https://forms.gle/s8jb4kwS1JyPBhLd6', external: true },
        { name: '電子交接資料上傳檔案之格式連結', url: 'https://reurl.cc/Z423EW', external: true },
    ]},
];

async function openFormsPanel() {
    deactivateAllSidebarItems();
    document.getElementById('forms-item').classList.add('msg-bot-item--active');

    const panelAvatar = document.getElementById('panel-avatar');
    const panelName   = document.getElementById('panel-name');

    panelAvatar.innerHTML = '📋';
    panelAvatar.style.background = 'linear-gradient(135deg,#6366f1,#4f46e5)';
    panelAvatar.style.fontSize = '1.1rem';
    panelName.textContent = '課指組表單下載';
    document.getElementById('panel-head').style.display = '';
    document.getElementById('send-bar').style.display = 'none';
    showMobilePanel();

    const area = document.getElementById('messages-area');
    area.innerHTML = '<div class="msg-placeholder"><div class="msg-spinner"></div></div>';

    let formsData = null;
    let fromCache = false;
    try {
        const res = await APIClient.get('messages.php?action=fju_forms');
        if (res && res.success && Array.isArray(res.data?.forms) && res.data.forms.length > 0) {
            formsData = res.data.forms;
            fromCache = res.data.from_cache === true;
        }
    } catch (_) { /* fall through to static fallback */ }

    if (!formsData) formsData = FJU_FORMS;

    _renderFormsPanel(area, formsData, fromCache);
}

function _renderFormsPanel(area, forms, fromCache) {
    const cacheNote = fromCache
        ? '' : '<span style="font-size:0.72rem;color:var(--color-primary-600,#2563eb);margin-left:6px;">● 即時更新</span>';
    area.innerHTML = `
        <div style="padding:16px 0 8px;">
            <div style="padding:0 16px 12px;font-size:0.8rem;color:var(--color-text-muted,#6b7280);display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
                資料來源：<a href="https://activity.fju.edu.tw/resource.jsp?labelID=21" target="_blank" rel="noopener"
                    style="color:var(--color-primary-600,#2563eb);text-decoration:none;">輔大課外活動指導組</a>${cacheNote}
            </div>
            ${forms.map(section => `
                <div class="forms-panel-section">
                    <div class="forms-panel-section-title">${section.icon} ${PageUtils.escapeHtml(section.category)}</div>
                    ${section.items.map(item => `
                        <a class="forms-panel-link" href="${PageUtils.escapeHtml(item.url)}"
                            target="_blank" rel="noopener noreferrer"
                            title="${PageUtils.escapeHtml(item.name)}">
                            <span class="forms-panel-icon">${item.external ? '🔗' : '⬇️'}</span>
                            <span>${PageUtils.escapeHtml(item.name)}</span>
                        </a>
                    `).join('')}
                </div>
            `).join('')}
        </div>`;
    area.scrollTop = 0;
}

async function openNotepad() {
    deactivateAllSidebarItems();
    _notepadMode = true;
    document.getElementById('notepad-item').classList.add('msg-bot-item--active');

    const panelAvatar = document.getElementById('panel-avatar');
    const panelName  = document.getElementById('panel-name');
    const input      = document.getElementById('msg-input');

    panelAvatar.innerHTML = '📝';
    panelAvatar.style.background = 'linear-gradient(135deg,#f59e0b,#d97706)';
    panelAvatar.style.fontSize = '1.1rem';
    panelName.textContent = '記事本';
    document.getElementById('panel-head').style.display = '';
    document.getElementById('send-bar').style.display = '';
    input.placeholder = '寫下任何想法…';
    showMobilePanel();

    await loadNoteMessages();
}

async function loadNoteMessages() {
    const area = document.getElementById('messages-area');
    area.innerHTML = '<div class="msg-placeholder"><div class="msg-spinner"></div></div>';
    try {
        const res = await APIClient.get('messages.php?action=note_messages');
        const msgs = (res && res.success && res.data && res.data.messages) ? res.data.messages : [];
        if (msgs.length === 0) {
            area.innerHTML = `<div class="msg-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span>開始記錄你的想法</span>
            </div>`;
            return;
        }
        area.innerHTML = msgs.map(m => {
            const d = new Date(String(m.created_at || '').replace(' ', 'T'));
            const t = isNaN(d) ? '' : d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
            const nid = Number(m.note_id);
            return `<div class="msg-bubble-row msg-bubble-row--mine">
                <div class="msg-bubble-wrap">
                    <button class="msg-menu-btn" onclick="toggleMsgMenu('note-${nid}')">⋯</button>
                    <div class="msg-menu-popup" id="msg-menu-note-${nid}">
                        <button class="msg-menu-item msg-menu-item--danger" onclick="recallNoteMessage(${nid});closeMsgMenu()">🗑 刪除</button>
                    </div>
                    <div class="msg-bubble msg-bubble--mine">${PageUtils.escapeHtml(m.content)}</div>
                </div>
                <span class="msg-bubble-time">${t}</span>
            </div>`;
        }).join('');
        area.scrollTop = area.scrollHeight;
    } catch (e) {
        area.innerHTML = '<div class="msg-placeholder"><span style="color:var(--color-text-muted);">載入失敗，請重試</span></div>';
    }
}

async function openConversation(userId, name, avatarPath) {
    currentConvUserId = userId;
    _notepadMode = false;

    // Deactivate bot/notepad items
    document.getElementById('bot-item').classList.remove('msg-bot-item--active');
    document.getElementById('notepad-item').classList.remove('msg-bot-item--active');

    // update panel header
    const panelHead = document.getElementById('panel-head');
    const panelAvatar = document.getElementById('panel-avatar');
    const panelName = document.getElementById('panel-name');
    const sendBar = document.getElementById('send-bar');

    panelAvatar.style.background = '';
    panelAvatar.style.fontSize = '';
    setAvatarEl(panelAvatar, name, avatarPath);
    panelName.textContent = name || '';
    panelHead.style.display = '';
    sendBar.style.display = '';

    const input = document.getElementById('msg-input');
    input.value = '';
    input.style.height = '';
    input.placeholder = '輸入訊息...';
    showMobilePanel();

    // highlight active conv
    document.querySelectorAll('.msg-conv-item').forEach(el => el.classList.remove('msg-conv-item--active'));
    const items = document.querySelectorAll('.msg-conv-item');
    items.forEach(el => {
        if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(`openConversation(${userId},`)) {
            el.classList.add('msg-conv-item--active');
        }
    });

    await loadThread(userId);

    clearInterval(pollTimer);
    pollTimer = setInterval(() => loadThread(userId, true), 3000);
}

async function loadThread(userId, isPoll) {
    try {
        const res = await APIClient.get(`messages.php?action=thread&user_id=${userId}`);
        if (!res || !res.success) return;

        const area = document.getElementById('messages-area');
        const wasAtBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 60;

        renderMessages(res.data.messages || [], res.data.other_user);

        if (!isPoll || wasAtBottom) {
            area.scrollTop = area.scrollHeight;
        }

        if (!isPoll) loadConversations();
    } catch (e) {
        console.error('loadThread', e);
    }
}

const EMOJI_LIST = ['👍','❤️','😂','😮','😢','👏'];

function emojiButtons(msgId, reactions) {
    const myEmojis = new Set(
        (reactions || []).filter(r => r.user_ids && r.user_ids.includes(currentUserId)).map(r => r.emoji)
    );
    return EMOJI_LIST.map(e =>
        `<button class="msg-menu-emoji-btn${myEmojis.has(e) ? ' active' : ''}" onclick="toggleReaction(${msgId},'${e}')">${e}</button>`
    ).join('');
}

function toggleMsgMenu(key) {
    const popup = document.getElementById(`msg-menu-${key}`);
    if (!popup) return;
    if (_openMenuMsgId !== null && _openMenuMsgId !== key) closeMsgMenu();
    const willOpen = !popup.classList.contains('open');
    if (willOpen) {
        const container = document.querySelector('.msg-messages');
        const wrap = popup.closest('.msg-bubble-wrap');
        if (container && wrap) {
            const cRect = container.getBoundingClientRect();
            const wRect = wrap.getBoundingClientRect();
            popup.classList.toggle('popup-up', cRect.bottom - wRect.bottom < 220);
        }
    }
    popup.classList.toggle('open');
    _openMenuMsgId = popup.classList.contains('open') ? key : null;
}

function closeMsgMenu() {
    if (_openMenuMsgId !== null) {
        document.getElementById(`msg-menu-${_openMenuMsgId}`)?.classList.remove('open');
        _openMenuMsgId = null;
    }
}

document.addEventListener('click', (e) => {
    if (_openMenuMsgId && !e.target.closest('.msg-bubble-wrap')) closeMsgMenu();
});

async function toggleReaction(msgId, emoji) {
    closeMsgMenu();
    const res = await APIClient.post('messages.php?action=toggle_reaction', { message_id: msgId, emoji });
    if (res && res.success) await loadThread(currentConvUserId, true);
}

function startReply(msgId, content, senderName) {
    _replyTo = { msgId, content, senderName };
    document.getElementById('reply-bar-name').textContent = senderName;
    document.getElementById('reply-bar-text').textContent = content.slice(0, 80);
    document.getElementById('reply-bar').classList.add('active');
    document.getElementById('msg-input').focus();
}

function cancelReply() {
    _replyTo = null;
    document.getElementById('reply-bar').classList.remove('active');
}

function renderMessages(messages, otherUser) {
    const area = document.getElementById('messages-area');
    if (!messages.length) {
        const name = otherUser ? otherUser.name : '';
        area.innerHTML = `<div class="msg-placeholder"><span>和 ${PageUtils.escapeHtml(name)} 開始對話吧！</span></div>`;
        return;
    }

    let html = '';
    let lastDate = '';
    messages.forEach(m => {
        if (m.is_recalled) return;
        const isMine = Number(m.sender_id) === currentUserId;
        const d = new Date(String(m.created_at || '').replace(' ', 'T'));
        const dateStr = isNaN(d) ? '' : d.toLocaleDateString('zh-TW');
        if (dateStr && dateStr !== lastDate) {
            lastDate = dateStr;
            html += `<div class="msg-date-divider"><span>${dateStr}</span></div>`;
        }
        const timeStr = isNaN(d) ? '' : d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        const avatarHtml = m.sender_avatar
            ? `<img src="${PageUtils.escapeAttribute(PageUtils.resolveMediaUrl(m.sender_avatar))}" alt="">`
            : PageUtils.escapeHtml(String(m.sender_name || '?').charAt(0).toUpperCase());

        const replyQuote = m.reply_to_id
            ? `<div class="msg-reply-quote"><span class="msg-reply-quote__name">${PageUtils.escapeHtml(m.reply_sender_name || '')}</span><span class="msg-reply-quote__text">${PageUtils.escapeHtml((m.reply_content || '').slice(0, 80))}</span></div>`
            : '';

        const reactions = m.reactions || [];
        const reactionsHtml = reactions.map(r => {
            const mine = r.user_ids && r.user_ids.includes(currentUserId);
            return `<span class="msg-reaction-pill${mine ? ' msg-reaction-pill--mine' : ''}" onclick="toggleReaction(${m.message_id},'${r.emoji}')">${r.emoji} ${r.count}</span>`;
        }).join('');
        const reactionsRow = reactionsHtml ? `<div class="msg-reactions-row">${reactionsHtml}</div>` : '';

        const menuId = `msg-menu-${m.message_id}`;
        const replyBtn = `<button class="msg-menu-item" onclick="startReply(${m.message_id},'${PageUtils.escapeAttribute(m.content || '')}','${PageUtils.escapeAttribute(m.sender_name || '')}');closeMsgMenu()">↩ 回復</button>`;
        const menuItems = isMine
            ? `<div class="msg-menu-emoji-row">${emojiButtons(m.message_id, reactions)}</div>${replyBtn}<button class="msg-menu-item msg-menu-item--danger" onclick="recallMessage(${m.message_id});closeMsgMenu()">🗑 收回</button>`
            : `<div class="msg-menu-emoji-row">${emojiButtons(m.message_id, reactions)}</div>${replyBtn}`;

        const bubbleClass = `msg-bubble${isMine ? ' msg-bubble--mine' : ''}`;
        html += `<div class="msg-bubble-row${isMine ? ' msg-bubble-row--mine' : ''}">
            <div class="msg-bubble-avatar">${avatarHtml}</div>
            <div class="msg-bubble-wrap">
                <button class="msg-menu-btn" onclick="toggleMsgMenu(${m.message_id})">⋯</button>
                <div class="msg-menu-popup" id="${menuId}">${menuItems}</div>
                <div class="${bubbleClass}">${replyQuote}${PageUtils.escapeHtml(m.content || '')}</div>
                ${reactionsRow}
            </div>
            <span class="msg-bubble-time">${timeStr}</span>
        </div>`;
    });
    area.innerHTML = html;
}

async function sendMessage() {
    const input = document.getElementById('msg-input');
    const content = input.value.trim();
    if (!content) return;

    if (_notepadMode) {
        const btn = document.getElementById('send-btn');
        btn.disabled = true;
        try {
            const res = await APIClient.post('messages.php?action=send_note_message', { content });
            if (res && res.success) {
                input.value = '';
                input.style.height = '';
                await loadNoteMessages();
            } else {
                PageUtils.showAlert(res?.message || '傳送失敗', 'error');
            }
        } catch (e) {
            PageUtils.showAlert('傳送失敗', 'error');
        } finally {
            btn.disabled = false;
        }
        return;
    }

    if (!currentConvUserId) return;

    const btn = document.getElementById('send-btn');
    btn.disabled = true;
    try {
        const payload = { receiver_id: currentConvUserId, content };
        if (_replyTo) payload.reply_to_id = _replyTo.msgId;
        const res = await APIClient.post('messages.php?action=send', payload);
        if (res && res.success) {
            input.value = '';
            input.style.height = '';
            cancelReply();
            await loadThread(currentConvUserId);
            const area = document.getElementById('messages-area');
            area.scrollTop = area.scrollHeight;
            loadConversations();
        } else {
            PageUtils.showAlert(res?.message || '傳送失敗', 'error');
        }
    } catch (e) {
        PageUtils.showAlert('傳送失敗', 'error');
    } finally {
        btn.disabled = false;
    }
}

async function recallMessage(messageId) {
    if (!confirm('確定要收回這則訊息嗎？')) return;
    try {
        const res = await APIClient.post('messages.php?action=recall_message', { message_id: messageId });
        if (res && res.success) {
            await loadThread(currentConvUserId, true);
        } else {
            PageUtils.showAlert(res?.message || '收回失敗', 'error');
        }
    } catch (e) {
        PageUtils.showAlert('收回失敗', 'error');
    }
}

async function recallNoteMessage(noteId) {
    if (!confirm('確定要刪除這則記事嗎？')) return;
    try {
        const res = await APIClient.post('messages.php?action=recall_note_message', { note_id: noteId });
        if (res && res.success) {
            await loadNoteMessages();
        } else {
            PageUtils.showAlert(res?.message || '刪除失敗', 'error');
        }
    } catch (e) {
        PageUtils.showAlert('刪除失敗', 'error');
    }
}

// textarea auto-resize + Enter to send
function initMsgInput() {
    const input = document.getElementById('msg-input');
    input.addEventListener('input', () => {
        input.style.height = '';
        input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// search modal
function openSearchModal() {
    document.getElementById('search-modal').removeAttribute('hidden');
    document.getElementById('search-input').focus();
    document.getElementById('search-results').innerHTML = '';
}

function closeSearchModal() {
    document.getElementById('search-modal').setAttribute('hidden', '');
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearchModal();
});

async function doSearch() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return;
    const resultsEl = document.getElementById('search-results');
    resultsEl.innerHTML = '<div style="color:var(--color-text-muted);font-size:0.85rem;padding:8px 0;">搜尋中...</div>';
    try {
        const res = await APIClient.get(`messages.php?action=search_user&q=${encodeURIComponent(q)}`);
        const users = (res && res.success && res.data && res.data.users) ? res.data.users : [];
        if (!users.length) {
            resultsEl.innerHTML = '<div style="color:var(--color-text-muted);font-size:0.85rem;padding:8px 0;">找不到用戶</div>';
            return;
        }
        resultsEl.innerHTML = users.map(u => {
            const initial = String(u.name || '?').charAt(0).toUpperCase();
            const avatarHtml = u.avatar_path
                ? `<img src="${PageUtils.escapeAttribute(PageUtils.resolveMediaUrl(u.avatar_path))}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                : PageUtils.escapeHtml(initial);
            return `<div class="msg-user-result" onclick="startConversation(${Number(u.user_id)}, '${PageUtils.escapeAttribute(u.name || '')}', '${PageUtils.escapeAttribute(u.avatar_path || '')}')">
                <div class="msg-conv-avatar" style="width:36px;height:36px;flex-shrink:0;">${avatarHtml}</div>
                <div>
                    <div class="msg-user-result-name">${PageUtils.escapeHtml(u.name || '')}</div>
                    <div class="msg-user-result-id">ID: ${Number(u.user_id)}</div>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        resultsEl.innerHTML = '<div style="color:var(--color-text-muted);font-size:0.85rem;padding:8px 0;">搜尋失敗</div>';
    }
}

document.getElementById('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
});

function startConversation(userId, name, avatarPath) {
    closeSearchModal();
    openConversation(userId, name, avatarPath);
    loadConversations();
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

    const currentUser = StorageUtils.getUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    currentUserId = Number(currentUser.user_id || currentUser.id || 0);

    if (currentUser.role === 'club_admin' || currentUser.role === 'platform_admin') {
        document.getElementById('forms-item').style.display = '';
    }

    initMsgInput();
    await loadConversations();
    loadBotUnreadStatus();

    // Check if opening a specific conversation from URL param
    const params = new URLSearchParams(window.location.search);
    const targetUserId = Number(params.get('user_id') || 0);
    const targetName = decodeURIComponent(params.get('name') || '');
    if (params.get('open') === 'bot') {
        openBotConversation();
    } else if (targetUserId > 0) {
        openConversation(targetUserId, targetName, '');
    }
});

window.addEventListener('beforeunload', () => clearInterval(pollTimer));
