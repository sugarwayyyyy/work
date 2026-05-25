/**
 * E2E 測試：私訊功能 (PM) + 入社驗證碼 (VC)
 *
 * PM-01 ~ PM-07：私訊 UI 流程測試
 * VC-01 ~ VC-03：入社驗證碼申請→批准→驗證流程
 */

'use strict';
const { test, expect } = require('@playwright/test');
const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE_URL = 'http://localhost:8000';

const STUDENT   = { email: 'student@univ.edu',   password: 'Test123456', name: '一般學生測試員' };
const CLUB_ADMIN = { email: 'clubadmin@univ.edu', password: 'Test123456', name: '社團幹部測試員' };

function resolvePhp() {
  const candidates = [
    'C:\\xampp\\php\\php.exe',
    'C:\\AppServ\\php8\\php.exe',
    'C:\\AppServ\\php7\\php.exe',
  ];
  for (const p of candidates) { if (fs.existsSync(p)) return p; }
  return 'php';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/pages/login.html`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL(url => !url.pathname.endsWith('/pages/login.html'), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function apiPostJson(page, endpoint, payload) {
  return await page.evaluate(async ({ endpointPath, body }) => {
    const csrfHeaders = await window.APIClient.getCSRFHeaders();
    const response = await fetch(`${window.APIClient.getBaseUrl()}/${endpointPath}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...csrfHeaders,
      },
      body: JSON.stringify(body || {}),
    });
    let json = null;
    try { json = await response.json(); } catch (_) { json = { success: false }; }
    return { status: response.status, body: json };
  }, { endpointPath: endpoint, body: payload });
}

