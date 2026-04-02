# 社團活動資訊統整平台

一個完整的校園社團管理和資訊統整平台，旨在幫助學生探索、參與和管理校園社團活動。

## 功能概覽

### Epic 1：學生端社團探索與資訊瀏覽
- ✅ 社團分類與標籤過濾搜尋
- ✅ 單一社團資訊透明化
- ✅ 活動即時通知與追蹤
- ✅ 帶有問題標籤的線上提問留言板
- ✅ 資訊時效性與更新標示
- ✅ 校園地圖導航整合
- ✅ 個人化社團行事曆訂閱

### Epic 2：社團幹部專屬後台管理
- ✅ 更新社團基本資訊
- ✅ 發布活動與宣傳
- ✅ 活動報名與人數統計
- ✅ 歷史資料歸檔管理
- ✅ 回覆線上提問留言板
- ✅ 跨社團聯合活動發布

### Epic 3：學生與社團的雙向互動與評分機制
- ✅ 查看真實社團評價
- ✅ 填寫社團活動評價（防呆機制）
- ✅ 匿名互動選項
- ✅ 檢舉不當內容機制
- ✅ 社團活躍度自動標註

### Epic 4：行政單位與平台管理員審核系統
- ✅ 統一公告與名單管理
- ✅ 贊助商媒合資訊展示
- ✅ 平台資料審核與管理
- ✅ 社團權限與帳號轉移
- ✅ 數位社團參與證明

## 技術棧

### 前端
- **HTML5** - 結構標記
- **CSS3** - 樣式設計（響應式設計）
- **JavaScript** - 動態交互和 API 調用

### 後端
- **PHP 7.4+** - 伺服器端邏輯
- **MySQL** - 資料庫管理系統（MySQLi 驅動）

### 開發工具
- **MySQL Workbench 8.0 CE** - 資料庫設計和管理

## 項目結構

```
社團活動資訊統整平台/
├── frontend/                          # 前端代碼
│   ├── index.html                    # 首頁
│   ├── css/
│   │   └── styles.css                # 全域樣式表
│   ├── js/
│   │   └── main.js                   # JavaScript 工具和函數
│   ├── pages/                        # 頁面文件
│   │   ├── login.html                # 登入頁面
│   │   ├── register.html             # 註冊頁面
│   │   ├── club-list.html            # 社團列表
│   │   ├── club-detail.html          # 社團詳情（待建立）
│   │   ├── events.html               # 活動列表
│   │   ├── event-detail.html         # 活動詳情（待建立）
│   │   ├── qa.html                   # 提問列表
│   │   ├── qa-detail.html            # 提問詳情（待建立）
│   │   ├── admin-dashboard.html      # 管理後台（待建立）
│   │   └── ...                       # 其他頁面
│   └── assets/                       # 靜態資源
│       └── uploads/                  # 上傳文件目錄
│
├── backend/                          # 後端代碼
│   ├── config.php                    # 配置文件
│   ├── db.php                        # 資料庫連接和操作
│   ├── auth.php                      # 認證和授權
│   ├── api/                          # API 端點
│   │   ├── auth.php                  # 用戶認證 API
│   │   ├── clubs.php                 # 社團 API
│   │   ├── events.php                # 活動 API
│   │   ├── qa.php                    # 提問 API
│   │   ├── reviews.php               # 評價 API
│   │   └── ...                       # 其他 API
│   └── uploads/                      # 上傳文件臨時目錄
│
├── database/
│   └── schema.sql                    # 資料庫初始化腳本
│
└── README.md                         # 本文件
```

## 安裝与配置

### 1. 資料庫設置

#### 使用 MySQL Workbench 8.0 CE：

1. 打開 MySQL Workbench
2. 連接到您的 MySQL 伺服器
3. 複製 `database/schema.sql` 的內容
4. 在 Workbench 的 SQL 編輯器中執行

或者使用命令行：

```bash
mysql -u root -p < database/schema.sql
```

並套用 user story 遷移與測試資料：

```bash
mysql -u root -p club_platform < database/migrations/2026_04_01_user_stories_core.sql
mysql -u root -p club_platform < database/seeds/test_accounts_and_story_data.sql
```

### 2. 配置後端

