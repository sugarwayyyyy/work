# E2E 測試執行指南

本專案使用 **Playwright** 進行端對端測試，測試執行環境為 Node.js。

## 目錄
- [前置準備](#前置準備)
- [執行測試](#執行測試)
- [測試架構](#測試架構)
- [測試帳號](#測試帳號)
- [故障排查](#故障排查)
- [配置說明](#配置說明)
- [持續集成](#持續集成)

---

## 前置準備

### 1. 安裝依賴

```bash
npm install
npx playwright install
```

### 2. 確認資料庫已初始化

```bash
php run_migration.php
```

> **不需要**手動啟動前端或後端伺服器。`npm test` 執行時，Playwright 會透過 `playwright.config.js` 的 `webServer` 設定自動啟動 `php -S localhost:8000 tests/e2e/dev-router.php`，並在測試結束後自動關閉。

---

## 執行測試

### 標準執行（推薦）

```bash
npm test
```

預期結果：全部測試通過（Chromium、Firefox、WebKit 三瀏覽器）。

測試開始前，`global-setup.js` 會自動執行完整的資料清理（`--full`）與 seed，不需要手動準備測試資料。

### 常用指令

```bash
npm run test:ui       # 互動式 UI 模式（開發與調試用）
npm run test:headed   # 有頭模式（可見瀏覽器視窗）
npm run test:debug    # 調試模式（逐步執行）

npm run test:chrome   # 只跑 Chromium
npm run test:firefox  # 只跑 Firefox
npm run test:webkit   # 只跑 WebKit（Safari）

npx playwright test -g "US 1.1"              # 執行符合關鍵字的測試
npx playwright test user-stories.spec.js      # 執行單一 spec 檔
npx playwright show-report                    # 開啟 HTML 測試報告
```

---

## 測試架構

### 檔案結構

```
tests/e2e/
├── user-stories.spec.js          # 主要使用者故事測試（US 1.1–4.1 + 登入/頁面可訪問性）
├── additional-regression.spec.js # 補充迴歸測試（AR-01–AR-40）
├── messages.spec.js              # 私訊與入社驗證碼功能測試（PM-01–PM-07、VC-01–VC-03）
├── global-setup.js               # 測試前自動清理 + seed 資料
├── global-teardown.js            # 測試後清理
├── dev-router.php                # Playwright webServer 路由（整合前後端）
├── RUNNING_TESTS.md              # 本文件
└── README.md                     # 詳細說明文件
```

### 測試覆蓋範圍

| 功能 | spec 檔 | 狀態 |
|------|---------|------|
| 社團列表與搜尋篩選 | user-stories | ✅ |
| 社團詳情與追蹤 | user-stories | ✅ |
| 資料時間戳 | user-stories | ✅ |
| 活動發布與瀏覽 | user-stories | ✅ |
| 平台管理員功能 | user-stories | ✅ |
| 登入與權限 | user-stories | ✅ |
| 頁面可訪問性 | user-stories | ✅ |
| 首頁進階搜尋 | additional-regression | ✅ |
| 社團列表篩選與導覽 | additional-regression | ✅ |
| 活動頁篩選器 | additional-regression | ✅ |
| QA 互動細節 | additional-regression | ✅ |
| 社團編輯同步驗證 | additional-regression | ✅ |

---

## 測試帳號

所有帳號預設密碼：`Test123456`

| 帳號 | 角色 |
|------|------|
| `student@univ.edu` | 一般學生 |
| `clubadmin@univ.edu` | 社團幹部（程式社社長、羽球社幹部） |
| `admin@univ.edu` | 平台管理員 |

> 帳號資料由 `global-setup.js` 在每次測試前自動 seed，不需要手動建立。

---

## 故障排查

### Q: 測試超時？
1. 確認 MySQL 服務正常運行（AppServ / XAMPP）
2. 確認 port 8000 未被佔用：`netstat -ano | findstr :8000`
3. 在 `playwright.config.js` 調高 `timeout`

### Q: Firefox 測試出現 `Cannot read properties of undefined (reading '_page')`？
根因是 Firefox 在 Windows/Playwright 環境建立分頁時，content subprocess 被 sandbox 擋住，page 一建立就 crash。

已在 `playwright.config.js` 的 Firefox project 加上以下環境變數停用 sandbox：

```javascript
launchOptions: {
  env: {
    ...process.env,
    MOZ_DISABLE_CONTENT_SANDBOX: '1',
    MOZ_DISABLE_RDD_SANDBOX: '1',
    MOZ_DISABLE_GPU_SANDBOX: '1',
  },
},
```

若仍出現 Firefox 相關錯誤，可單獨跑 Firefox 確認：
```bash
npm run test:firefox
```

### Q: 找不到元素 / 登入失敗？
1. 確認資料庫已執行 migration：`php run_migration.php`
2. 用 UI 模式逐步調試：`npm run test:ui`

### Q: port 8000 已被佔用？
`playwright.config.js` 設定 `reuseExistingServer: true`（非 CI），會直接使用已在運行的伺服器。確認已運行的伺服器路由設定與 `dev-router.php` 相容。

---

## 配置說明

目前 `playwright.config.js` 的關鍵設定：

```javascript
retries: process.env.CI ? 2 : 1,   // 本機失敗重試 1 次
workers: process.env.CI ? 1 : 4,   // 本機 4 個 worker
fullyParallel: true,

// Firefox: 停用 Windows sandbox 以防 content process crash
// (症狀: browserContext.newPage 拋出 _page undefined)
firefox project launchOptions.env:
  MOZ_DISABLE_CONTENT_SANDBOX: '1'
  MOZ_DISABLE_RDD_SANDBOX: '1'
  MOZ_DISABLE_GPU_SANDBOX: '1'
```

CI 環境（`CI=true`）只跑 Chromium，不跑 Firefox 與 WebKit：

```javascript
projects: [
  { name: 'chromium', ... },
  ...(process.env.CI ? [] : [
    { name: 'firefox', ... },
    { name: 'webkit', ... },
  ]),
]
```

---

## 持續集成

### CI 環境注意事項

- 設定 `CI=true` 環境變數，測試只跑 Chromium（Firefox/WebKit 需系統依賴，sandbox 中無法安裝）
- 只需安裝 Chromium：`npx playwright install chromium`
- 不需要 `--with-deps`

### GitHub Actions 範例

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      CI: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npx playwright install chromium
      - run: npm test
```

---

## 相關資源

- [Playwright 官方文件](https://playwright.dev)
- [測試報告](../../TESTING_REPORT.md)
- [手動驗收清單](../manual/user_story_acceptance_checklist.md)
