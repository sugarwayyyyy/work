# 快速開始指南

本文件提供最短路徑的啟動流程，適合第一次部署或重新驗證環境時使用。

## 目錄
- [目的](#目的)
- [前置條件](#前置條件)
- [安裝步驟](#安裝步驟)
- [啟動方式](#啟動方式)
- [測試帳號](#測試帳號)
- [常見問題](#常見問題)
- [相關文件](#相關文件)

## 目的

把資料庫、後端與前端快速跑起來，確認平台可以正常瀏覽與登入。

## 前置條件

- Windows 或相容的本機環境
- AppServ 或 XAMPP（含 Apache + PHP）
- MySQL 8.0+ 或 MariaDB
- 可執行 PowerShell

## 安裝步驟

### 1. 匯入資料庫

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p club_platform < database/migrations/2026_04_01_user_stories_core.sql
mysql -u root -p club_platform < database/migrations/2026_04_03_event_tags.sql
mysql -u root -p club_platform < database/migrations/2026_04_03_qa_urgency.sql
mysql -u root -p club_platform < database/migrations/2026_04_03_transfer_request_workflow.sql
mysql -u root -p club_platform < database/migrations/2026_04_04_event_poster_path.sql
mysql -u root -p club_platform < database/migrations/2026_04_04_qa_reply_helpful.sql
mysql -u root -p club_platform < database/migrations/2026_04_09_qa_reply_threads.sql
mysql -u root -p club_platform < database/migrations/2026_04_19_event_comments.sql
mysql -u root -p club_platform < database/migrations/2026_04_19_reviews_unique_user_club.sql
mysql -u root -p club_platform < database/migrations/2026_04_28_event_time_range.sql
mysql -u root -p club_platform < database/migrations/2026_05_10_club_fee_semester.sql
mysql -u root -p club_platform < database/migrations/2026_05_11_remove_categories_religion_misc.sql
mysql -u root -p club_platform < database/migrations/2026_05_21_google_oauth.sql
mysql -u root -p club_platform < database/migrations/2026_05_22_club_member_join.sql
mysql -u root -p club_platform < database/seeds/2026_04_02_school_clubs_seed.sql
mysql -u root -p club_platform < database/seeds/test_accounts_and_story_data.sql
```

> seed 順序不可顛倒：先匯入 `school_clubs_seed`（社團基礎資料），再匯入 `test_accounts_and_story_data`（測試帳號與活動，會參照社團 ID）。

可選方案：使用 `run_migration.php` 執行整批遷移，再手動補執行兩個 seed 檔案（`run_migration.php` 不含 seed）。

### 2. 設定本機連線

建立 `backend/config.local.php`（此檔案已加入 `.gitignore`，不會進 git）：

```php
<?php
// 依照本機環境填寫，AppServ 預設密碼通常為 12345678，XAMPP 預設為空字串
define('DB_PASSWORD', '12345678');  // AppServ
// define('DB_PASSWORD', '');       // XAMPP

// （選填）Google OAuth — 填入後登入 / 註冊頁面會出現「以 Google 帳號登入」按鈕
// 未填則按鈕自動隱藏，不影響 email / password 登入
// define('GOOGLE_CLIENT_ID', 'YOUR_CLIENT_ID.apps.googleusercontent.com');
```

> `backend/config.php` 的預設值為 AppServ（密碼 `12345678`）。若使用 XAMPP（無密碼），只需建立上述檔案並取消 XAMPP 那行的注解即可。

#### 啟用 Google OAuth（選填）

1. 前往 [Google Cloud Console](https://console.cloud.google.com/) → OAuth 2.0 用戶端 → 建立 **Web application** 用戶端。
2. 在「已授權的 JavaScript 來源」加入本機開發網址，例如 `http://localhost:8000`。
3. 將產生的 Client ID 填入 `config.local.php` 的 `GOOGLE_CLIENT_ID`。
4. 設定完成後，登入與註冊頁面會自動顯示 Google 按鈕；未設定則按鈕不出現。

### 3. 檢查資料夾權限
確認以下資料夾存在且可寫入：
- `frontend/assets/uploads`
- `logs`

## 啟動方式

### 一鍵啟動（Windows PowerShell）

> **注意**：`pwsh` 為 PowerShell 7（需另行安裝）。Windows 內建為 `powershell`（PS5），請依照已安裝的版本擇一使用。

```powershell
# PowerShell 7（若已安裝）
pwsh -File scripts/start-local-dev.ps1

# PowerShell 5（Windows 內建）
powershell -ExecutionPolicy Bypass -File scripts/start-local-dev.ps1
```

停止：

```powershell
# PowerShell 7
pwsh -File scripts/stop-local-dev.ps1

# PowerShell 5
powershell -ExecutionPolicy Bypass -File scripts/stop-local-dev.ps1
```

### 方式一：AppServ / Apache（建議）

確保專案位於 Web 根目錄後，直接開啟：

```text
http://localhost/社團活動資訊統整平台/frontend/index.html
```

### 方式二：PHP 內建前端伺服器（localhost:8000）

```bash
cd frontend
php -S localhost:8000
```

打開 `http://localhost:8000` 即可。

若使用方式二，後端 API 需擇一可用：

1. Apache 提供後端：`http://localhost/社團活動資訊統整平台/backend/api`
2. 獨立啟動後端：

```bash
cd backend
php -S localhost:8080
```

若只開 `localhost:8000` 而後端未提供，頁面會顯示但資料請求會失敗。

## 測試帳號

- 管理員：admin@univ.edu / Test123456
- 幹部：clubadmin@univ.edu / Test123456
- 學生：student@univ.edu / Test123456

## 常見問題

### 無法連線資料庫
- 確認 MySQL 已啟動
- 確認已建立 `backend/config.local.php` 並填入正確密碼（AppServ: `12345678`，XAMPP: 空字串 `''`）
- 確認資料庫名稱是 `club_platform`

### 頁面沒有樣式
- 檢查 `frontend/css/styles.css` 的引用路徑
- 確認目前開啟的是 `frontend/index.html` 或 `frontend/pages/*`

### API 回傳 404
- 檢查前端 `main.js` 的 API 路徑
- 確認後端資料夾位於 `backend/`
- 若前端使用 `localhost:8000`，請確認 Apache 或 `localhost:8080` 至少一種後端模式已啟動

## 相關文件

- [README](README.md)
- [專案進度](PROJECT_STATUS.md)
- [完成總結](COMPLETION_REPORT.md)
- [測試報告](TESTING_REPORT.md)
- [手動驗收清單](tests/manual/user_story_acceptance_checklist.md)
- [版本發布紀錄](RELEASE_NOTES_2026-04-04.md)
