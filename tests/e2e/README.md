# Playwright E2E 測試指南

本專案使用 **Playwright** 進行端對端 (E2E) 測試，以驗證使用者故事的功能實現。

## 目錄
- [安裝](#安裝)
- [執行測試](#執行測試)
- [測試結構](#測試結構)
- [測試帳號](#測試帳號)
- [常見問題](#常見問題)

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

測試文件位置：`tests/e2e/user-stories.spec.js`

### 涵蓋的使用者故事

| US 代碼 | 功能 | AC 涵蓋 |
|--------|------|--------|
| US 1.1 | 社團列表與搜尋篩選 | 3/3 ✅ |
| US 1.3 | 追蹤功能與動態牆 | 2/3 ✅ |
| US 1.5 | 資料時間戳 | 1/2 ✅ |
| US 2.1 | 社團幹部編輯資訊 | 3/3 ✅ |
| US 2.2 | 社團活動發布 | 2/2 ✅ |
| US 4.1 | 平台管理員功能 | 2/2 ✅ |
| 登入/權限 | 使用者認證 | 4/4 ✅ |
| 頁面加載 | 可訪問性 | 3/3 ✅ |

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

## 前置條件

在執行測試之前，確保以下服務已啟動：

### 1. 啟動前端服務器（終端 1）
```bash
cd frontend
php -S localhost:8000
```

### 2. 啟動後端服務器（終端 2）
```bash
cd backend
php -S 127.0.0.1:8080
```

### 3. 確保 MySQL 資料庫已初始化
```bash
# 執行所有資料庫遷移和種子資料
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

## 常見問題

### Q: 測試超時？
**A**: 確保前端和後端服務器都已啟動，並且可以正常訪問。

### Q: 找不到元素？
**A**: 元素選擇器可能需要根據前端的實際 HTML 結構調整。檢查 `page.locator()` 中的選擇器。

### Q: 如何在測試中添加新的測試用例？
**A**: 
1. 在 `tests/e2e/user-stories.spec.js` 中添加新的 `test()` 區塊
2. 使用 `test.describe()` 將相關測試分組
3. 使用 `expect()` 進行斷言

### Q: 如何調試失敗的測試？
**A**: 
1. 使用 `npm run test:debug` 進行調試
2. 在測試代碼中添加 `await page.pause()` 來暫停執行
3. 查看生成的視頻或截圖

### Q: 可以並行運行測試嗎？
**A**: 是的，Playwright 默認並行運行多個工作進程。在 `playwright.config.js` 中修改 `workers` 設置。

## 參考資源

- [Playwright 官方文檔](https://playwright.dev)
- [Playwright API 參考](https://playwright.dev/docs/api/class-page)
- [測試最佳實踐](https://playwright.dev/docs/best-practices)

## 相關文件

- [PHP 驗收測試](../api/acceptance_user_stories.php) - API 層級測試
- [測試報告](../../TESTING_REPORT.md)
- [專案狀態](../../PROJECT_STATUS.md)
