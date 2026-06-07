# 社團活動資訊統整平台

校園社團資訊整合與管理平台，提供學生瀏覽社團與活動、社團幹部維護內容、管理員統整平台資料與公告的完整流程。

## 目錄
- [專案概覽](#專案概覽)
- [AI 與新同事啟用](#ai-與新同事啟用)
- [AI 開發原則](#ai-開發原則)
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
- 學生：瀏覽社團、追蹤或加入社團（含費用方案選擇）、報名活動、參與評價與提問。
- 社團幹部：更新社團資訊、建立活動、管理海報與內容、管理成員職稱。
- 管理員：維護社團資料、公告、帳號轉讓與平台報表、指派幹部、指派類別助教。
- 類別助教：由管理員指派負責單一社團分類，僅能檢視與管理其負責類別下的社團。

## AI 與新同事啟用

若是 AI 代理、Copilot 或新同事第一次下載本專案，請先閱讀：

- [.github/copilot-instructions.md](.github/copilot-instructions.md)

此文件提供可直接執行的啟動步驟、資料庫初始化、常見錯誤排查與驗證方式。

---

## AI 開發原則

**本節適用於所有 AI 編碼工具（Codex、Claude、GitHub Copilot 等），尤其是後端修改。違反以下原則會直接影響安全性或資料完整性。**

### 檔案編碼（鐵則，最優先）

> **所有檔案一律使用 UTF-8（不含 BOM）編碼**，含 `.sql`、`.php`、`.html`、`.css`、`.js`、`.md`。

- 本專案在 **Windows + CP950 / Big5** 環境開發。若以非 UTF-8 儲存含中文的檔案，會出現亂碼（例如把中文寫成 2708 個 `?`、或 `锟斤拷` 之類），且 **AI 工具讀檔時會把它誤判成亂碼並反覆回報**——這通常不是內容錯誤，而是編碼錯誤。
- 編輯器請固定以 **UTF-8** 儲存。**不要**用記事本「ANSI」另存。
- **PowerShell 寫檔**：用 `[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))`。**不要**用 `Set-Content -Encoding UTF8` 或 `Out-File -Encoding UTF8`——PowerShell 5.1 會寫入 BOM，可能導致 PHP 輸出 BOM、`headers already sent` 等問題。
- **匯入 / 連線 MySQL** 時指定字元集：`mysql --default-character-set=utf8mb4 ...`；資料表使用 `utf8mb4`。
- 看到中文變成 `?`、`锟斤拷`、`�` 等，先確認是否為編碼問題（以 UTF-8 重新儲存），**不要**直接改內容或回報「亂碼 bug」。

### 後端安全

#### 1. 認證與授權（必查）
- 每支 API 在處理任何資料前，必須先呼叫 `Auth::isLoggedIn()`。
- 管理員操作用 `Auth::isAdmin()`；社團幹部操作用 `$this->canManageClub($clubId)`，不要自行寫判斷邏輯。
- 使用者只能操作自己的資料（如頭像上傳用 session userId，不接受 POST 傳入的 user_id）。
- 平台管理員不能停權自己，這類防呆必須在後端實作，不能只靠前端。

#### 2. CSRF 防護
- 所有 POST／PUT／DELETE 必須驗證 CSRF token：
  ```php
  $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
  if (!Helper::verifyCSRFToken($token)) {
      http_response_code(403);
      echo json_encode(['success' => false, 'message' => 'CSRF 驗證失敗']);
      return;
  }
  ```
- GET 請求不需要 CSRF token，不要在 GET 上加寫入操作。

#### 3. SQL 注入防護
- **禁止**將任何使用者輸入直接拼入 SQL 字串。
- 必須使用 MySQLi prepared statements（`bind_param`）。
- 整數 ID 一律轉型：`$id = (int)($_GET['id'] ?? 0)`，再判斷 `if (!$id)`。

#### 4. 輸入驗證
- 所有來自 `$_GET`、`$_POST`、`$_FILES` 的資料視為不可信，在使用前驗證型別與範圍。
- 必填欄位缺漏時回傳 `400` 並說明原因，不要 silent fail。

#### 5. 錯誤回應格式
- 所有 API 回應必須是 JSON，格式固定為：
  ```json
  { "success": true|false, "message": "...", "data": ... }
  ```
- 不能讓 PHP 原始錯誤或 stack trace 輸出到前端，API 檔案頂端要設 `set_exception_handler`。
- HTTP 狀態碼要正確：401 未登入、403 權限不足、404 資源不存在、400 輸入錯誤、500 伺服器錯誤。

### 角色系統（容易踩錯）

- `users.role` 有四種有效值：`platform_admin`、`club_admin`、`student`、`category_assistant`。
  - `club_admin` 由系統自動維護：當使用者在任一社團擔任幹部（`president`、`vice_president` 等）時寫入；失去所有幹部職位後降回 `student`。**不要**手動在其他情境寫入 `club_admin`。
  - `category_assistant`（類別助教）：由平台管理員在帳號管理頁指派，負責一個社團分類；指派關係存於 `category_assistant_assignments`（`user_id` 唯一，一人僅負責一類）。助教登入後只能檢視與管理其負責類別下的社團（`Auth::getCategoryAssistantCategoryId()`）。撤銷時自動依幹部資格降回 `club_admin` 或 `student`。
- 社團幹部身份的詳細職稱由 `club_members.role` 決定（`president`、`vice_president`、`public_relations`、`treasurer`、`director`）。
- `Auth::isClubAdmin()` 查的是 `club_members` 資料表，不是 `users.role`。
- 若需要判斷某使用者是否能管理某社團，呼叫 `canManageClub($clubId)`，不要自己查資料表。
- 副社長、公關、總務、幹事、社長在同一社團內具**排他性**——同一職稱只能由一位 is_active 成員擔任，後端在 insert/update 前會先驗證衝突並回傳 409。

### 資料庫變更

- **禁止**直接修改 `database/schema.sql` 來新增欄位或資料表——這不會更新已部署的資料庫。
- 所有結構變更必須寫成新的 migration 檔放在 `database/migrations/`，並在 `run_migration.php` 中登記。
- Migration 命名格式：`YYYYMMDD_描述.sql`，例如 `20260510_add_poster_path_to_events.sql`。
- 每次新增欄位後，對應的 API 要先用 `hasColumn()` 確認欄位存在再使用，避免舊環境 500。

### 上傳處理

- 圖片限制定義在 `backend/config.php`：`MAX_FILE_SIZE`（10 MB）、`ALLOWED_IMAGE_TYPES`。
- 活動海報資料儲存在 `event_posters`（`2026_05_24_event_posters.sql`）；每個活動最多 10 張海報由 `upload.php` 上傳流程驗證。
- **不要**在 upload.php 以外的地方處理檔案上傳。
- `$_POST` 與 `$_FILES` 同時為空且 `Content-Length > 0`，代表 PHP 的 `post_max_size` 被超過，需單獨偵測並回傳 413，不要誤報「缺少 ID」。
- 上傳成功後的 path 格式固定為 `assets/uploads/{prefix}_{time}_{uniqid}.{ext}`。

### 前端－後端契約

- 修改 API 回傳欄位前，先搜尋所有前端 JS 引用該欄位的地方（`grep -r "欄位名" frontend/js/`）。
- 刪除或重新命名欄位屬於 breaking change，必須同步更新前端。
- API `action` 參數透過 `?action=xxx` 傳入，不要為每個 action 建立新的 PHP 檔。

### 前端開發

- 輸出使用者輸入的內容一律用 `PageUtils.escapeHtml()`，禁止直接 `innerHTML = userInput`。
- `form.reset()` 不會重置 `disabled` 屬性，關閉 modal 後要明確還原所有欄位狀態。
- 上傳前在前端驗證檔案大小（`file.size > MAX`），讓使用者在送出請求前就得到明確提示。
- 路徑計算統一用 `getFrontendAssetPath()` 或 `getPageLink()`，不要手動拼接相對路徑。
- 所有顏色必須使用 CSS 自訂屬性（`var(--token)`），禁止在任何元件中硬編 hex 值（如 `#fff`、`#333`）。深色模式透過 `[data-theme="dark"]` 覆蓋 token，硬編 hex 會導致深色模式失效。

### 測試

- 新增或修改 API 後，對應的 e2e 場景（`tests/e2e/`）要能全數通過。
- 執行全套測試：`npx playwright test`，預期 162 個測試全部通過。
- 種子資料修改後要重新執行一次 e2e，確認沒有 silent breakage。
- 測試的 global setup 會執行 `--full` 清理再重新 seed，不要手動留殘留測試資料。

---

## 功能架構

### 學生端
- 社團分類與關鍵字搜尋
- 社團詳情與活動瀏覽（含社長電話聯絡）
- 追蹤社團與個人動態
- 加入社團（含費用方案選擇：一次付清 / 學期費 / 單堂費；退出社團）
- 評價與 Q&A 互動
- 通知中心（未讀紅點、單則已讀、全部已讀、刪除通知）
- 個人資料管理（含帳號刪除確認流程）
- **私訊系統**：Discord 式雙欄對話介面，依 user_id 或姓名搜尋用戶，歷史訊息持久儲存，3 秒輪詢即時更新
- 活動報名與參與者列表
- 檢舉功能（附 5 次 / 10 分鐘冷卻保護）
- Light / Dark mode 切換（含訪客未登入狀態）
- 各頁面（提問、評論、評價）顯示用戶 ID，可點擊直接進入私訊

### 社團幹部端
- 社團基本資料編修（含年費 / 入會費 / 單堂費設定）
- 活動建立、更新與海報上傳（含多張輪播海報；每活動最多 10 張、每張 10MB、僅支援 JPG／PNG／GIF／WebP）
- 社團預覽與內容管理
- 活動清單與管理介面
- 加入申請審核（`club-admin-applications.html`）：獨立頁面；審核待審核的成員加入申請；批准後系統自動以 Bot 訊息傳送 6 碼驗證碼給申請者；拒絕則發送通知；所有幹部後台 navbar 常駐顯示待審件數紅色 badge，切換社團後即時更新
- 成員管理（`club-admin-members.html`）：社長可指派副社長、公關、總務、幹事，或將幹部降為一般成員；非社長幹部僅能查看清單
- 帳號轉讓申請流程

### 管理員端
- 用戶與社團管理
- 類別助教指派（於帳號編輯 modal 以「負責類別」下拉設定；助教僅能管理該類社團）
- 系統公告發布與刪除（過期自動顯示「已下架」）
- 帳號轉讓審核（含審核者姓名與時間紀錄）
- 報表、回饋與檢舉管理
- 社團狀態與權限控制
- 新檢舉與轉讓申請自動推送至通知鈴
- 系統總覽儀表板（KPI、用戶／社團／活動分佈、待處理項目、類別助教分佈）

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
│       ├── dashboard.php
│       ├── events.php
│       ├── location-preview.php
│       ├── messages.php          ← 私訊系統
│       ├── notifications.php
│       ├── oauth.php
│       ├── qa.php
│       ├── reports.php
│       ├── reviews.php
│       └── upload.php
├── database/
│   ├── schema.sql
│   ├── migrations/
│   │   ├── 2026_05_23_private_messages.sql
│   │   ├── 2026_05_24_event_posters.sql
│   │   └── ...（其餘 migration）
│   └── seeds/
├── frontend/
│   ├── index.html
│   ├── assets/
│   ├── css/
│   ├── js/
│   │   └── main.js               ← 含 injectMessagesNavLink、_pageInitReady
│   └── pages/
│       ├── messages.html         ← 私訊頁面
│       ├── notifications.html
│       └── ...
├── tests/
│   ├── e2e/
│   │   ├── user-stories.spec.js
│   │   ├── additional-regression.spec.js
│   │   └── global-setup.js
│   ├── api/
│   └── manual/
├── scripts/
│   ├── check_tables.php          ← 列出本機 DB 所有資料表與欄位，驗證 migration 完整性
│   ├── seed-e2e-test-data.php    ← E2E 自動化測試用最小 scaffold
│   ├── seed-demo-data.php        ← 教授展示用豐富示範資料（20 社團、12 活動、10 評價、8 Q&A）
│   └── cleanup-e2e-test-data.php
├── logs/
└── README.md
```

## 技術棧

- 前端：HTML5、CSS3、Vanilla JavaScript
- 後端：PHP 7.4+、MySQL 8.0+ / MySQLi
- 開發環境：Windows、AppServ 或 XAMPP、Apache
- 測試：Playwright（e2e，需 Node.js）、手動驗收清單

## 安裝與初始化

避免文件重複維護，完整步驟集中於 [QUICKSTART.md](QUICKSTART.md)。

快速摘要：
1. 匯入 `database/schema.sql` 與 `database/migrations/*`（或執行 `php run_migration.php`）。
2. 匯入 seed：`database/seeds/2026_04_02_school_clubs_seed.sql`、`database/seeds/test_accounts_and_story_data.sql`。
3. 建立 `backend/config.local.php` 設定本機資料庫連線（此檔案不進 git）。
4. 確認 `frontend/assets/uploads`、`logs` 可寫入。
5. 安裝 e2e 測試依賴：`npm install`。
6. （選用）填充展示用豐富資料：`php scripts/seed-demo-data.php`（需先完成步驟 1-2）。

## 執行方式

### 開發環境
在前端資料夾啟動內建伺服器：

```bash
cd frontend
php -S localhost:8000
```

然後開啟首頁。

若以 `localhost:8000` 啟動前端，請再確認後端 API 至少一種可用：
1. Apache 提供 `http://localhost/社團活動資訊統整平台/backend/api`
2. 或在 `backend/` 另開 `php -S localhost:8080`

### AppServ / Apache
如果使用 AppServ，將專案放在網站根目錄下，並確認前端頁面引用路徑與 API 路徑一致。

## 測試資料

避免重複維護，測試帳號與初始化資料請以 [QUICKSTART.md](QUICKSTART.md) 為準。

測試帳號（密碼均為 `Test123456`）：

| 帳號 | 角色 |
|------|------|
| `admin@univ.edu` | 平台管理員 |
| `clubadmin@univ.edu` | 社團幹部（程式社社長、羽球社幹部） |
| `student@univ.edu` | 一般學生 |

### 展示用豐富資料（選用）

執行 `php scripts/seed-demo-data.php` 後額外填入：

| 項目 | 說明 |
|------|------|
| 20 個社團完整資料 | 描述、開會時間、聯絡資訊、活動活躍度 |
| 12 個展示活動 | 含完整描述與海報圖片路徑 |
| 4 則系統公告 | 涵蓋博覽會、維護、社費提醒、私訊上線 |
| 10 筆社團評價 | 程式社與熱舞社各 5 筆（已核准） |
| 8 則 Q&A 提問 | 跨 5 個社團，含官方回覆與 helpful 票 |
| 5 個 demo 評論者帳號 | `demo_reviewer1-5@demo.edu`，密碼 `Test123456` |

> 此資料為冪等操作，可重複執行。

#### 活動海報圖片

需自行準備 24 張圖片，存放於 `frontend/assets/uploads/`（建議 800×450 px，JPG）：

```
demo_dance_show_1.jpg / _2.jpg / _3.jpg        ← 春季期末公演
demo_dance_recruit_1.jpg / _2.jpg              ← 招新說明會
demo_photo_outing_1.jpg / _2.jpg               ← 春季戶外外拍
demo_photo_exhibition_1.jpg / _2.jpg / _3.jpg  ← 黑白攝影聯展
demo_music_concert_1.jpg / _2.jpg / _3.jpg     ← 春季國樂音樂會
demo_hiking_1.jpg / _2.jpg                     ← 春季郊山健行
demo_martial_arts_1.jpg                        ← 國術社招新體驗日
demo_speech_1.jpg                              ← 校際即席演講賽
demo_firstaid_1.jpg                            ← CPR 急救訓練
demo_boardgame_1.jpg / _2.jpg                  ← 春季桌遊馬拉松
demo_esports_1.jpg / _2.jpg                    ← FPS 電競邀請賽
demo_startup_1.jpg / _2.jpg                    ← Startup Weekend
```

建議用 ChatGPT/Gemini 依場景生成宣傳海報圖片。

#### 展示後清理

```bash
php scripts/cleanup-demo-data.php
```

清除活動、公告、評價與 demo 帳號；**不刪除社團本體**。

## 測試與驗收

### E2E 自動化測試（Playwright）

```powershell
npx playwright test
```

預期結果：162 個測試全數通過（Chromium、Firefox、WebKit 三瀏覽器）。

執行前確認後端服務已啟動，global setup 會自動執行完整清理與 seed。

### 手動驗收
- [手動驗收清單](tests/manual/user_story_acceptance_checklist.md)

### 測試文件
- [E2E 測試說明](tests/e2e/README.md)
- [E2E 執行指南](tests/e2e/RUNNING_TESTS.md)
- [手動驗收清單](tests/manual/user_story_acceptance_checklist.md)

## API 概覽

### 認證
- `backend/api/auth.php`
- 登入、登出、註冊、取得目前使用者

### Google OAuth
- `backend/api/oauth.php`
- `GET ?action=google_client_id` — 回傳 Google Client ID（未設定時 404，前端自動隱藏按鈕）
- `POST ?action=google_verify` — 驗證 GIS credential JWT，自動連結既有帳號或建立新帳號

### 社團
- `backend/api/clubs.php`
- 社團列表、詳情、追蹤與管理
- `GET  ?action=my_memberships` — 取得目前使用者已加入的所有社團（含職稱、費用方案）
- `POST ?action=join_club&id={id}` — 加入社團（需登入；傳入 `fee_type`：`none` / `onetime` / `semester` / `session`）
- `POST ?action=leave_club&id={id}` — 退出社團（僅限 `role='member'`，幹部不得自行離開）

### 活動
- `backend/api/events.php`
- 活動列表、詳情、建立、更新與報名

### 問答與評價
- `backend/api/qa.php`
- `backend/api/reviews.php`

### 私訊
- `backend/api/messages.php`
  - `GET  ?action=conversations` — 對話列表（含最後一則訊息與未讀數）
  - `GET  ?action=thread&user_id=X` — 取得與用戶 X 的訊息紀錄，同時標記為已讀
  - `POST ?action=send` — 傳送訊息 `{receiver_id, content}`（最多 2000 字）
  - `GET  ?action=search_user&q=X` — 依 user_id（精確）、student_id（精確）或姓名（模糊）搜尋
  - `GET  ?action=unread_count` — 取得未讀私訊總數（供導覽列紅點）

### 管理與上傳
- `backend/api/admin.php`
- `backend/api/club-admin.php`
  - `GET  ?action=join_applications&id={club_id}` — 取得待審核加入申請列表（所有幹部皆可）
  - `POST ?action=review_application` — 審核申請 `{application_id, action:'approve'|'reject'}`；批准時產生 6 碼驗證碼並以 Bot 訊息通知申請者
  - `GET  ?action=club_members&id={club_id}` — 社團成員列表（含呼叫者 `my_role`）
  - `POST ?action=update_member_role` — 社長指派職稱（排他性驗證）
  - `POST ?action=remove_member` — 社長踢出成員（同步 `users.role`）
- `backend/api/upload.php`
- `backend/api/notifications.php`
  - `GET`（預設）— 通知列表（最多 50 則）
  - `GET  ?action=unread_count` — 未讀通知數
  - `POST ?action=mark_read` — 標記單則已讀
  - `POST ?action=mark_all_read` — 全部標記已讀
  - `POST ?action=delete` — 刪除單則通知 `{notification_id}`

### 儀表板與檢舉
- `backend/api/dashboard.php` — 全站統計摘要（僅限平台管理員）
- `backend/api/reports.php` — 使用者檢舉回報

### 工具
- `backend/api/location-preview.php` — Google Maps 短網址解析，回傳地點名稱

## 版本與發布紀錄

- 2026-06-07：類別助教管理整合進帳號編輯 modal（移除獨立面板）、帳號列表角色欄顯示「○○助教」、系統總覽新增類別助教分佈卡片、帳號管理表格改不換行可橫向捲動
- 2026-06-05：首頁與私訊機器人新增社團適配測驗（7 題問卷推薦社團）；Google OAuth 帳號強制先設定密碼才能解除綁定
- 2026-06-04：新增類別助教角色（`category_assistant`）與 `category_assistant_assignments` 指派表（`2026_06_04_category_assistant.sql`）
- 2026-06-04：管理員後台 sidebar 全面改版（Google Sites 文字清單風格、響應式 hamburger、logo 整合至 sidebar 頂部）
- 2026-06-03：新增場地活動申請管理頁面（`admin-event-applications.html`）
- 2026-05-29：補強檢舉通知導頁與管理端資料完整性（commit: 709b601）
- 2026-05-29：個人頁腳本模組化，移除頁內 inline script，並清理過期文件（commit: 056b665）
- 2026-05-24：新增活動多圖海報 `event_posters` 資料表與對應 migration。
- 2026-05-23：私訊系統、Bot 占位元、用戶 ID 全站顯示、通知刪除功能、紅點修正（見下方最近更新）
- 2026-05-22：成員職稱管理、踢出成員、加入/退出社團、已加入社團 tab、排他性職稱驗證、啟動腳本修正
- 2026-05-21：Google OAuth 登入 / 註冊、UI 全寬修正、登入防重複送出、多項功能細節完善

## 文件索引

- [快速開始](QUICKSTART.md)
- [E2E 測試說明](tests/e2e/README.md)
- [E2E 執行指南](tests/e2e/RUNNING_TESTS.md)
- [手動驗收清單](tests/manual/user_story_acceptance_checklist.md)
- [Git 自動化操作](docs/GIT_AUTOMATION.md)

## 目前狀態

- 核心資料庫、API 與前端三端頁面均已完成。
- E2E 自動化測試（Playwright）162 個場景全數通過。
- 已實作 Light / Dark mode（CSS token 系統），訪客與登入使用者均可切換。
- 全站版面採全寬設計（`layout.css` container / nav 均不限寬），各頁面一致。
- 登入表單已加入送出防抖保護，避免短時間內重複觸發。
- 私訊系統（`messages.html`）已上線，支援多對話管理、搜尋用戶、歷史紀錄、響應式排版（行動版全螢幕切換、平板雙欄壓縮、桌面可折疊側欄）。

### 最近更新（2026-06-05 ～ 06-07）

| 項目 | 說明 |
|------|------|
| 類別助教管理整合 | 移除帳號管理頁獨立的「類別助教管理」面板，改於帳號編輯 modal 用「負責類別」下拉指派／撤銷：選分類即成該類助教、選「無」即撤銷；後端沿用 `assign_category_assistant` / `revoke_category_assistant` |
| 列表角色欄顯示對應身分 | 帳號列表「平台權限」欄改顯示：一般帳號／社團幹部／平台管理員／「○○助教」（帶負責類別，如「體育性助教」） |
| 系統總覽新增卡片 | 「類別助教分佈」唯讀卡片，按分類列出各類助教姓名與人數 |
| 帳號表格橫向捲動 | 表格前六欄改不換行（覆蓋全域 `table-layout:fixed` 為 `auto` + `nowrap`），內容過寬時由 `.table-shell` 底部橫向捲動，避免換行擠壓 |
| Google OAuth 解綁保護 | 以 Google 建立、從未設密碼的帳號須先在個人頁設定密碼才能解綁；修正 `link_google` / `findOrCreateUser` 綁定既有 email 帳號時誤改 `oauth_provider` 的問題 |
| 社團適配測驗 | 首頁與私訊機器人提供 7 題問卷，依答案加權推薦最多 3 個社團（`messages.php?action=quiz_recommend`，分類比對相容新舊命名） |

### 最近更新（2026-06-04）

| 項目 | 說明 |
|------|------|
| 類別助教角色 | 新增 `category_assistant` 角色與 `category_assistant_assignments` 指派表；助教僅能管理其負責分類的社團 |
| Admin sidebar 全面改版 | 改採 Google Sites 文字清單風格：移除 rounded button 感，改用 `box-shadow: inset 2px 0 0` 作為 active 指示線 |
| Logo 整合至 sidebar | `logo-wrapper` 從 header 移至 sidebar 頂部（`top: 0; height: 100vh; z-index: 101`），header 只保留右側 user widget |
| 響應式 hamburger 修正 | 改用與一般頁面一致的 ≤768px 斷點；手機版 sidebar 以 overlay 從 header 底部展開並附帶背景遮罩 |
| 群組標籤對齊修正 | 覆寫全局 `nav { align-items: center }` 造成的置中問題，加入 `align-items: stretch; justify-content: flex-start` |

### 最近更新（2026-05-28）

| 項目 | 說明 |
|------|------|
| 待審核申請獨立頁面 | 新建 `club-admin-applications.html`；申請審核從 `club-admin-members.html` 移出，具備姓名／費用類型前端篩選功能 |
| 幹部後台 navbar 重構 | 所有幹部頁面補回完整導覽連結（返回首頁、社團管理、活動列表、成員管理、待審核申請、帳戶轉讓）；`main.js` `isClubAdminSubPage()` 加入新頁面；`navLinks.innerHTML` 補上「待審核申請」含紅色 badge |
| 申請件數 badge 即時更新 | 切換社團後立即呼叫 `updateNavApplicationsBadge(clubId)`，不再需要手動刷新頁面 |
| demo_enrichment.sql 修正 | 修復 CP950 / Big5 環境造成的 2708 個 `?` 亂碼；20 社團描述、12 活動、10 評價、4 公告、8 Q&A 全部重寫為正確 UTF-8 |
| cleanup-demo-data.php | 補入 Q&A 清理邏輯（依 FK 順序刪除 `qa_reply_helpful` → `qa_tag_relations` → `qa_replies` → `q_and_a`） |
| Dark mode 修正 | quiz 卡片、入社 modal 改用 CSS token（`var(--color-bg-surface)` 等）取代硬編 hex；深色模式統一使用中性系統配色，移除所有紫色殘留 |

### 最近更新（2026-05-24 / 2026-05-23）

| 項目 | 說明 |
|------|------|
| 私訊頁面響應式改版（2026-05-24） | `messages.html` 新增行動版全螢幕滑動切換、平板雙欄壓縮、桌面可折疊側欄（toggle 按鈕）；`body` 改為 flex 佈局解決 `100dvh` 截切問題 |
| 活動海報資料表（2026-05-24） | 新增 `2026_05_24_event_posters.sql`，支援活動多圖海報資料存取；每活動最多 10 張，每張 10MB，格式限 JPG／PNG／GIF／WebP |
| 私訊系統 | 新增 `messages.html`（Discord 式雙欄 UI）與 `messages.php` API；`private_messages` 資料表 migration |
| 私訊導覽列連結 | `main.js` 新增 `injectMessagesNavLink()`，自動在「提問」後方注入「私訊」連結 |
| Bot 占位元 | 私訊側邊欄頂端固定顯示「平台機器人 BOT」項目，點擊顯示「功能即將推出」面板 |
| 用戶 ID 全站顯示 | 個人頭像下拉選單、個人頁面 hero、提問列表、提問詳情（問題＋回覆）、活動評論、社團評價均顯示 `#user_id`；可點擊直達私訊 |
| 通知刪除 | 每則通知卡片 hover 顯示 `✕`；後端新增 `POST ?action=delete` 端點 |
| 通知紅點修正 | 移除「進入通知頁自動全部已讀」行為；修正 `updateNavigation` IIFE 競態導致紅點不清除的問題（`clearedByPage` flag） |
| 通知「全部標為已讀」按鈕 | 改為持續顯示的真實按鈕（有未讀時可按，全部已讀時 disabled），移除易混淆的純文字「全部已讀」標籤 |
| 費用狀態下拉選單 | 成員管理頁面費用狀態由多個按鈕改為單一 `<select>` 下拉選單 |
| AppServ 首次登入修正 | `requireClubAdmin()` 加入 `session_write_close()` + 前端 `_pageInitReady` 序列化，解決並發 PHP session 鎖死問題 |

### 最近更新（2026-05-22）

| 項目 | 說明 |
|------|------|
| 成員職稱管理 | 新增 `club-admin-members.html`：社長可指派或降級同社成員職稱；非社長幹部只讀 |
| 踢出成員 | `club-admin-members.html` 社長新增「踢出」按鈕；後端 `remove_member` 端點負責 `is_active=0` 並同步 `users.role` |
| 排他性職稱驗證 | 同社團同職稱只能有一人；後端在 `club-admin.php` 與 `admin.php` 雙路徑均加入 409 檢查 |
| 加入社團流程 | `club-detail.html` 新增「加入社團」按鈕與費用方案選擇 modal（一次付清 / 學期費 / 單堂費） |
| 退出社團 | 學生可從 `club-detail.html` 退出社團；幹部職稱者不得自行退出 |
| 已加入社團 tab | `user-profile.html` 新增「已加入的社團」tab，顯示職稱、費用方案，一般成員可直接退出 |
| fee_type 欄位 | `club_members` 新增 `fee_type ENUM('none','onetime','semester','session')` migration |
| my_role 回傳 | `club-admin.php?action=club_members` 新增 `my_role` 欄位，讓前端直接從後端取得呼叫者角色 |
| users.role 同步 | 角色變更或踢出時自動同步 `users.role`（有幹部職 → `club_admin`；全無 → `student`） |
| Logo 連結修正 | `notifications.html`、`user-profile.html` logo 依角色動態指向首頁或管理後台 |
| start-local-dev.ps1 | 修正 UTF-8 解析錯誤；補入 AppServ PHP 路徑；修正 MySQL stderr 警告觸發 Stop 政策的問題 |

### 最近更新（2026-05-21）

| 項目 | 說明 |
|------|------|
| Google OAuth | 登入 / 註冊頁面新增「以 Google 帳號登入」按鈕；自動連結既有 email 帳號；未設定 Client ID 時按鈕自動隱藏 |
| 版面全寬修正 | `club-detail`、`event-detail`、`qa` 頁面不再被 `margin: auto` 壓縮寬度 |
| 登入防重複送出 | 按鈕送出後立即 disabled，失敗時自動恢復 |
| 置頂公告下架標示 | `end_date` 過期時首頁 badge 自動顯示「已下架」 |
| 社長電話顯示 | `club-detail` 與 `event-detail` 可顯示社長手機號 |
| 單堂費設定 | 社團幹部可設定活動單堂費用 |
| 檢舉冷卻期 | 5 次 / 10 分鐘速率限制，超過回傳 429 |
| 管理員通知 | 新檢舉與轉讓申請自動寫入通知鈴 |
| 帳號刪除確認 | 使用者個人頁面加入二次確認刪除流程 |
| 轉讓審核 UI | 待審 / 已審 / 完成三分頁，顯示審核者與時間 |
| 登入 logo 隨機 | 每次載入社團 logo 輪播順序隨機（Fisher-Yates shuffle）|

## 維護建議

1. 新增功能前先同步更新資料庫 migration 與測試種子資料。
2. API 有改動時，同步更新 README 與快速開始文件，並確認 e2e 仍全數通過。
3. 若前端頁面路由或資源路徑變動，先更新文件中的啟動說明。
4. 所有結構性變更（新資料表、新欄位）只能透過 migration 檔進行，不得直接改 schema.sql。
