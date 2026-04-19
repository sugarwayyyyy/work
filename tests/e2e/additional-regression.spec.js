const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8000';

const STUDENT = {
  email: 'student@univ.edu',
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
    await page.click('button:has-text("重製")');

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
  test('AR-19 登出後應回到首頁且顯示未登入狀態', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('networkidle');

    const logoutBtn = page.locator('#logout-btn');
    await expect(logoutBtn).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/frontend\/index\.html$/),
      logoutBtn.click()
    ]);

    await expect(page.locator('#login-btn')).toBeVisible();
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

    await Promise.all([
      page.waitForURL(/\/frontend\/index\.html$/),
      page.click('#logout-btn')
    ]);

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
});
