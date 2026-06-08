/**
 * 類別助教 + 幹部操作紀錄 端對端測試 (E2E)
 *
 * 涵蓋新功能：
 *  - 六大社團分類（運動/學術/服務/休閒/音樂/藝術，含音樂、藝術，無藝文）
 *  - 類別助教：指派 / 列表 / 類別過濾 / 跨類別存取被擋 / 登入導向 / 越權守衛 / 撤銷還原
 *  - 幹部操作紀錄：讀取端點權限（該社幹部可讀、無關使用者被擋）
 *
 * 使用獨立帳號 caassist@univ.edu，避免動到共用 student 帳號造成並行干擾。
 */
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8000';

const ADMIN      = { email: 'admin@univ.edu',     password: 'Test123456' };
const CLUB_ADMIN = { email: 'clubadmin@univ.edu', password: 'Test123456' };
const STUDENT    = { email: 'student@univ.edu',   password: 'Test123456' };
const CA_USER    = { email: 'caassist@univ.edu',  password: 'Test123456' };

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/pages/login.html`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL(url => !url.pathname.endsWith('/pages/login.html'), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState('networkidle');
}

// 在頁面內透過 window.APIClient 呼叫 API（自動帶 CSRF / cookie）；錯誤一律正規化為 {success:false}
async function api(page, method, endpoint, data) {
  return await page.evaluate(async ({ method, endpoint, data }) => {
    try {
      const res = method === 'GET'
        ? await window.APIClient.get(endpoint)
        : await window.APIClient.post(endpoint, data || {});
      return res;
    } catch (e) {
      return { success: false, error: String((e && e.message) || e) };
    }
  }, { method, endpoint, data });
}

test.describe('類別助教與操作紀錄 (新功能)', () => {
  // 指派→過濾→守衛→撤銷必須依序執行，共用模組變數
  test.describe.configure({ mode: 'serial' });

  let caUserId = null;
  let targetCategoryId = null;
  let targetCategoryName = '';
  let otherCategoryClubId = null;

  test('社團分類為六大，且含音樂/藝術、不含藝文', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    const res = await api(page, 'GET', 'clubs.php?action=categories');
    expect(res.success, res.message || res.error).toBeTruthy();
    const names = (res.data.categories || []).map(c => c.category_name);
    expect(res.data.categories.length).toBe(6);
    expect(names).toContain('音樂');
    expect(names).toContain('藝術');
    expect(names).not.toContain('藝文');
  });

  test('操作紀錄：該社幹部可讀、無關使用者被擋', async ({ page }) => {
    // 幹部讀自己管理社團的操作紀錄
    await login(page, CLUB_ADMIN.email, CLUB_ADMIN.password);
    const myClubs = await api(page, 'GET', 'club-admin.php?action=my_clubs');
    expect(myClubs.success, myClubs.message || myClubs.error).toBeTruthy();
    const clubs = myClubs.data.clubs || [];
    expect(clubs.length).toBeGreaterThan(0);
    const clubId = Number(clubs[0].club_id);

    const okLogs = await api(page, 'GET', `club-admin.php?action=operation_logs&id=${clubId}`);
    expect(okLogs.success, okLogs.message || okLogs.error).toBeTruthy();
    expect(Array.isArray(okLogs.data.logs)).toBeTruthy();

    // 無關使用者（此時 caassist 仍是一般學生、尚未指派）讀同一社團 → 應被擋
    // 用專屬帳號而非共用 student，避免與其他 spec 並行干擾
    await login(page, CA_USER.email, CA_USER.password);
    const denied = await api(page, 'GET', `club-admin.php?action=operation_logs&id=${clubId}`);
    expect(denied.success).toBeFalsy();
  });

  test('admin 指派 caassist 為類別助教並出現在清單', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);

    const usersRes = await api(page, 'GET', 'admin.php?action=users');
    expect(usersRes.success, usersRes.message || usersRes.error).toBeTruthy();
    const caUser = (usersRes.data.users || []).find(u => u.email === CA_USER.email);
    expect(caUser, 'caassist@univ.edu 測試帳號需存在（由 seed 建立）').toBeTruthy();
    caUserId = Number(caUser.user_id);

    const catRes = await api(page, 'GET', 'clubs.php?action=categories');
    const cats = catRes.data.categories || [];
    const clubsRes = await api(page, 'GET', 'admin.php?action=clubs');
    const clubs = clubsRes.data.clubs || [];

    // 選一個「有社團」的分類當助教負責類別
    const catWithClub = cats.find(c => clubs.some(cl => Number(cl.category_id) === Number(c.category_id)));
    expect(catWithClub, '需有至少一個含社團的分類').toBeTruthy();
    targetCategoryId = Number(catWithClub.category_id);
    targetCategoryName = catWithClub.category_name;

    // 找一個不同分類的社團，供跨類別 403 測試
    const otherClub = clubs.find(cl => cl.category_id && Number(cl.category_id) !== targetCategoryId);
    otherCategoryClubId = otherClub ? Number(otherClub.club_id) : null;

    const assignRes = await api(page, 'POST', 'admin.php?action=assign_category_assistant', {
      user_id: caUserId, category_id: targetCategoryId,
    });
    expect(assignRes.success, assignRes.message || assignRes.error).toBeTruthy();

    const listRes = await api(page, 'GET', 'admin.php?action=category_assistants');
    const found = (listRes.data.assignments || []).some(
      a => Number(a.user_id) === caUserId && Number(a.category_id) === targetCategoryId
    );
    expect(found, '指派後應出現在助教清單').toBeTruthy();
  });

  test('caassist 只看到自己類別的社團，跨類別存取被擋', async ({ page }) => {
    await login(page, CA_USER.email, CA_USER.password);

    const info = await api(page, 'GET', 'admin.php?action=category_assistant_info');
    expect(info.success, info.message || info.error).toBeTruthy();
    expect(info.data.is_assistant).toBeTruthy();
    expect(Number(info.data.category_id)).toBe(targetCategoryId);

    const clubsRes = await api(page, 'GET', 'admin.php?action=clubs');
    expect(clubsRes.success).toBeTruthy();
    const clubs = clubsRes.data.clubs || [];
    expect(clubs.length).toBeGreaterThan(0);
    expect(clubs.every(c => Number(c.category_id) === targetCategoryId),
      '助教應只看到自己負責類別的社團').toBeTruthy();

    if (otherCategoryClubId) {
      const detail = await api(page, 'GET', `admin.php?action=club_detail&id=${otherCategoryClubId}`);
      expect(detail.success, '助教存取其他類別社團應被擋').toBeFalsy();
    }
  });

  test('caassist 登入導向社團管理，且越權守衛擋住其他管理頁', async ({ page }) => {
    await login(page, CA_USER.email, CA_USER.password);
    // 助教登入後應落在社團管理頁
    await expect(page).toHaveURL(/admin-clubs\.html/, { timeout: 15000 });

    // 嘗試前往帳號管理（不允許）→ 守衛導回社團管理
    await page.goto(`${BASE_URL}/pages/admin-users.html`);
    await expect(page).toHaveURL(/admin-clubs\.html/, { timeout: 15000 });
  });

  test('admin 撤銷 caassist，角色還原為一般帳號', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    expect(caUserId, '需先取得 caUserId').toBeTruthy();

    const revokeRes = await api(page, 'POST', 'admin.php?action=revoke_category_assistant', { user_id: caUserId });
    expect(revokeRes.success, revokeRes.message || revokeRes.error).toBeTruthy();

    const listRes = await api(page, 'GET', 'admin.php?action=category_assistants');
    const stillThere = (listRes.data.assignments || []).some(a => Number(a.user_id) === caUserId);
    expect(stillThere, '撤銷後不應再出現在助教清單').toBeFalsy();

    const usersRes = await api(page, 'GET', 'admin.php?action=users');
    const caUser = (usersRes.data.users || []).find(u => u.email === CA_USER.email);
    expect(caUser.role).not.toBe('category_assistant');
  });
});
