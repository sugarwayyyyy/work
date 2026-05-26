const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8000';
const API_BASE_URL = 'http://localhost:8000/backend/api';

const STUDENT = {
  email: 'student@univ.edu',
  password: 'Test123456'
};

const CLUB_ADMIN = {
  email: 'clubadmin@univ.edu',
  password: 'Test123456'
};

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/pages/login.html`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL(url => !url.pathname.endsWith('/pages/login.html'), { timeout: 15000 }),
    page.click('button[type="submit"]')
  ]);
}

async function openUserMenu(page) {
  const avatarButton = page.locator('#nav-avatar-trigger');
  await expect(avatarButton).toBeVisible();
  await avatarButton.click();
  await expect(avatarButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#nav-dd-panel')).toBeVisible();
}

async function logoutViaUserMenu(page) {
  await openUserMenu(page);

  const logoutBtn = page.locator('#ndp-logout-btn');
  await expect(logoutBtn).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/(index\.html|frontend\/index\.html)$/),
    logoutBtn.click()
  ]);
}

async function fetchMyManagedClubId(page, index = 0) {
  await page.waitForLoadState('networkidle');
  return await page.evaluate(async (idx) => {
    const myClubsResp = await window.APIClient.get('club-admin.php?action=my_clubs');
    if (!myClubsResp?.success) return null;
    const clubs = Array.isArray(myClubsResp?.data?.clubs) ? myClubsResp.data.clubs : [];
    const club = clubs[idx] ?? clubs[0] ?? null;
    return Number(club?.club_id || 0) || null;
  }, index);
}

async function fetchClubDetailById(page, clubId) {
  return await page.evaluate(async ({ cid }) => {
    const resp = await window.APIClient.get(`clubs.php?action=detail&id=${cid}`);
    if (!resp?.success) return null;
    return resp.data || null;
  }, { cid: clubId });
}

async function apiPutJson(page, endpoint, payload) {
  return await page.evaluate(async ({ endpointPath, body }) => {
    const csrfHeaders = await window.APIClient.getCSRFHeaders();
    const response = await fetch(`${window.APIClient.getBaseUrl()}/${endpointPath}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...csrfHeaders
      },
      body: JSON.stringify(body || {})
    });

    let json = null;
    try {
      json = await response.json();
    } catch (_) {
      json = { success: false, message: 'NON_JSON_RESPONSE' };
    }

    return { status: response.status, body: json };
  }, { endpointPath: endpoint, body: payload });
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
        ...csrfHeaders
      },
      body: JSON.stringify(body || {})
    });

    let json = null;
    try {
      json = await response.json();
    } catch (_) {
      json = { success: false, message: 'NON_JSON_RESPONSE' };
    }

    return { status: response.status, body: json };
  }, { endpointPath: endpoint, body: payload });
}

async function openManagedClubAdminPanel(page, tabKey = 'club-manage') {
  const pageByTab = {
    'club-manage': 'club-admin-club-manage.html',
    'create-event': 'club-admin-events-list.html',
    'events-list': 'club-admin-events-list.html',
    'transfer': 'club-admin-transfer.html',
  };
  const targetPage = pageByTab[tabKey] || 'club-admin-club-manage.html';

  await page.goto(`${BASE_URL}/pages/${targetPage}`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#selected-club-banner')).toBeVisible({ timeout: 15000 });
}

async function collectFailedResponses(page, action) {
  const failures = [];
  const listener = (response) => {
    const status = response.status();
    if (status >= 400) {
      failures.push({
        url: response.url(),
        status
      });
    }
  };

  page.on('response', listener);
  try {
    await action();
  } finally {
    page.off('response', listener);
  }

  return failures;
}

async function fetchPagedIds(endpoint, listKey) {
  const ids = [];
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages) {
    const response = await fetch(`${API_BASE_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${currentPage}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint} page ${currentPage}: ${response.status}`);
    }

    const payload = await response.json();
    const pageItems = payload?.data?.[listKey] || [];
    for (const item of pageItems) {
      const id = Number(item?.club_id ?? item?.event_id ?? 0);
      if (id > 0) {
        ids.push(id);
      }
    }

    const pagination = payload?.data?.pagination || {};
    totalPages = Number(pagination.total_pages || 1);
    currentPage += 1;
  }

  return Array.from(new Set(ids));
}

