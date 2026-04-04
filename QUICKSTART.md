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
- AppServ / Apache / PHP
- MySQL 8.0+ 或 MariaDB
- 可執行 PowerShell

## 安裝步驟

### 1. 匯入資料庫

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p club_platform < database/migrations/2026_04_01_user_stories_core.sql
mysql -u root -p club_platform < database/migrations/2026_04_03_event_tags.sql
mysql -u root -p club_platform < database/migrations/2026_04_03_qa_urgency.sql
mysql -u root -p club_platform < database/migrations/2026_04_04_event_poster_path.sql
mysql -u root -p club_platform < database/migrations/2026_04_04_qa_reply_helpful.sql
mysql -u root -p club_platform < database/seeds/test_accounts_and_story_data.sql
```

可選方案：使用 `run_migration.php` 執行整批遷移（執行前先確認資料庫連線設定）。

### 2. 設定連線
編輯 `backend/config.php`，確認資料庫名稱、帳號、密碼與埠號。

### 3. 檢查資料夾權限
確認以下資料夾存在且可寫入：
- `frontend/assets/uploads`
- `backend/uploads`
- `logs`

## 啟動方式

### 方式一：PHP 內建伺服器

```bash
cd frontend
php -S localhost:8000
```

打開 `http://localhost:8000` 即可。

### 方式二：AppServ / Apache
將專案放到網站根目錄，並確認前端頁面與 API 路徑都指向正確位置。

## 測試帳號

- 管理員：admin@univ.edu / Test123456
- 幹部：clubadmin@univ.edu / Test123456
- 學生：student@univ.edu / Test123456

## 常見問題

### 無法連線資料庫
- 確認 MySQL 已啟動
- 檢查 `config.php` 內的帳密
- 確認資料庫名稱是 `club_platform`

### 頁面沒有樣式
- 檢查 `frontend/css/styles.css` 的引用路徑
- 確認目前開啟的是 `frontend/index.html` 或 `frontend/pages/*`

### API 回傳 404
- 檢查前端 `main.js` 的 API 路徑
- 確認後端資料夾位於 `backend/`

## 相關文件

- [README](README.md)
- [專案進度](PROJECT_STATUS.md)
- [完成總結](COMPLETION_REPORT.md)
- [測試報告](TESTING_REPORT.md)
- [手動驗收清單](tests/manual/user_story_acceptance_checklist.md)
- [版本發布紀錄](RELEASE_NOTES_2026-04-04.md)