編輯 `backend/config.php` 文件，設置您的資料庫連接參數：

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASSWORD', 'your_password'); # 修改為您的密碼
define('DB_NAME', 'club_platform');
define('DB_PORT', 3306);
```

### 3. 設置 Web 伺服器

#### 使用 PHP 內建伺服器（開發環境）：

```bash
cd frontend
php -S localhost:8000
```

然後訪問 `http://localhost:8000`

#### 使用 Apache/Nginx（生產環境）：

1. 將項目複製到 web root（例如 `/var/www/html`）
2. 確保 PHP 已安裝並啟用
3. 配置 `.htaccess`（如果使用 Apache）用於 URL 重寫

### 4. 目錄權限

確保以下目錄有適當的寫入權限：

```bash
chmod 755 frontend/assets/uploads
chmod 755 backend/uploads
chmod 755 logs
```

## 測試指南

### User Story 驗收（自動化）

```powershell
pwsh -File tests/api/acceptance_user_stories.ps1 -BaseUrl "http://localhost:8000/../backend/api"
```

### User Story 驗收（手動）

請依清單逐項驗證：`tests/manual/user_story_acceptance_checklist.md`

### 測試團隊分配

本項目採用分層測試策略，不同端點由專門的測試團隊負責：

#### 學生端測試組 (4人)
- 用戶註冊/登入/個人資料測試
- 社團瀏覽/搜尋/追蹤功能測試
- 活動報名/參與/評價功能測試
- UI/UX和移動端適配測試

#### 社團幹部端測試組 (3人)
- 社團信息管理和Logo上傳測試
- 活動創建/編輯和海報上傳測試
- 成員管理和統計查看測試

#### 管理員端測試組 (3人)
- 用戶角色管理和社團狀態控制測試
- 系統公告發佈和管理測試
- 帳戶轉讓和報表統計測試

#### 技術測試組 (4人)
- API功能和資料庫測試
- 安全測試和權限控制測試
- 性能測試和負載測試
- 整合測試和跨瀏覽器測試

### 測試執行步驟

1. **環境準備**
   ```bash
   # 設置測試資料庫
   mysql -u root -p < database/test_data.sql
   
   # 啟動測試伺服器
   cd frontend
   php -S localhost:8000
   ```

2. **功能測試**
   - 訪問 `http://localhost:8000`
   - 按測試分工表執行各端功能測試
   - 記錄所有發現的問題

3. **性能測試**
   ```bash
   # 使用 Apache Bench 進行負載測試
   ab -n 1000 -c 10 http://localhost:8000/
   ```

### 測試報告

測試發現的問題請記錄在 `TESTING_REPORT.md` 文件中，包含：
- 問題描述
- 重現步驟
- 嚴重程度
- 負責修復人員

### 測試資源

- 📋 [測試分工表](TESTING_TEAM.md)
- 📊 [測試者名單](TESTERS_ASSIGNMENT.md)
- 🐛 [問題追蹤](TESTING_REPORT.md)

## API 端點文檔

### 認證 API (`backend/api/auth.php`)

#### 用戶註冊
```
POST /api/auth.php?action=register
Content-Type: application/json

{
  "name": "使用者名稱",
  "email": "user@example.com",
  "password": "password123",
  "student_id": "1234567" (選填)
}
```

#### 用戶登入
```
POST /api/auth.php?action=login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 取得當前用戶
```
GET /api/auth.php?action=current
```

### 社團 API (`backend/api/clubs.php`)

#### 取得社團列表
```
GET /api/clubs.php?category_id=1&tags=1,2&search=keyword&page=1
```

#### 取得社團詳情
```
GET /api/clubs.php?action=detail&id=1
```

#### 追蹤/取消追蹤社團
```
POST /api/clubs.php?action=toggle_follow&id=1
```

### 活動 API (`backend/api/events.php`)

#### 取得活動列表
```
GET /api/events.php?club_id=1&status=published&page=1
```

#### 取得活動詳情
```
GET /api/events.php?action=detail&id=1
```

#### 報名活動
```
POST /api/events.php?action=register&id=1
```

### 提問 API (`backend/api/qa.php`)

#### 取得提問列表
```
GET /api/qa.php?club_id=1&page=1
```

#### 發布提問
```
POST /api/qa.php?action=create
Content-Type: application/json