async function fetchPagedItems(endpoint, listKey) {
  const rows = [];
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages) {
    const response = await fetch(`${API_BASE_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${currentPage}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint} page ${currentPage}: ${response.status}`);
    }

    const payload = await response.json();
    const pageItems = payload?.data?.[listKey] || [];
    rows.push(...pageItems);

    const pagination = payload?.data?.pagination || {};
    totalPages = Number(pagination.total_pages || 1);
    currentPage += 1;
  }

  return rows;
}

async function scanDetailPagesForUploads404(page, urls) {
  const failures = [];
  const listener = (response) => {
    const status = response.status();
    const url = response.url();
    if (status === 404 && /\/assets\/uploads\//i.test(url)) {
      failures.push({ url, status });
    }
  };

  page.on('response', listener);
  try {
    for (const url of urls) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(250);
      if (failures.length > 0) {
        break;
      }
    }
  } finally {
    page.off('response', listener);
  }

  return failures;
}

test.describe('Additional Regression: 首頁進階搜尋', () => {
  test('AR-01 首頁應顯示進階搜尋主要元素', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#advanced-search-form')).toBeVisible();
    await expect(page.locator('#search-type')).toBeVisible();
    await expect(page.locator('#search-keyword')).toBeVisible();
    await expect(page.locator('#clear-search')).toBeVisible();
  });

  test('AR-02 首頁預設應顯示社團篩選區塊', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#search-type')).toHaveValue('clubs');
    await expect(page.locator('#clubs-filters')).toBeVisible();
    await expect(page.locator('#events-filters')).toBeHidden();
    await expect(page.locator('#qa-filters')).toBeHidden();
  });

  test('AR-03 切換搜尋類型為活動應顯示活動篩選', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('networkidle');

    await page.selectOption('#search-type', 'events');
    await expect(page.locator('#events-filters')).toBeVisible();
    await expect(page.locator('#clubs-filters')).toBeHidden();
    await expect(page.locator('#qa-filters')).toBeHidden();
  });

  test('AR-04 切換搜尋類型為提問應顯示提問篩選', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('networkidle');

    await page.selectOption('#search-type', 'qa');
    await expect(page.locator('#qa-filters')).toBeVisible();
    await expect(page.locator('#clubs-filters')).toBeHidden();
    await expect(page.locator('#events-filters')).toBeHidden();
  });

  test('AR-05 清除按鈕應重置關鍵字與搜尋類型', async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('networkidle');

    await page.selectOption('#search-type', 'qa');
    await page.fill('#search-keyword', 'test-keyword');
    await page.click('#clear-search');

    await expect(page.locator('#search-type')).toHaveValue('clubs');
    await expect(page.locator('#search-keyword')).toHaveValue('');
    await expect(page.locator('#clubs-filters')).toBeVisible();
  });
});

