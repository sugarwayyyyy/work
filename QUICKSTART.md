# 快速開始指南

## 1️⃣ 資料庫設置

### 使用 MySQL Workbench 8.0 CE

1. **打開 MySQL Workbench**
   - 啟動應用程序
   - 連接到您的本地 MySQL 服務器

2. **建立資料庫**
   - 在頂部菜單欄選 `File` → `Open SQL Script`
   - 選擇 `database/schema.sql` 文件
   - 點按 `Execute` 按鈕或按 `Ctrl+Shift+Enter`

3. **驗證結果**
   - 在左側導覽欄應該看到 `club_platform` 資料庫
   - 展開該資料庫查看所有表格

### 套用 User Story 遷移與測試資料

在匯入 `database/schema.sql` 後，請依序執行：

```bash
mysql -u root -p club_platform < database/migrations/2026_04_01_user_stories_core.sql
mysql -u root -p club_platform < database/seeds/test_accounts_and_story_data.sql
```

這會補齊：
- Soft Delete 欄位與通知表
- 動態牆排序所需欄位
- 測試帳號（管理員/幹部/學生）

### 命令行方式（可選）

```bash
# 進入項目目錄
cd "社團活動資訊統整平台"

# 執行 SQL 腳本
mysql -u root -p < database/schema.sql

# 系統會提示輸入密碼，請輸入您的 MySQL root 用戶密碼
```

## 2️⃣ 配置後端設置

編輯 `backend/config.php` 文件，更新資料庫連接參數：

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASSWORD', 'your_password');  // 改為您的 MySQL 密碼
define('DB_NAME', 'club_platform');
define('DB_PORT', 3306);
```

如果使用空密碼供本地開發（不推薦用作生產環境），留空即可：
```php
define('DB_PASSWORD', '');
```

## 3️⃣ 啟動開發伺服器

### 方式一：使用 PHP 內建伺服器（推薦開發環境使用）

```bash
# 進入前端目錄
cd "社團活動資訊統整平台\frontend"

# 啟動 PHP 伺服器
php -S localhost:8000
```

然後在瀏覽器中訪問：
```
http://localhost:8000
```

### 方式二：使用 Visual Studio Code 內建伺服器

1. 在 VS Code 中安裝 `Live Server` 擴展
2. 右鍵點擊 `index.html`
3. 選擇 `Open with Live Server`

### 方式三：在 Apache 或 Nginx 上部署

資料夾配置並複製項目到 web root（例如 `C:\xampp\htdocs\`），確保配置中的 API 路徑正確。

## 4️⃣ 項目結構簡介

```
📦 社團活動資訊統整平台
├── 📁 frontend/          # 前端發送端代碼
│   ├── 📄 index.html     # 首頁
│   ├── 📁 css/           # 樣式表
│   ├── 📁 js/            # JavaScript 工具
│   ├── 📁 pages/         # HTML 頁面
│   │   ├── login.html    # 登入頁面
│   │   ├── register.html # 註冊頁面
│   │   ├── club-list.html# 社團列表
│   │   ├── events.html   # 活動列表
│   │   └── qa.html       # 提問列表
│   └── 📁 assets/        # 靜態資源
│
├── 📁 backend/           # 後端服務代碼
│   ├── 📄 config.php     # 配置文件
│   ├── 📄 db.php         # 資料庫連接
│   ├── 📄 auth.php       # 認證系統
│   └── 📁 api/           # API 端點
│       ├── auth.php      # 用戶認證
│       ├── clubs.php     # 社團管理
│       ├── events.php    # 活動管理
│       ├── qa.php        # 提問系統
│       └── reviews.php   # 評價系統
│
├── 📁 database/          # 資料庫腳本
│   └── 📄 schema.sql     # 資料庫設計
│
└── 📄 README.md          # 項目文檔
```

## 5️⃣ 測試帳號

如已匯入 seed，請直接使用：

```text
管理員：admin@univ.edu / Test123456
幹部：clubadmin@univ.edu / Test123456
學生：student@univ.edu / Test123456
```

若未匯入 seed，可透過註冊頁面建立測試帳號：

### 建立測試帳號步驟：

1. **進入註冊頁面**
   - 點擊首頁右上角「登入」按鈕
   - 點擊「立即註冊」鏈接

2. **填寫必要信息**
   ```
   姓名：測試用戶
   郵箱：test@university.edu
   密碼：Test123456
   確認密碼：Test123456
   ```

3. **完成註冊**
   - 點擊「建立帳號」按鈕
   - 系統會自動重定向到登入頁面

4. **帳號登入**
   ```
   郵箱：test@university.edu
   密碼：Test123456
   ```

## 6️⃣ 核心功能演示

### 瀏覽社團
1. 訪問 `http://localhost:8000/pages/club-list.html`
2. 可以按分類篩選和搜尋社團
3. 點擊「查看詳情」進入社團頁面