{
  "club_id": 1,
  "question_title": "標題",
  "question_content": "內容",
  "is_anonymous": true,
  "tag_ids": [1, 2]
}
```

#### 回覆提問
```
POST /api/qa.php?action=reply&id=1
Content-Type: application/json

{
  "reply_content": "回覆內容",
  "is_anonymous": false
}
```

### 評價 API (`backend/api/reviews.php`)

#### 取得評價列表
```
GET /api/reviews.php?club_id=1&page=1
```

#### 發布評價
```
POST /api/reviews.php?action=create
Content-Type: application/json

{
  "club_id": 1,
  "rating": 4,
  "review_title": "標題",
  "review_content": "評價內容",
  "is_anonymous": false,
  "event_attended_id": 1 (選填)
}
```

## 頁面清單

### 待開發頁面
- [ ] `club-detail.html` - 社團詳情頁面
- [ ] `event-detail.html` - 活動詳情和報名
- [ ] `qa-detail.html` - 提問詳情和回覆
- [ ] `user-profile.html` - 用戶個人檔案
- [ ] `admin-dashboard.html` - 管理後台
- [ ] `club-admin-dashboard.html` - 社團管理後台
- [ ] `notifications.html` - 通知中心
- [ ] `calendar.html` - 集成行事曆

## 資料庫模型

### 核心表格

1. **users** - 用戶表
   - 存儲用戶賬戶信息（學生、社團幹部、管理員）

2. **clubs** - 社團表
   - 存儲社團基本信息、分類、活躍度標誌等

3. **events** - 活動表
   - 存儲社團活動信息

4. **club_members** - 社團成員
   - 用戶與社團的關聯關係

5. **event_registrations** - 活動報名
   - 用戶活動報名記錄

6. **q_and_a** - 提問留言板
   - 存儲提問和回覆

7. **reviews** - 社團評價
   - 存儲用戶對社團的評價

8. **reports** - 檢舉記錄
   - 存儲不當內容檢舉

詳見 `database/schema.sql` 以了解完整的資料庫設計。

## 安全考慮

1. **密碼加密** - 使用 PHP 的 `password_hash()` 和 `password_verify()` 進行密碼管理
2. **SQL 注入防護** - 使用預備語句（Prepared Statements）
3. **CSRF 保護** - 生成並驗證 CSRF Token
4. **輸入驗證** - 客戶端和伺服器端的雙重驗證
5. **會話管理** - 設置會話超時和安全 cookie 選項
6. **匿名選項** - 支持匿名發布提問和評價

## 開發指南

### 前端開發
1. 所有頁面使用 `../js/main.js` 中的工具函數
2. 使用 `APIClient` 類進行 API 調用
3. 使用 `PageUtils` 類進行 UI 操作
4. 使用 `StorageUtils` 管理本地數據

### 後端開發
1. 所有 API 端點應返回統一的 JSON 格式
2. 使用 `Helper` 類進行驗證和響應
3. 使用 `Auth` 類進行身份驗證和授權
4. 使用 Database 類進行資料庫操作

### 命名規範
- PHP 類名：PascalCase（例：UserAPI）
- PHP 函數名：camelCase（例：getUserInfo）
- JavaScript 變量：camelCase（例：currentPage）
- 資料庫表名：snake_case（例：club_members）

## 常見問題

### 1. 資料庫連接失敗
- 檢查 MySQL 服務是否運行
- 驗證 `config.php` 中的連接參數
- 確認用戶名和密碼是否正確

### 2. 編碼問題
- 確保所有文件都以 UTF-8 編碼保存
- 驗證資料庫字符集設置為 utf8mb4

### 3. 上傳文件無法保存
- 檢查目錄權限（755）
- 驗證 PHP 配置中的 `max_upload_filesize`

## 貢獻指南

1. 確保代碼遵循項目的命名規範
2. 添加必要的註解和文檔
3. 測試所有新功能
4. 提交清晰的提交信息

## 許可證

本項目為教育用途，請根據您的學校政策使用。

## 支持

如需幫助，請查看代碼註解或與開發團隊聯繫。

---

**最後更新**：2026年3月21日
**版本**：1.0.0