test.describe('Additional Regression: 社團列表篩選與導覽', () => {
  test('AR-06 社團列表頁應顯示四個核心篩選控制項', async ({ page }) => {
    await page.goto(`${BASE_URL}/pages/club-list.html`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#club-search')).toBeVisible();
    await expect(page.locator('#category-filter')).toBeVisible();
    await expect(page.locator('#club-filter')).toBeVisible();
    await expect(page.locator('#club-fee-range')).toBeVisible();
  });

  test('AR-07 未選類別時社團下拉應為 disabled', async ({ page }) => {
    await page.goto(`${BASE_URL}/pages/club-list.html`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#club-filter')).toBeDisabled();
  });

  test('AR-08 重製按鈕應清空關鍵字與費用範圍', async ({ page }) => {
    await page.goto(`${BASE_URL}/pages/club-list.html`);
    await page.waitForLoadState('networkidle');

    await page.fill('#club-search', '程式');
    await page.selectOption('#club-fee-range', '1000+');
    const resetBtn = page.getByRole('button', { name: /重製/ });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    await expect(page.locator('#club-search')).toHaveValue('');
    await expect(page.locator('#club-fee-range')).toHaveValue('');
  });

  test('AR-09 可由社團列表進入社團詳情頁', async ({ page }) => {
    await page.goto(`${BASE_URL}/pages/club-list.html`);
    await page.waitForLoadState('networkidle');

    const detailLink = page.locator('a[href*="club-detail.html?id="]').first();
    const count = await page.locator('a[href*="club-detail.html?id="]').count();

    if (count > 0) {
      await detailLink.click();
      await page.waitForURL('**/club-detail.html**');
      await expect(page).toHaveURL(/club-detail\.html\?id=\d+/);
    } else {
      await expect(page.locator('#clubs-container')).toBeVisible();
    }
  });
});

test.describe('Additional Regression: 活動頁篩選器', () => {
  test('AR-10 活動頁應顯示搜尋與日期篩選控制項', async ({ page }) => {
    await page.goto(`${BASE_URL}/pages/events.html`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#event-search')).toBeVisible();
    await expect(page.locator('#event-start-from-date')).toBeVisible();
    await expect(page.locator('#deadline-to-date')).toBeVisible();
    await expect(page.locator('#event-filters')).toBeVisible();
  });

  test('AR-11 活動開始時間拆分欄位應能同步到 hidden 欄位', async ({ page }) => {
    await page.goto(`${BASE_URL}/pages/events.html`);
    await page.waitForLoadState('networkidle');

    await page.fill('#event-start-from-date', '2026-04-01');
    await page.selectOption('#event-start-from-hour', '08');
    await page.selectOption('#event-start-from-minute', '30');

    const hiddenValue = await page.locator('#event-start-from').inputValue();
    expect(hiddenValue).toContain('2026-04-01T08:30');
  });

  test('AR-12 報名截止拆分欄位應能同步到 hidden 欄位', async ({ page }) => {
    await page.goto(`${BASE_URL}/pages/events.html`);
    await page.waitForLoadState('networkidle');

    await page.fill('#deadline-to-date', '2026-04-30');
    await page.selectOption('#deadline-to-hour', '21');
    await page.selectOption('#deadline-to-minute', '00');

    const hiddenValue = await page.locator('#deadline-to').inputValue();
    expect(hiddenValue).toContain('2026-04-30T21:00');
  });

  test('AR-13 活動頁重製按鈕應清空關鍵字與隱藏日期值', async ({ page }) => {
    await page.goto(`${BASE_URL}/pages/events.html`);
    await page.waitForLoadState('networkidle');

    await page.fill('#event-search', '社課');
    await page.fill('#event-start-from-date', '2026-03-01');
    await page.selectOption('#event-start-from-hour', '10');
    await page.selectOption('#event-start-from-minute', '00');
    await page.click('button:has-text("重製")');

    await expect(page.locator('#event-search')).toHaveValue('');
    await expect(page.locator('#event-start-from')).toHaveValue('');
  });
});

test.describe('Additional Regression: QA 互動細節', () => {
  test('AR-14 QA 頁應顯示搜尋、篩選、發布提問按鈕', async ({ page }) => {
    await page.goto(`${BASE_URL}/pages/qa.html`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#qa-search')).toBeVisible();
    await expect(page.locator('#qa-club-filter')).toBeVisible();
    await expect(page.locator('#qa-status-filter')).toBeVisible();
    await expect(page.locator('#ask-btn')).toBeVisible();
  });

  test('AR-15 未登入按發布提問應導向登入頁', async ({ page }) => {
    await page.goto(`${BASE_URL}/pages/qa.html`);
    await page.waitForLoadState('networkidle');

    await page.click('#ask-btn');
    await page.waitForURL('**/login.html');
    await expect(page).toHaveURL(/login\.html/);
  });

  test('AR-16 已登入學生可開啟提問 modal', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await page.goto(`${BASE_URL}/pages/qa.html`);
    await page.waitForLoadState('networkidle');

    await page.click('#ask-btn');
    await expect(page.locator('#ask-modal')).toBeVisible();
    await expect(page.locator('#ask-form')).toBeVisible();
  });

  test('AR-17 緊急程度按鈕應同步 hidden 值', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await page.goto(`${BASE_URL}/pages/qa.html`);
    await page.waitForLoadState('networkidle');

    await page.click('#ask-btn');
    await expect(page.locator('#ask-urgency')).toHaveValue('normal');

    await page.click('.urgency-btn[data-urgency="urgent"]');
    await expect(page.locator('#ask-urgency')).toHaveValue('urgent');

    await page.click('.urgency-btn[data-urgency="important"]');
    await expect(page.locator('#ask-urgency')).toHaveValue('important');
  });

  test('AR-18 關閉提問 modal 後應隱藏且重置緊急程度為 normal', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await page.goto(`${BASE_URL}/pages/qa.html`);
    await page.waitForLoadState('networkidle');

    await page.click('#ask-btn');
    await page.click('.urgency-btn[data-urgency="urgent"]');
    await expect(page.locator('#ask-urgency')).toHaveValue('urgent');

    await page.evaluate(() => {
      if (typeof window.closeAskModal === 'function') {
        window.closeAskModal();
      }
    });
    await expect(page.locator('#ask-modal')).toBeHidden();
    await expect(page.locator('#ask-urgency')).toHaveValue('normal');
  });
});

test.describe('Additional Regression: 會話與導向自檢', () => {
  test('AR-22 未登入首頁不應觸發 auth current 401', async ({ page }) => {
    const failures = await collectFailedResponses(page, async () => {
      await page.goto(`${BASE_URL}/index.html`);
      await page.waitForLoadState('networkidle');
    });

    const current401 = failures.filter(item =>
      item.status === 401 && item.url.includes('auth.php?action=current')
    );

    expect(current401).toHaveLength(0);
    await expect(page.locator('#login-btn')).toBeVisible();
  });

  test('AR-23 未登入首頁不應載入 uploads 404', async ({ page }) => {
    const failures = await collectFailedResponses(page, async () => {
      await page.goto(`${BASE_URL}/index.html`);
      await page.waitForLoadState('networkidle');
    });

    const upload404s = failures.filter(item =>
      item.status === 404 && /\/assets\/uploads\//i.test(item.url)
    );

    expect(upload404s).toHaveLength(0);
  });

  test('AR-24 已登入首頁不應載入 uploads 404', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);

    const failures = await collectFailedResponses(page, async () => {
      await page.goto(`${BASE_URL}/index.html`);
      await page.waitForLoadState('networkidle');
    });

    const upload404s = failures.filter(item =>
      item.status === 404 && /\/assets\/uploads\//i.test(item.url)
    );

    expect(upload404s).toHaveLength(0);
    await expect(page.locator('#followed-clubs-section')).toBeVisible();
  });

  test('AR-25 所有社團詳情頁不應載入 uploads 404', async ({ page }) => {
    test.setTimeout(180000);
    const clubIds = await fetchPagedIds('clubs.php', 'clubs');
    expect(clubIds.length).toBeGreaterThan(0);

    const urls = clubIds.map(id => `${BASE_URL}/pages/club-detail.html?id=${id}`);
    const failures = await scanDetailPagesForUploads404(page, urls);

    expect(failures).toHaveLength(0);
    await expect(page.locator('#club-name')).toBeAttached();
  });

  test('AR-26 所有活動詳情頁不應載入 uploads 404', async ({ page }) => {
    test.setTimeout(180000);
    const eventIds = await fetchPagedIds('events.php', 'events');
    expect(eventIds.length).toBeGreaterThan(0);

    const urls = eventIds.map(id => `${BASE_URL}/pages/event-detail.html?id=${id}`);
    const failures = await scanDetailPagesForUploads404(page, urls);

    expect(failures).toHaveLength(0);
    await expect(page.locator('#event-title')).toBeAttached();
  });

  test('AR-19 登出後應回到首頁且顯示未登入狀態', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('networkidle');

    await logoutViaUserMenu(page);

    await expect(page.locator('#login-btn')).toBeVisible();
    await expect(page.locator('#user-dropdown')).toBeHidden();
    await expect(page.locator('#nav-dd-panel')).toBeHidden();
    await expect(page.locator('#logout-btn')).toBeHidden();

    const currentUserResp = await page.evaluate(async () => {
      return await window.APIClient.get('auth.php?action=current');
    });
    expect(currentUserResp.success).toBeFalsy();
  });

  test('AR-20 登出導向 URL 不應包含重複 index 路徑', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('networkidle');

    await logoutViaUserMenu(page);

    expect(page.url().includes('/index.html/index.html')).toBeFalsy();
  });

  test('AR-21 未登入看社團詳情時應提示需登入才能確認追蹤狀態', async ({ page }) => {
    await page.goto(`${BASE_URL}/pages/club-list.html`);
    await page.waitForLoadState('networkidle');

    const detailLink = page.locator('a[href*="club-detail.html?id="]').first();
    await expect(detailLink).toBeVisible();
    await detailLink.click();
    await page.waitForURL('**/club-detail.html**');

    const followBtn = page.locator('#follow-btn');
    await expect(followBtn).toBeVisible();
    await expect(followBtn).toHaveText('登入後可查看追蹤狀態');
  });

  test('AR-27 追蹤狀態在登出再登入後應維持', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);

    await page.goto(`${BASE_URL}/pages/club-list.html`);
    await page.waitForLoadState('networkidle');

    // 使用第二個社團連結（而非第一個），避免與 AC1（US 1.3）並行時因 toggle 操作
    // 造成共享追蹤狀態衝突——AC1 永遠點擊第一個社團，AR-27 使用第二個即可隔離。
    const allDetailLinks = page.locator('a[href*="club-detail.html?id="]');
    await expect(allDetailLinks.first()).toBeVisible();
    const linkCount = await allDetailLinks.count();
    const detailLink = allDetailLinks.nth(Math.min(1, linkCount - 1));

    const detailHref = await detailLink.getAttribute('href');
    expect(detailHref).toBeTruthy();

    const clubIdMatch = String(detailHref).match(/id=(\d+)/);
    expect(clubIdMatch).toBeTruthy();
    const clubId = Number(clubIdMatch[1]);
    expect(clubId).toBeGreaterThan(0);

    await detailLink.click();
    await page.waitForURL('**/club-detail.html**');
    await page.waitForLoadState('networkidle');

    const followBtn = page.locator('#follow-btn');
    await expect(followBtn).toBeVisible();

    const initialText = (await followBtn.innerText()).trim();
    if (!initialText.includes('已追蹤')) {
      await followBtn.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#follow-btn')).toContainText('已追蹤');
    }

    await logoutViaUserMenu(page);

    await login(page, STUDENT.email, STUDENT.password);
    await page.goto(`${BASE_URL}/pages/club-detail.html?id=${clubId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#follow-btn')).toContainText('已追蹤');
  });
});

test.describe('Additional Regression: Data Integrity & Safety', () => {
  test('AR-28 should reject stale last_updated on concurrent club update', async ({ page, browserName }) => {
    test.setTimeout(60000);
    // 每個 browser 使用不同社團，避免並行時互相打出 409
    const clubIndex = browserName === 'firefox' ? 1 : browserName === 'webkit' ? 2 : 0;
    await login(page, CLUB_ADMIN.email, CLUB_ADMIN.password);
    await page.waitForLoadState('networkidle');

    const clubId = await fetchMyManagedClubId(page, clubIndex);
    expect(clubId).toBeTruthy();

    const snapshot = await fetchClubDetailById(page, clubId);
    expect(snapshot).toBeTruthy();
    expect(snapshot.last_updated).toBeTruthy();

    let workingSnapshot = snapshot;
    let staleLastUpdated = snapshot.last_updated;

    const buildPayloadA = (snap) => ({
      description: `${snap.description || ''}\n[AR-28-A-${Date.now().toString(36)}]`,
      meeting_day: snap.meeting_day || '',
      meeting_time: snap.meeting_time || '',
      meeting_location: snap.meeting_location || '',
      contact_email: snap.contact_email || 'clubadmin@univ.edu',
      contact_phone: snap.contact_phone || '',
      club_fee: snap.club_fee || 0,
      last_updated: snap.last_updated
    });

    // payloadA 若拿到 409 代表並行 worker 剛好同時修改了同一社團，重取快照再試一次
    let firstUpdate = await apiPutJson(page, `clubs.php?action=update&id=${clubId}`, buildPayloadA(workingSnapshot));
    if (firstUpdate.status === 409) {
      workingSnapshot = await fetchClubDetailById(page, clubId);
      expect(workingSnapshot).toBeTruthy();
      staleLastUpdated = workingSnapshot.last_updated;
      firstUpdate = await apiPutJson(page, `clubs.php?action=update&id=${clubId}`, buildPayloadA(workingSnapshot));
    }
    expect(firstUpdate.status).toBe(200);
    expect(firstUpdate.body?.success).toBeTruthy();

    // payloadB 使用同一個 staleLastUpdated，此時伺服器已更新，必須回 409
    const payloadB = {
      ...buildPayloadA(workingSnapshot),
      description: `${workingSnapshot.description || ''}\n[AR-28-B-${Date.now().toString(36)}]`,
      last_updated: staleLastUpdated
    };
    const secondUpdate = await apiPutJson(page, `clubs.php?action=update&id=${clubId}`, payloadB);
    expect(secondUpdate.body?.success).toBeFalsy();
    expect(secondUpdate.status).toBe(409);
    expect(String(secondUpdate.body?.message || '').length).toBeGreaterThan(0);
  });

  test('AR-29 follow request failure should not show fake success state', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    // webkit 在 login 後可能仍有 JS redirect，先等 load 穩定再 goto
    await page.waitForLoadState('load');
    await page.goto(`${BASE_URL}/pages/club-list.html`);
    await page.waitForLoadState('networkidle');

    const detailLink = page.locator('a[href*="club-detail.html?id="]').first();
    await expect(detailLink).toBeVisible();
    await detailLink.click();
    await page.waitForURL('**/club-detail.html**');
    await page.waitForLoadState('networkidle');

    const followBtn = page.locator('#follow-btn');
    await expect(followBtn).toBeVisible();
    const beforeText = (await followBtn.innerText()).trim();

    await page.route('**/clubs.php?action=toggle_follow**', route => route.abort('internetdisconnected'));
    await followBtn.click();

    await expect(page.locator('#alert-container')).toContainText(/\u64cd\u4f5c|\u5931\u6557|error|fail/i, { timeout: 10000 });
    await expect(followBtn).toHaveText(beforeText);
    await page.unroute('**/clubs.php?action=toggle_follow**');
  });

  test('AR-30 club profile minimum fields should block empty submit', async ({ page }) => {
    await login(page, CLUB_ADMIN.email, CLUB_ADMIN.password);
    await openManagedClubAdminPanel(page, 'club-manage');

    await expect(page.locator('#update-club-form')).toBeVisible();
    let updateRequestCount = 0;
    const requestListener = request => {
      if (request.url().includes('/clubs.php?action=update&id=')) {
        updateRequestCount += 1;
      }
    };
    page.on('request', requestListener);

    await page.fill('#update-club-description', '');
    await page.fill('#update-club-email', '');
    await page.click('#update-club-form button[type="submit"]');

    const formIsValid = await page.locator('#update-club-form').evaluate(form => form.checkValidity());
    const descriptionIsValid = await page.locator('#update-club-description').evaluate(el => el.checkValidity());
    const emailIsValid = await page.locator('#update-club-email').evaluate(el => el.checkValidity());

    expect(formIsValid).toBeFalsy();
    expect(descriptionIsValid).toBeFalsy();
    expect(emailIsValid).toBeFalsy();
    await expect.poll(() => updateRequestCount).toBe(0);
    await expect(page.locator('#alert-container .alert-success')).toHaveCount(0);

    page.off('request', requestListener);
  });

  test('AR-31 tag/keyword no-result flow should stay navigable', async ({ page }) => {
    await page.goto(`${BASE_URL}/pages/club-list.html?tags=99999999`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#clubs-container')).toBeVisible();
    await expect(page.locator('#popular-tags')).toBeVisible();
    await expect(page).not.toHaveURL(/404/i);

    await page.fill('#club-search', `__NO_RESULT__${Date.now()}`);
    await page.evaluate(() => {
      if (typeof loadClubs === 'function') {
        loadClubs();
      }
    });
    await expect(page.locator('#clubs-container')).toBeVisible();
    await expect(page.locator('#popular-tags')).toBeVisible();
  });

  test('AR-32 upload should reject forged extension file', async ({ page }) => {
    await login(page, CLUB_ADMIN.email, CLUB_ADMIN.password);
    const clubId = await fetchMyManagedClubId(page);
    expect(clubId).toBeTruthy();

    const uploadResult = await page.evaluate(async ({ cid }) => {
      const csrfHeaders = await window.APIClient.getCSRFHeaders();
      const fakeFile = new File([new Blob(['this is not an image'])], 'fake.jpg', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('logo', fakeFile);
      formData.append('club_id', String(cid));

      const response = await fetch(`${window.APIClient.getBaseUrl()}/upload.php?action=upload_club_logo`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...csrfHeaders
        },
        body: formData
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (_) {
        payload = { success: false, message: 'NON_JSON_RESPONSE' };
      }

      return { status: response.status, payload };
    }, { cid: clubId });

    expect(uploadResult.payload?.success).toBeFalsy();
    expect(String(uploadResult.payload?.message || '')).toMatch(/\u4e0d\u652f\u63f4|\u6587\u4ef6|\u985e\u578b|type|mime|invalid|unsupported/i);
  });

  test('AR-33 club admin cannot modify tags of non-owned clubs', async ({ page }) => {
    await login(page, CLUB_ADMIN.email, CLUB_ADMIN.password);
    await page.waitForLoadState('networkidle');

    const ownedClubIds = await page.evaluate(async () => {
      const resp = await window.APIClient.get('club-admin.php?action=my_clubs');
      if (!resp?.success) return [];
      return (resp?.data?.clubs || []).map(item => Number(item.club_id)).filter(id => id > 0);
    });
    expect(ownedClubIds.length).toBeGreaterThan(0);

    const allClubIds = await fetchPagedIds('clubs.php', 'clubs');
    const foreignClubId = allClubIds.find(id => !ownedClubIds.includes(Number(id)));
    test.skip(!foreignClubId, 'No foreign club available for privilege-isolation test.');

    const forbiddenTagUpdate = await apiPostJson(page, 'clubs.php?action=update_tags', {
      club_id: Number(foreignClubId),
      tag_ids: []
    });

    expect(forbiddenTagUpdate.status).toBe(403);
    expect(forbiddenTagUpdate.body?.success).toBeFalsy();
    expect(String(forbiddenTagUpdate.body?.message || '').length).toBeGreaterThan(0);
  });

  test('AR-34 club admin cannot archive events of non-owned clubs', async ({ page }) => {
    await login(page, CLUB_ADMIN.email, CLUB_ADMIN.password);
    await page.waitForLoadState('networkidle');

    const ownedClubIds = await page.evaluate(async () => {
      const resp = await window.APIClient.get('club-admin.php?action=my_clubs');
      if (!resp?.success) return [];
      return (resp?.data?.clubs || []).map(item => Number(item.club_id)).filter(id => id > 0);
    });
    expect(ownedClubIds.length).toBeGreaterThan(0);

    const events = await fetchPagedItems('events.php', 'events');
    const foreignEvent = events.find(event => {
      const eventClubId = Number(event?.club_id || 0);
      return eventClubId > 0 && !ownedClubIds.includes(eventClubId);
    });
    expect(foreignEvent).toBeTruthy();

    const forbiddenEventArchive = await apiPutJson(page, `events.php?action=archive&id=${Number(foreignEvent.event_id)}`, {});
    expect(forbiddenEventArchive.status).toBe(403);
    expect(forbiddenEventArchive.body?.success).toBeFalsy();
    expect(String(forbiddenEventArchive.body?.message || '').length).toBeGreaterThan(0);
  });

  test('AR-35 club update should be visible immediately to student (no stale cache)', async ({ page, browser }) => {
    test.setTimeout(90000);
    await login(page, CLUB_ADMIN.email, CLUB_ADMIN.password);

    const clubId = await fetchMyManagedClubId(page);
    expect(clubId).toBeTruthy();

    const snapshot = await fetchClubDetailById(page, clubId);
    expect(snapshot).toBeTruthy();
    expect(snapshot.last_updated).toBeTruthy();

    const marker = `[AR-35-${Date.now().toString(36)}]`;
    const nextDescription = `${snapshot.description || ''}\n${marker}`;

    const updatePayload = {
      description: nextDescription,
      meeting_day: snapshot.meeting_day || '',
      meeting_time: snapshot.meeting_time || '',
      meeting_location: snapshot.meeting_location || '',
      contact_email: snapshot.contact_email || 'clubadmin@univ.edu',
      contact_phone: snapshot.contact_phone || '',
      club_fee: snapshot.club_fee || 0,
      last_updated: snapshot.last_updated
    };

    const updateResult = await apiPutJson(page, `clubs.php?action=update&id=${clubId}`, updatePayload);
    expect(updateResult.status).toBe(200);
    expect(updateResult.body?.success).toBeTruthy();

    const studentContext = await browser.newContext();
    const studentPage = await studentContext.newPage();
    try {
      await login(studentPage, STUDENT.email, STUDENT.password);
      await studentPage.goto(`${BASE_URL}/pages/club-detail.html?id=${clubId}`);
      await studentPage.waitForLoadState('networkidle');
      await expect(studentPage.locator('#club-description')).toContainText(marker, { timeout: 15000 });
    } finally {
      await studentContext.close();
    }
  });
});
