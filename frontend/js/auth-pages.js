async function initLogoCarousel() {
    try {
        const res = await APIClient.get('clubs.php');
        const all = (res.success && res.data && res.data.clubs) ? res.data.clubs : [];
        if (!all.length) return;

        // 有上傳 logo 的優先，兩群各自洗牌後合併取 12 張
        const shuffle = arr => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };
        const withLogo    = shuffle(all.filter(c => c.logo_path));
        const withoutLogo = shuffle(all.filter(c => !c.logo_path));
        const merged = [...withLogo, ...withoutLogo];

        const TARGET = 12;
        const selected = [];
        if (!merged.length) return;
        while (selected.length < TARGET) {
            selected.push(...merged.slice(0, TARGET - selected.length));
        }

        const cols = [
            document.getElementById('logo-col-1'),
            document.getElementById('logo-col-2')
        ];
        const perCol = TARGET / cols.length; // 6

        cols.forEach((col, ci) => {
            if (!col) return;
            const half = selected.slice(ci * perCol, (ci + 1) * perCol);
            // 每欄 6 張重複一次 = 12 張；rAF 循環到 halfH 後 wrap 回 0
            const doubled = [...half, ...half];
            col.innerHTML = doubled.map(club => {
                const initial = PageUtils.escapeHtml((club.club_name || '社').charAt(0));
                if (club.logo_path) {
                    const url = PageUtils.escapeAttribute(PageUtils.resolveMediaUrl(club.logo_path));
                    const name = PageUtils.escapeAttribute(club.club_name || '');
                    return `<div class="logo-item" data-initial="${initial}"><img src="${url}" alt="${name}" loading="lazy"></div>`;
                }
                return `<div class="logo-item">${initial}</div>`;
            }).join('');
            col.querySelectorAll('.logo-item img').forEach(img => {
                img.addEventListener('error', function () {
                    this.closest('.logo-item').textContent = this.closest('.logo-item').dataset.initial || '社';
                });
            });

            // col-0 向下捲（offset 0→halfH），col-1 向上捲（offset halfH→0）
            const durationMs = ci === 0 ? 80000 : 96000;
            const goingDown  = ci === 0;
            _startColScroll(col, durationMs, goingDown);
        });
    } catch (e) { /* carousel is decorative — fail silently */ }
}

function _startColScroll(col, durationMs, goingDown) {
    // 以 requestAnimationFrame 做真正無縫的無限循環
    // offset 代表已捲過的距離（px），到達 halfH 後 wrap 回 0
    let offset  = 0;
    let lastTs  = null;

    // 向上捲的欄位：從中點開始，讓兩欄不同步，避免鏡像感
    if (!goingDown) offset = 0; // 同樣從 0 開始，但方向相反

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) lastTs = null; // 頁面背景後重置，避免回來時大跳
    });

    function tick(ts) {
        col._rafId = requestAnimationFrame(tick);
        const halfH = col.scrollHeight / 2;
        if (!halfH) return;

        if (lastTs !== null) {
            const delta = (ts - lastTs) / durationMs * halfH;
            offset = (offset + delta) % halfH;
        }
        lastTs = ts;

        // goingDown: content 往上移 → translateY(-offset)
        // goingUp:   content 往下移 → translateY(-(halfH - offset))
        const y = goingDown ? -offset : -(halfH - offset);
        col.style.transform = `translateY(${y}px)`;
    }

    col._rafId = requestAnimationFrame(tick);
}

function initGoogleOAuth({ formSelector, loadingText, failText, onSuccess }) {
    (async () => {
        let clientId;
        try {
            const res = await APIClient.get('oauth.php?action=google_client_id');
            if (!res || !res.success || !res.data || !res.data.client_id) {
                const s = document.getElementById('google-signin-section');
                if (s) s.style.display = 'none';
                return;
            }
            clientId = res.data.client_id;
        } catch (e) {
            const s = document.getElementById('google-signin-section');
            if (s) s.style.display = 'none';
            return;
        }

        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });

        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCallback,
            ux_mode: 'popup',
            cancel_on_tap_outside: true,
        });

        // 疊合技巧：自訂按鈕 #google-signin-btn 在底層顯示（與其他按鈕同款），
        // Google 官方 renderButton 生成的原生按鈕透明疊在上層接收點擊，
        // 兼顧「外觀一致」與「renderButton 可靠彈窗」（避免 One Tap prompt() 被瀏覽器抑制）。
        const customBtn = document.getElementById('google-signin-btn');
        if (customBtn && customBtn.parentNode && window.google && google.accounts && google.accounts.id.renderButton) {
            const wrap = document.createElement('div');
            wrap.className = 'gsi-overlay-wrap';
            customBtn.parentNode.insertBefore(wrap, customBtn);
            wrap.appendChild(customBtn);

            const overlay = document.createElement('div');
            overlay.id = 'google-btn-container';
            overlay.className = 'gsi-overlay';
            wrap.appendChild(overlay);

            const renderOverlay = () => {
                overlay.innerHTML = '';
                const raw = Math.round(customBtn.offsetWidth) || 300;
                const width = Math.max(200, Math.min(raw, 400)); // renderButton width 限 400
                google.accounts.id.renderButton(overlay, {
                    theme: 'outline',
                    size: 'large',
                    type: 'standard',
                    text: 'signin_with',
                    shape: 'pill',
                    locale: 'zh_TW',
                    width,
                });
            };

            try {
                renderOverlay();
                // 視窗縮放時重新渲染，維持與底層按鈕等寬
                let resizeTimer;
                window.addEventListener('resize', () => {
                    clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(renderOverlay, 200);
                });
            } catch (e) {
                // renderButton 失敗：拆掉疊合、露出自訂按鈕並改用 One Tap
                wrap.parentNode.insertBefore(customBtn, wrap);
                wrap.remove();
                customBtn.addEventListener('click', () => google.accounts.id.prompt());
            }
        } else if (customBtn) {
            customBtn.addEventListener('click', () => google.accounts.id.prompt());
        }

        async function handleGoogleCallback(googleResponse) {
            const credential = googleResponse.credential;
            if (!credential) {
                PageUtils.showAlert('Google 登入失敗，請重試', 'error');
                return;
            }

            const submitBtn = document.querySelector(`${formSelector} button[type="submit"]`);
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = loadingText;
            }

            try {
                const response = await APIClient.post('oauth.php?action=google_verify', { credential });
                if (response && response.success) {
                    StorageUtils.setUser(response.data);
                    PageUtils.showAlert('登入成功，正在重定向...', 'success');
                    setTimeout(() => onSuccess(response.data), 1000);
                } else {
                    const msg = (response && response.message) ? response.message : 'Google 登入失敗，請重試';
                    PageUtils.showAlert(msg, 'error');
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = failText; }
                }
            } catch (err) {
                console.error('Google OAuth error:', err);
                PageUtils.showAlert('Google 登入失敗，請稍後重試', 'error');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = failText; }
            }
        }
    })().catch(() => {});
}
