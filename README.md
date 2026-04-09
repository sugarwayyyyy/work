# 社團活動資訊統整平台

校園社團資訊整合與管理平台，提供學生瀏覽社團與活動、社團幹部維護內容、管理員統整平台資料與公告的完整流程。

## 目錄
- [專案概覽](#專案概覽)
- [功能架構](#功能架構)
- [專案結構](#專案結構)
- [技術棧](#技術棧)
- [安裝與初始化](#安裝與初始化)
- [執行方式](#執行方式)
- [測試資料](#測試資料)
- [測試與驗收](#測試與驗收)
- [API 概覽](#api-概覽)
- [版本與發布紀錄](#版本與發布紀錄)
- [文件索引](#文件索引)
- [目前狀態](#目前狀態)
- [維護建議](#維護建議)

## 專案概覽

本專案以 PHP、MySQL、HTML、CSS、JavaScript 建置，目標是把校園社團的資訊、活動、互動、公告與管理流程集中在同一平台。

### 角色分工
- 學生：瀏覽社團、追蹤社團、報名活動、參與評價與提問。
- 社團幹部：更新社團資訊、建立活動、管理海報與內容。
- 管理員：維護社團資料、公告、帳號轉讓與平台報表。

## 功能架構

### 學生端
- 社團分類與關鍵字搜尋
- 社團詳情與活動瀏覽
- 追蹤社團與個人動態
- 評價與 Q&A 互動
- 通知與個人資料管理

### 社團幹部端
- 社團基本資料編修
- 活動建立、更新與海報上傳
- 社團預覽與內容管理
- 活動清單與管理介面

### 管理員端
- 用戶與社團管理
- 系統公告發布與刪除
- 帳號轉讓紀錄
- 報表與回饋檢視
- 社團狀態與權限控制

## 專案結構

```text
社團活動資訊統整平台/
├── backend/
│   ├── config.php
│   ├── db.php
│   ├── auth.php
│   └── api/
│       ├── admin.php
│       ├── auth.php
│       ├── club-admin.php
│       ├── clubs.php
│       ├── events.php
│       ├── notifications.php
│       ├── qa.php
│       ├── reviews.php
│       └── upload.php
├── database/
│   ├── schema.sql
│   ├── migrations/
│   └── seeds/
├── frontend/
│   ├── index.html
│   ├── assets/
│   ├── css/
│   ├── js/
│   └── pages/
├── tests/
│   ├── api/
│   └── manual/
├── logs/
└── README.md
```

## 技術棧

- 前端：HTML5、CSS3、Vanilla JavaScript
- 後端：PHP 7.4+、MySQL / MySQLi
- 開發環境：Windows、AppServ、Apache
- 測試工具：PowerShell、自動化 API 驗收腳本、手動驗收清單

## 安裝與初始化

避免文件重複維護，完整步驟集中於 [QUICKSTART.md](QUICKSTART.md)。

快速摘要：
1. 匯入 `database/schema.sql` 與 `database/migrations/*`。
2. 編輯 `backend/config.php` 設定資料庫連線。
3. 確認 `frontend/assets/uploads`、`backend/uploads`、`logs` 可寫入。

## 執行方式

### 開發環境
在前端資料夾啟動內建伺服器：

```bash
cd frontend
php -S localhost:8000
```

然後開啟首頁。

### AppServ / Apache
如果使用 AppServ，將專案放在網站根目錄下，並確認前端頁面引用路徑與 API 路徑一致。

## 測試資料

避免重複維護，測試帳號與初始化資料請以 [QUICKSTART.md](QUICKSTART.md) 為準。

## 測試與驗收

### 自動化驗收
```powershell
pwsh -File tests/api/acceptance_user_stories.ps1 -BaseUrl "http://localhost:8000/../backend/api"
```

### 手動驗收
- [手動驗收清單](tests/manual/user_story_acceptance_checklist.md)

### 測試文件
- [測試報告](TESTING_REPORT.md)
- [測試分工表](TESTING_TEAM.md)
- [測試者名單](TESTERS_ASSIGNMENT.md)

## API 概覽

### 認證
- `backend/api/auth.php`
- 登入、登出、註冊、取得目前使用者

### 社團
- `backend/api/clubs.php`
- 社團列表、詳情、追蹤與管理

### 活動
- `backend/api/events.php`
- 活動列表、詳情、建立、更新與報名

### 問答與評價
- `backend/api/qa.php`
- `backend/api/reviews.php`

### 管理與上傳
- `backend/api/admin.php`
- `backend/api/club-admin.php`
- `backend/api/upload.php`
- `backend/api/notifications.php`

## 版本與發布紀錄

- [Release Notes 2026-04-04](RELEASE_NOTES_2026-04-04.md)

## 文件索引

- [正式文件首頁索引](DOCS_INDEX.md)
- [快速開始](QUICKSTART.md)
- [專案進度](PROJECT_STATUS.md)
- [完成總結](COMPLETION_REPORT.md)
- [測試報告](TESTING_REPORT.md)
- [測試分工表](TESTING_TEAM.md)
- [測試者名單](TESTERS_ASSIGNMENT.md)
- [手動驗收清單](tests/manual/user_story_acceptance_checklist.md)
- [版本發布紀錄](RELEASE_NOTES_2026-04-04.md)

## 目前狀態

- 核心資料庫與 API 已具備。
- 前端學生端、社團幹部端與管理員端頁面已建立。
- 驗收與測試文件已整理完成。
- 目前工作重點集中在資料清理、介面美化與文件整併。

## 維護建議

1. 新增功能前先同步更新資料庫遷移與測試資料。
2. API 有改動時，同步更新 README 與快速開始文件。
3. 若前端頁面路由或資源路徑變動，先更新文件中的啟動說明。
4. 測試文件建議以目前版本為準，避免重複保留舊版說明。
