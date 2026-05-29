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

### 0. Clone 後的一次性設定

#### 0-a. 設定本機環境（DB 密碼 + Google OAuth + SSL 憑證）

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-google-oauth.ps1
```

此腳本會自動下載 `cacert.pem` 並建立 `backend/config.local.php`，一次解決 DB 連線與 Google 登入設定。

#### 0-c. 設定 Git Hooks

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-git-hooks.ps1
```

此 hook 會在 `git commit` 時，偵測 `backend/` 有修改但缺少對應 migration 時自動提醒。

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
mysql -u root -p club_platform < database/migrations/2026_05_22_club_fee_per_session.sql
mysql -u root -p club_platform < database/migrations/2026_05_22_club_member_fee_paid.sql
mysql -u root -p club_platform < database/migrations/2026_05_22_club_member_join.sql
mysql -u root -p club_platform < database/migrations/2026_05_23_private_messages.sql
mysql -u root -p club_platform < database/migrations/2026_05_23_club_join_applications.sql
mysql -u root -p club_platform < database/migrations/2026_05_23_bot_messages.sql
mysql -u root -p club_platform < database/migrations/2026_05_23_user_notes.sql
mysql -u root -p club_platform < database/migrations/2026_05_24_event_posters.sql
mysql -u root -p club_platform < database/migrations/2026_05_24_note_messages.sql
mysql -u root -p club_platform < database/migrations/2026_05_24_private_message_recall.sql
mysql -u root -p club_platform < database/migrations/2026_05_24_note_messages_recall.sql
mysql -u root -p club_platform < database/migrations/2026_05_24_message_reactions.sql
mysql -u root -p club_platform < database/migrations/2026_05_24_private_message_reply.sql
mysql -u root -p club_platform < database/seeds/2026_04_02_school_clubs_seed.sql
mysql -u root -p club_platform < database/seeds/test_accounts_and_story_data.sql
```

> migration 清單需與 `database/migrations/` 完全一致（目前共 26 支）；新增 migration 後請同步更新此段。

#### 活動海報規格（對應資料庫）
- 活動海報資料表：`event_posters`（migration：`2026_05_24_event_posters.sql`）。
- 每個活動最多 10 張海報（由 `backend/api/upload.php` 上傳流程驗證）。
- 每張上限 10MB、僅支援 JPG／PNG／GIF／WebP（由 `backend/config.php` 的 `MAX_FILE_SIZE` 與 `ALLOWED_IMAGE_TYPES` 控制）。

> seed 順序不可顛倒：先匯入 `school_clubs_seed`（社團基礎資料），再匯入 `test_accounts_and_story_data`（測試帳號與活動，會參照社團 ID）。

可選方案：使用 `run_migration.php` 執行整批遷移，再手動補執行兩個 seed 檔案（`run_migration.php` 不含 seed）。

#### 驗證資料庫是否完整

匯入完成後，可執行以下指令確認所有資料表與欄位均已建立：

```bash
php scripts/check_tables.php
```

輸出會列出所有資料表及欄位清單；若發現缺少資料表或欄位，代表對應的 migration 尚未執行。

### 2. 設定本機連線

#### 2-a. 快速設定（建議，含 Google OAuth）

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-google-oauth.ps1
```

此腳本會自動完成：
- 偵測 PHP 目錄並下載 `cacert.pem`（解決 AppServ Windows SSL 錯誤）
- 建立 `backend/config.local.php`（填入 DB 密碼與 Google Client ID）

#### 2-b. 手動建立（若自動腳本無法執行）

建立 `backend/config.local.php`（此檔案已加入 `.gitignore`，不會進 git）：

```php
<?php
define('DB_PASSWORD', '12345678');  // AppServ 預設；XAMPP 請改為 ''

// Google OAuth（團隊共用同一組 Client ID，無需自行建立 Google 專案）
define('GOOGLE_CLIENT_ID', '718377517460-kotdm5ch47ib6ije5o65tidkvukshmsb.apps.googleusercontent.com');

// Windows AppServ/XAMPP 必填（解決 curl error 60 SSL 憑證錯誤）
// 先從 https://curl.se/ca/cacert.pem 下載，存至 PHP 目錄後填入路徑：
// define('GOOGLE_CA_BUNDLE', 'D:/app/appserv/php7/cacert.pem');
```

> `config.php` 會自動偵測常見的 cacert.pem 位置（AppServ D:/C: 磁碟機、XAMPP），
> 若 `setup-google-oauth.ps1` 已下載至標準位置，通常不需要手動設定 `GOOGLE_CA_BUNDLE`。

#### Google OAuth 授權來源（repo 維護者負責管理）

所有人共用同一個 Google Cloud 專案，**不需要各自建立**。
若 Google 登入失敗（`origin not allowed`），請通知 repo 維護者將你的本機 URL 加入：

> [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
> → OAuth 2.0 Client IDs → 已授權的 JavaScript 來源

目前已授權的來源：
- `http://localhost`
- `http://localhost:8000`
- `http://localhost:8080`
- `http://127.0.0.1`

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
