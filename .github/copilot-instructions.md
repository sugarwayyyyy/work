# Copilot Instructions - 社團活動資訊統整平台

本文件提供 AI 代理與新同事「下載後可直接啟用」的最短路徑。

## 1. 專案定位

- 前端：`frontend/`（多頁 HTML + CSS + JS）
- 後端 API：`backend/api/*.php`
- 共用後端設定：`backend/config.php`
- 資料庫：`database/schema.sql` + `database/migrations/*.sql`

## 2. 必要環境

- PHP 7.4+
- MySQL 8.0+
- Windows PowerShell（建議）

## 3. 第一次啟用（必做）

1. 建立資料庫並匯入 schema

```powershell
mysql -u root -p < database/schema.sql
```

2. 執行 migration（建議用整包腳本）

```powershell
php run_migration.php
```

3. 匯入測試資料（可選，但建議）

```powershell
mysql -u root -p club_platform < database/seeds/test_accounts_and_story_data.sql
```

4. 設定資料庫連線

- 編輯 `backend/config.php`
- 確認 `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME/DB_PORT`

5. 確認可寫入資料夾

- `frontend/assets/uploads`
- `logs`

## 4. 啟動方式（建議兩種）

### 方式 A：AppServ/Apache（最穩定）

- 專案放在 `C:\AppServ\www\社團活動資訊統整平台`
- 開啟：`http://localhost/社團活動資訊統整平台/frontend/index.html`

### 方式 B：前端本機伺服器 + 後端由 Apache 提供

```powershell
cd frontend
php -S localhost:8000
```

- 開啟：`http://localhost:8000`
- 前端 JS 會自動嘗試多組 API base path fallback。

## 5. 啟動後快速驗證

1. 打開登入頁：`frontend/pages/login.html`
2. 測試帳號登入
- 管理員：`admin@univ.edu / Test123456`
- 幹部：`clubadmin@univ.edu / Test123456`
- 學生：`student@univ.edu / Test123456`
3. 至首頁確認「公告、社團、活動」有資料

## 6. API 路由規則（簡版）

- 認證：`backend/api/auth.php?action=...`
- 社團：`backend/api/clubs.php?action=...`
- 活動：`backend/api/events.php?action=...`
- QA：`backend/api/qa.php?action=...`
- 評價：`backend/api/reviews.php?action=...`
- 通知：`backend/api/notifications.php?action=...`
- 管理員：`backend/api/admin.php?action=...`
- 幹部：`backend/api/club-admin.php?action=...`

## 7. 常見問題

### Q1：前端顯示登入狀態異常或 API 401

- 先確認資料庫 migration 是否完整
- 確認 `backend/config.php` 連線正確
- 確認瀏覽器可帶 cookie（同站點測試）

### Q2：圖片上傳失敗

- 確認 `frontend/assets/uploads` 可寫入
- 確認 `php.ini` 的 `upload_max_filesize` 與 `post_max_size`

### Q3：功能正常但資料缺欄位

- 代表 migration 沒跑齊，執行：`php run_migration.php`

## 8. AI 代理工作準則

- 先讀 `README.md` 與 `QUICKSTART.md`，再讀本檔。
- 若涉及資料表/欄位問題，優先檢查 `run_migration.php` 與 `database/migrations/`。
- 不要假設單一路徑；此專案前端有 API fallback。
- 變更前端時，優先保持現有 UI/互動一致性，避免破壞既有頁面流程。