async function navigateToMessages(page) {
  await page.goto(`${BASE_URL}/pages/messages.html`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.msg-sidebar')).toBeVisible({ timeout: 10000 });
}

/** 搜尋用戶並開啟對話（透過新增對話 modal） */
async function openConversationWith(page, searchQuery) {
  await page.click('.msg-new-btn');
  await expect(page.locator('#search-modal')).not.toHaveAttribute('hidden', { timeout: 5000 });
  await page.fill('#search-input', searchQuery);
  await page.click('.msg-modal button:has-text("搜尋")');
  await expect(page.locator('#search-results .msg-user-result').first()).toBeVisible({ timeout: 8000 });
  await page.locator('#search-results .msg-user-result').first().click();
  await expect(page.locator('#msg-input')).toBeVisible({ timeout: 8000 });
}

/** 傳送訊息並等待 send API 回應 */
async function sendPrivateMessage(page, text) {
  await page.fill('#msg-input', text);
  const [res] = await Promise.all([
    page.waitForResponse(r => r.url().includes('messages.php') && r.url().includes('action=send'), { timeout: 12000 }),
    page.click('#send-btn'),
  ]);
  return res;
}

// ─── 私訊功能 ────────────────────────────────────────────────────────────────

test.describe('私訊功能', () => {

  test('PM-01 私訊頁面可正常加載', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await navigateToMessages(page);
    await expect(page.locator('#notepad-item')).toBeVisible();
    await expect(page.locator('#bot-item')).toBeVisible();
    await expect(page.locator('.msg-panel')).toBeVisible();
  });

  test('PM-02 搜尋用戶並開啟對話', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await navigateToMessages(page);
    await openConversationWith(page, '幹部');
    await expect(page.locator('#panel-name')).toContainText('社團幹部測試員', { timeout: 8000 });
    await expect(page.locator('#send-bar')).toBeVisible();
  });

  test('PM-03 可傳送訊息並顯示在泡泡中', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await navigateToMessages(page);
    await openConversationWith(page, '幹部');

    const msgText = 'PM-03 自動化測試訊息';
    await sendPrivateMessage(page, msgText);
    await expect(
      page.locator('.msg-bubble--mine').filter({ hasText: msgText }).last()
    ).toBeVisible({ timeout: 8000 });
  });

  test('PM-04 可收回自己的訊息', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await navigateToMessages(page);
    await openConversationWith(page, '幹部');

    const msgText = 'PM-04 收回測試';
    await sendPrivateMessage(page, msgText);
    const bubble = page.locator('.msg-bubble--mine').filter({ hasText: msgText }).last();
    await expect(bubble).toBeVisible({ timeout: 8000 });

    // 找到包含此 bubble 的 row，點 ⋯
    const row = page.locator('.msg-bubble-row').filter({
      has: page.locator('.msg-bubble--mine').filter({ hasText: msgText }),
    }).last();
    await row.locator('.msg-menu-btn').click();
    await expect(page.locator('.msg-menu-popup.open')).toBeVisible({ timeout: 5000 });

    // 點收回（recallMessage 有 confirm 對話框，預先接受）
    page.once('dialog', d => d.accept());
    await Promise.all([
      page.waitForResponse(r => r.url().includes('action=recall_message'), { timeout: 12000 }),
      page.locator('.msg-menu-popup.open .msg-menu-item--danger').click(),
    ]);

    await expect(
      page.locator('.msg-bubble--mine').filter({ hasText: msgText })
    ).toHaveCount(0, { timeout: 8000 });
  });

  test('PM-05 可回復訊息並顯示引用塊', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await navigateToMessages(page);
    await openConversationWith(page, '幹部');

    // 先送出要被引用的訊息
    const origText = 'PM-05 原始訊息';
    await sendPrivateMessage(page, origText);
    const origBubble = page.locator('.msg-bubble--mine').filter({ hasText: origText }).last();
    await expect(origBubble).toBeVisible({ timeout: 8000 });

    // 開啟選單並點回復
    const row = page.locator('.msg-bubble-row').filter({
      has: page.locator('.msg-bubble--mine').filter({ hasText: origText }),
    }).last();
    await row.locator('.msg-menu-btn').click();
    await expect(page.locator('.msg-menu-popup.open')).toBeVisible({ timeout: 5000 });
    await page.locator('.msg-menu-popup.open .msg-menu-item').filter({ hasText: '回復' }).click();

    // reply bar 應出現且有內容
    await expect(page.locator('#reply-bar')).toHaveClass(/active/, { timeout: 5000 });
    await expect(page.locator('#reply-bar-name')).not.toBeEmpty();

    // 傳送回復
    const replyText = 'PM-05 回復訊息';
    await sendPrivateMessage(page, replyText);

    // 新訊息泡泡內應有引用塊
    const replyBubble = page.locator('.msg-bubble--mine').filter({ hasText: replyText }).last();
    await expect(replyBubble).toBeVisible({ timeout: 8000 });
    await expect(replyBubble.locator('.msg-reply-quote__name')).not.toBeEmpty();
    await expect(replyBubble.locator('.msg-reply-quote__text')).toContainText(origText.slice(0, 30));
  });

  test('PM-06 可對訊息新增 emoji 反應', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await navigateToMessages(page);
    await openConversationWith(page, '幹部');

    const msgText = 'PM-06 emoji 反應測試';
    await sendPrivateMessage(page, msgText);
    const bubble = page.locator('.msg-bubble--mine').filter({ hasText: msgText }).last();
    await expect(bubble).toBeVisible({ timeout: 8000 });

    const row = page.locator('.msg-bubble-row').filter({
      has: page.locator('.msg-bubble--mine').filter({ hasText: msgText }),
    }).last();
    await row.locator('.msg-menu-btn').click();
    await expect(page.locator('.msg-menu-popup.open')).toBeVisible({ timeout: 5000 });

    const emojiBtn = page.locator('.msg-menu-popup.open .msg-menu-emoji-btn').first();
    await Promise.all([
      page.waitForResponse(r => r.url().includes('action=toggle_reaction'), { timeout: 12000 }),
      emojiBtn.click(),
    ]);

    // Reaction pill 應出現在同一個 bubble-wrap 中
    const wrap = page.locator('.msg-bubble-wrap').filter({
      has: page.locator('.msg-bubble--mine').filter({ hasText: msgText }),
    }).last();
    await expect(wrap.locator('.msg-reaction-pill')).toBeVisible({ timeout: 8000 });
  });

  test('PM-07 記事本可傳送與刪除訊息', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await navigateToMessages(page);

    // 開啟記事本
    await page.click('#notepad-item');
    await expect(page.locator('#msg-input')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#send-bar')).toBeVisible({ timeout: 5000 });

    // 傳送記事本訊息
    const noteText = 'PM-07 記事本自動測試';
    await page.fill('#msg-input', noteText);
    const [res] = await Promise.all([
      page.waitForResponse(r => r.url().includes('action=send_note_message'), { timeout: 12000 }),
      page.click('#send-btn'),
    ]);
    expect((await res.json()).success).toBe(true);

    // 訊息出現在區域中
    await expect(
      page.locator('#messages-area .msg-bubble').filter({ hasText: noteText }).last()
    ).toBeVisible({ timeout: 8000 });

    // 點 ⋯ → 刪除
    const noteRow = page.locator('#messages-area .msg-bubble-row').filter({
      has: page.locator('.msg-bubble').filter({ hasText: noteText }),
    }).last();
    await noteRow.locator('.msg-menu-btn').click();
    await expect(page.locator('.msg-menu-popup.open')).toBeVisible({ timeout: 5000 });

    // recallNoteMessage 有 confirm 對話框，預先接受
    page.once('dialog', d => d.accept());
    await Promise.all([
      page.waitForResponse(r => r.url().includes('action=recall_note_message'), { timeout: 12000 }),
      page.locator('.msg-menu-popup.open .msg-menu-item--danger').click(),
    ]);

    await expect(
      page.locator('#messages-area .msg-bubble').filter({ hasText: noteText })
    ).toHaveCount(0, { timeout: 8000 });
  });

});