### 查看活動
1. 訪問 `http://localhost:8000/pages/events.html`
2. 查看所有發布的活動
3. 點擊「查看活動」進行報名

### 提問
1. 點擊「提問列表」頁面
2. 登入後點擊「發布新提問」
3. 選擇社團並發布提問

## 7️⃣ 故障排除

### ❌ 錯誤：資料庫連接失敗

**原因**：MySQL 服務未啟動或連接參數不正確

**解決方案**：
1. 確保 MySQL 服務正在運行
2. 驗證 `config.php` 中的主機名、用戶名和密碼
3. 確認 MySQL 預設端口是 3306

### ❌ 錯誤：404 Not Found（API 呼叫失敗）

**原因**：API 路徑設置錯誤

**解決方案**：
1. 檢查 `js/main.js` 中的 `API_URL` 常數
2. 確保後端文件結構與前端代碼一致

### ❌ 錯誤：頁面樣式不顯示

**原因**：CSS 文件路徑不正確

**解決方案**：
1. 檢查瀏覽器控制台是否有 404 錯誤
2. 驗證 HTML 中的 CSS 引用路徑

### ❌ 錯誤：文件上傳失敗

**原因**：目錄權限不足

**解決方案**：
```bash
# Windows PowerShell 管理員
mkdir -Path "frontend\assets\uploads", "backend\uploads" -Force
```

## 8️⃣ API 測試

### 使用 Postman 或 cURL 測試 API

#### 測試註冊 API
```bash
curl -X POST "http://localhost:8000/../backend/api/auth.php?action=register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 測試登入 API
```bash
curl -X POST "http://localhost:8000/../backend/api/auth.php?action=login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 執行 User Story 自動化驗收腳本

```powershell
pwsh -File tests/api/acceptance_user_stories.ps1 -BaseUrl "http://localhost:8000/../backend/api"
```

手動驗收清單請見：

```text
tests/manual/user_story_acceptance_checklist.md
```

## 9️⃣ 開發提示

### 啟用調試模式
編輯 `backend/config.php`：
```php
define('DEBUG_MODE', true);
```

### 查看错误日誌
```bash
# 查看最近的 100 行
tail -100 logs/error.log

# 實時監看（如果存在）
tail -f logs/error.log
```

### 資料庫備份
```bash
# 備份資料庫
mysqldump -u root -p club_platform > backup.sql

# 恢復資料庫
mysql -u root -p club_platform < backup.sql
```

## 🔟 後續步驟

1. **完成待開發頁面**：
   - 社團詳情頁面（`club-detail.html`）
   - 活動詳情頁面（`event-detail.html`）
   - 提問詳情頁面（`qa-detail.html`）
   - 管理後台

2. **添加功能**：
   - 圖片上傳功能
   - Email 通知系統
   - 行事曆同步功能
   - 高級搜尋和過濾

3. **優化性能**：
   - 添加數據庫索引
   - 使用查詢緩存
   - 非同步操作優化

4. **部署上線**：
   - 購買域名和伺服器
   - 配置 SSL 證書
   - 設置自動備份

---

**需要幫助？** 檢查 README.md 獲取更詳細的文檔。
