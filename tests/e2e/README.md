# Playwright E2E 測試指南

本專案使用 **Playwright** 進行端對端 (E2E) 測試，以驗證使用者故事的功能實現。

## 目錄
- [運作原理](#運作原理)
- [安裝](#安裝)
- [前置條件](#前置條件)
- [執行測試](#執行測試)
- [測試結構](#測試結構)
- [測試帳號](#測試帳號)
- [Demo 環境準備（教授展示用）](#demo-環境準備教授展示用)
- [撰寫新測試](#撰寫新測試)
- [常見問題](#常見問題)
- [相關文件](#相關文件)

## 安裝

### 1. 安裝 Node.js 依賴

```bash
npm install
```

### 2. 安裝 Playwright 瀏覽器

```bash
npx playwright install
```

## 執行測試

### 基本執行
```bash
npm test
```

### 互動式 UI 模式
```bash
npm run test:ui
```

### 特定瀏覽器測試
```bash
npm run test:chrome      # Chrome 瀏覽器
npm run test:firefox     # Firefox 瀏覽器
npm run test:webkit      # Safari 瀏覽器
```

### 調試模式
```bash
npm run test:debug       # 開啟調試器
```

### 有頭模式（可見瀏覽器窗口）
```bash
npm run test:headed      # 顯示瀏覽器操作過程
```

### 執行特定測試
```bash
npx playwright test user-stories.spec.js
npx playwright test -g "US 1.1"  # 執行名稱包含 "US 1.1" 的測試
```

### 測試資料清理
E2E 會在每個測試結束後自動執行 `scripts/cleanup-e2e-test-data.php`，回收測試建立的活動與關聯資料，並還原追蹤狀態。

在整個 E2E suite 結束後，會再執行一次 `scripts/cleanup-e2e-test-data.php --full`，把先前植入的 seed 測試帳號、測試活動與測試公告一併移除。

若需要手動清理，可執行：
```bash
php scripts/cleanup-e2e-test-data.php
php scripts/cleanup-e2e-test-data.php --full
```

## 測試結構

```
tests/e2e/
├── user-stories.spec.js          # 主要使用者故事測試（US 1.1–4.1 + 登入/頁面可訪問性）
├── additional-regression.spec.js # 補充迴歸測試（AR-01–AR-40）
├── messages.spec.js              # 私訊與入社驗證碼功能測試（PM-01–PM-07、VC-01–VC-03）
├── global-setup.js               # 測試前自動清理 + seed 資料
├── global-teardown.js            # 測試後清理
├── dev-router.php                # Playwright webServer 路由（整合前後端）
├── RUNNING_TESTS.md              # 詳細操作指南
└── README.md                     # 本文件
```

### 涵蓋的使用者故事

| 功能 | spec 檔 | AC 涵蓋 |
|------|---------|--------|
| US 1.1 社團列表與搜尋篩選 | user-stories | 3/3 ✅ |
| US 1.3 追蹤功能與動態牆 | user-stories | 2/3 ✅ |
| US 1.5 資料時間戳 | user-stories | 2/2 ✅ |
| US 2.1 社團幹部編輯資訊 | user-stories | 3/3 ✅ |
| US 2.2 社團活動發布 | user-stories | 2/2 ✅ |
| US 4.1 平台管理員功能 | user-stories | 2/2 ✅ |
| 登入/權限 | user-stories | 4/4 ✅ |
| 頁面可訪問性 | user-stories | 3/3 ✅ |
| 首頁進階搜尋 | additional-regression | ✅ |
| 社團列表篩選與導覽 | additional-regression | ✅ |
| 活動頁篩選器 | additional-regression | ✅ |
| QA 互動細節 | additional-regression | ✅ |
| 社團編輯同步驗證 | additional-regression | ✅ |
| 私訊（傳送、收回、回復、emoji 反應、記事本）| messages | PM-01–PM-07 ✅ |
| 入社驗證碼（bot 訊息、錯誤/正確驗證碼）| messages | VC-01–VC-03 ✅ |

## 測試帳號

### 學生帳號
- **郵箱**：student@univ.edu
- **密碼**：Test123456
- **角色**：student

### 社團幹部帳號
- **郵箱**：clubadmin@univ.edu
- **密碼**：Test123456
- **角色**：club_admin

### 平台管理員帳號
- **郵箱**：admin@univ.edu
- **密碼**：Test123456
- **角色**：platform_admin

---

## 運作原理

**單一 PHP 伺服器架構**：`npm test` 會讓 Playwright 自動啟動一個 PHP 伺服器（`php -S localhost:8000 tests/e2e/dev-router.php`），`dev-router.php` 同時負責路由：
- 前端靜態頁面：`/pages/*.html`、`/css/`、`/js/` → `frontend/`
- 後端 API：`/api/*.php` → `backend/api/`

不需要分開啟動前端與後端，也不需要任何 `cd` 指令。

**PHP 路徑自動偵測**：`global-setup.js`、`global-teardown.js`、`user-stories.spec.js` 內的 `resolvePhp()` 會依序嘗試：
1. `C:\xampp\php\php.exe`（XAMPP）
2. `C:\AppServ\php8\php.exe`（AppServ PHP 8）
3. `C:\AppServ\php7\php.exe`（AppServ PHP 7）
4. `php`（PATH 中的全域指令，fallback）

不需要手動設定 PHP 路徑。

**測試資料生命週期**：
1. `global-setup.js` — 測試開始前執行完整清理（`--full`）再 seed 測試帳號與資料
2. `test.afterEach` — 每個測試結束後執行輕量清理（移除該測試產生的活動等）
3. `global-teardown.js` — 整個 suite 結束後再執行一次完整清理

AI 工具注意：**不需要、也不應該**在測試中手動插入或清理資料庫資料，lifecycle 已自動處理。

## 前置條件

**不需要**手動啟動前端或後端伺服器。執行 `npm test` 時，Playwright 會透過 `playwright.config.js` 的 `webServer` 設定自動啟動，並在測試結束後自動關閉。

只需確保 MySQL 資料庫已初始化：

```bash
php run_migration.php
```

## 測試輸出

測試完成後，HTML 報告會生成在：
```
playwright-report/index.html
```

### 查看報告
```bash
npx playwright show-report
```

## 撰寫新測試

### 加在哪個 spec 檔？
- **`user-stories.spec.js`** — 對應使用者故事（US X.Y）的驗收測試
- **`additional-regression.spec.js`** — 邊界條件、迴歸測試、不屬於特定 US 的功能驗證

### 命名慣例
```js
test.describe('US 2.3: 功能名稱', () => {
  test('AC1: 具體驗收條件描述', async ({ page }) => { ... });
});
// 迴歸測試用 AR- 前綴
test.describe('AR-41: 功能名稱', () => { ... });
```

### 可用的 Helper 函式（定義於 `user-stories.spec.js` 頂部）

| 函式 | 說明 |
|------|------|
| `login(page, email, password)` | 導覽到登入頁並完成登入（UI 流程），等待跳轉完成 |
| `loginViaApi(page, email, password)` | 以 API POST 登入，回傳 `csrf_token`；比 UI 登入快，適合不需要驗登入畫面的測試 |
| `publishEventAsClubAdmin(page, eventName)` | 以社團幹部身份走完整 UI 流程建立並發布活動，回傳 `{ startAt, eventId }` |
| `publishEventViaApi(page, eventName, csrfToken)` | 以 API 建立並發布活動，回傳 `{ startAt, eventId }`；適合只需要前置資料、不需要驗 UI 的測試 |
| `gotoWithRetry(page, url, options)` | 導覽到指定 URL，遇到 ECONNREFUSED 最多重試 3 次 |
| `openClubAdminTab(page, tabName, panelSelector, tabKey)` | 點選社團後台的指定分頁並等待面板出現 |
| `waitForEventIdByName(page, eventName)` | 輪詢 API 直到活動出現，回傳 `eventId` |
| `waitForEventCardByName(page, eventName)` | 輪詢前台活動列表直到卡片出現，回傳 locator |
| `toDateInputValue(date)` | 將 `Date` 物件轉為 `YYYY-MM-DD` 字串 |
| `toDateTimeInputValue(date)` | 將 `Date` 物件轉為 `YYYY-MM-DD HH:mm:ss` 字串 |
| `safeUniqueToken()` | 產生純字母的唯一字串（字母表不含數字），用於需通過內容過濾器的欄位 |

### 測試帳號常數（直接使用，不要 hardcode 字串）
```js
// 定義於 spec 頂部
const ADMIN      = { email: 'admin@univ.edu',      password: 'Test123456', role: 'platform_admin' };
const CLUB_ADMIN = { email: 'clubadmin@univ.edu',  password: 'Test123456', role: 'club_admin' };
const STUDENT    = { email: 'student@univ.edu',    password: 'Test123456', role: 'student' };
```

### 重要限制（AI 工具必讀）

- **測試並行執行**（4 workers）：每個測試必須完全獨立，不可依賴其他測試的執行順序或共享 DOM 狀態。
- **不要手動操作資料庫**：seed / cleanup 已由 lifecycle 自動管理，測試中只透過 UI 或 `APIClient` 操作。
- **`reuseExistingServer: true`（非 CI）**：本機 port 8000 若已有服務在跑，Playwright 會直接使用。若有異常請先確認 port 沒被其他程式佔用。
- **勿使用 `page.waitForNavigation()`**：此 API 在較新版 Playwright 已棄用，改用 `page.waitForURL()` 或 `page.waitForLoadState()`。
- **Firefox sandbox**：Windows 上 Firefox 需停用 sandbox（已設定於 `playwright.config.js`），不需要額外處理。
- **內容過濾器陷阱**：活動名稱、社團說明等受內容過濾器審查的欄位，不可直接嵌入 `Date.now()` 數字（13 位數時間戳約有 11% 機率含 `78` 等被禁數字，導致 HTTP 400）；改用 `safeUniqueToken()` 產生純字母唯一字串（字母表不含任何數字，從根本排除此類問題）。

## 常見問題

### Q: 測試超時？
**A**: 確認 MySQL 服務正常，且 port 8000 未被其他程式佔用（`netstat -ano | findstr :8000`）。不需要手動啟動伺服器，Playwright 會自動處理。

### Q: 找不到元素？
**A**: 先用 `npm run test:ui` 或 `npm run test:debug` 逐步確認選擇器。選擇器定義於各 spec 檔的 `page.locator()` 中。

### Q: 如何調試失敗的測試？
**A**:
1. `npm run test:debug` — 開啟 Playwright Inspector 逐步執行
2. 在測試中插入 `await page.pause()` 暫停
3. 失敗後查看 `playwright-report/` 的截圖與影片

### Q: 可以只跑單一測試？
**A**: 用 `-g` 過濾關鍵字：`npx playwright test -g "US 1.1"`，或指定 spec 檔：`npx playwright test user-stories.spec.js`。

## 參考資源

- [Playwright 官方文檔](https://playwright.dev)
- [Playwright API 參考](https://playwright.dev/docs/api/class-page)
- [測試最佳實踐](https://playwright.dev/docs/best-practices)

## 相關文件

- [詳細操作指南](RUNNING_TESTS.md) — 進階設定、故障排查、CI 說明
- [PHP 驗收測試](../api/acceptance_user_stories.php) — API 層級測試
- [手動驗收清單](../manual/user_story_acceptance_checklist.md)
- [測試報告](../../TESTING_REPORT.md)
- [專案狀態](../../PROJECT_STATUS.md)