// ─── 入社驗證碼功能 ───────────────────────────────────────────────────────────

test.describe.serial('入社驗證碼功能', () => {
  /** 跨 VC 測試共用狀態（serial 模式，依序執行） */
  const shared = {
    clubId: null,
    verificationCode: null,
    studentCtx: null,
    studentPage: null,
  };

  test.beforeAll(async ({ browser }) => {
    // ── Step 1: 學生申請加入某個尚未加入的社團 ──
    const studentCtx = await browser.newContext();
    const studentPage = await studentCtx.newPage();
    await login(studentPage, STUDENT.email, STUDENT.password);
    await studentPage.waitForLoadState('networkidle');

    // 找第一個學生尚未加入的社團
    const clubId = await studentPage.evaluate(async () => {
      const listRes = await window.APIClient.get('clubs.php?action=list&limit=50');
      const clubs = listRes?.data?.clubs || [];
      for (const c of clubs) {
        const detailRes = await window.APIClient.get(`clubs.php?action=detail&id=${c.club_id}`);
        if (detailRes?.success && !detailRes.data?.is_member) {
          return c.club_id;
        }
      }
      return null;
    });

    expect(clubId, '找不到可申請的社團，請確認 seed 資料').not.toBeNull();
    shared.clubId = clubId;

    // 提出加入申請（retry 安全：若已有驗證碼或已有待審核申請則跳過 assert）
    const applyRes = await apiPostJson(
      studentPage,
      `clubs.php?action=apply_join&id=${clubId}`,
      { fee_type: 'free' }
    );
    const alreadyApproved = !applyRes.body.success &&
      String(applyRes.body.message || '').includes('已取得驗證碼');
    const alreadyPending = !applyRes.body.success &&
      String(applyRes.body.message || '').includes('已有待審核');
    if (!alreadyApproved && !alreadyPending) {
      expect(applyRes.body.success, `申請失敗: ${applyRes.body.message}`).toBe(true);
    }

    if (!alreadyApproved) {
      // ── Step 2: 幹部批准申請（parallel browser 可能已批准，找不到 pending 時跳過）──
      const adminCtx = await browser.newContext();
      const adminPage = await adminCtx.newPage();
      await login(adminPage, CLUB_ADMIN.email, CLUB_ADMIN.password);
      await adminPage.waitForLoadState('networkidle');

      // 取得 pending 申請 ID
      const appId = await adminPage.evaluate(async (cid) => {
        const res = await window.APIClient.get(`club-admin.php?action=join_applications&id=${cid}`);
        const apps = res?.data?.applications || [];
        return apps.find(a => a.status === 'pending')?.application_id ?? null;
      }, clubId);

      if (appId) {
        // 不 assert 成功：另一個 browser worker 可能同時批准
        await apiPostJson(
          adminPage,
          'club-admin.php?action=review_application',
          { application_id: appId, action: 'approve' }
        );
      } else if (!alreadyPending) {
        expect(appId, '找不到 pending 申請').not.toBeNull();
      }
      await adminCtx.close();
    }

    // ── Step 3: 從 bot_messages 取出驗證碼（輪詢等待 parallel browser 批准完成）──
    let verificationCode = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      verificationCode = await studentPage.evaluate(async (cid) => {
        const res = await window.APIClient.get('messages.php?action=bot_messages');
        const msgs = res?.data?.messages || [];
        const vm = msgs.find(m => {
          const meta = m.meta && typeof m.meta === 'object' ? m.meta : {};
          return m.message_type === 'join_verification' && Number(meta.club_id) === Number(cid);
        });
        if (!vm) return null;
        const meta = vm.meta && typeof vm.meta === 'object' ? vm.meta : {};
        return meta.verification_code ?? null;
      }, clubId);
      if (verificationCode) break;
      await studentPage.waitForTimeout(1000);
    }

    expect(verificationCode, 'bot_messages 中找不到驗證碼').not.toBeNull();

    shared.verificationCode = verificationCode;
    shared.studentCtx = studentCtx;
    shared.studentPage = studentPage;
  });

  test.afterAll(async () => {
    if (shared.studentCtx) {
      await shared.studentCtx.close();
    }
  });

  test('VC-01 批准申請後 bot 訊息顯示驗證碼', async () => {
    const { studentPage, verificationCode } = shared;
    await navigateToMessages(studentPage);
    await studentPage.click('#bot-item');

    // 驗證碼輸入框出現
    await expect(
      studentPage.locator('input[placeholder="輸入驗證碼"]').first()
    ).toBeVisible({ timeout: 10000 });

    // 驗證碼文字顯示在頁面上
    await expect(studentPage.locator(`text=${verificationCode}`)).toBeVisible({ timeout: 5000 });
  });

  test('VC-02 輸入錯誤驗證碼應顯示錯誤訊息', async () => {
    const { studentPage } = shared;
    // 延續 VC-01，已在 messages 頁面的 bot 對話中

    const codeInput = studentPage.locator('input[placeholder="輸入驗證碼"]').first();
    await expect(codeInput).toBeVisible({ timeout: 8000 });

    await codeInput.fill('ZZZZZZ');
    await studentPage.locator('button:has-text("驗證並加入")').first().click();

    // 應出現錯誤提示
    await expect(studentPage.locator('#alert-container')).toContainText(
      /驗證碼錯誤|錯誤|失敗/,
      { timeout: 8000 }
    );

    // 輸入框仍可見（尚未加入）
    await expect(codeInput).toBeVisible();
  });

  test('VC-03 輸入正確驗證碼後成功加入社團', async () => {
    const { studentPage, clubId, verificationCode } = shared;

    const codeInput = studentPage.locator('input[placeholder="輸入驗證碼"]').first();
    await expect(codeInput).toBeVisible({ timeout: 8000 });

    await codeInput.fill(verificationCode);

    await Promise.all([
      studentPage.waitForResponse(
        r => r.url().includes('action=verify_join_code'),
        { timeout: 15000 }
      ),
      studentPage.locator('button:has-text("驗證並加入")').first().click(),
    ]);

    // 頁面顯示成功訊息
    await expect(studentPage.locator('text=已成功加入')).toBeVisible({ timeout: 10000 });

    // API 確認學生已成為社團成員
    const isMember = await studentPage.evaluate(async (cid) => {
      const d = await window.APIClient.get(`clubs.php?action=detail&id=${cid}`);
      return d?.data?.is_member === true;
    }, clubId);
    expect(isMember).toBe(true);
  });

});
