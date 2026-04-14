# 精簡與整併紀錄（2026-04-09）

## 目的
- 針對 PHP、HTML、SQL、MD 進行可安全落地的減碼與重複邏輯整併。
- 以「不改功能行為」為原則優先清除重複程式碼與冗餘樣式。

## 本次完成

### 1) PHP 減碼與邏輯整併
- `backend/api/qa.php`
  - 抽出共用函式：`validateReplyParent()`、`createReplyRecord()`。
  - `replyQuestion()` 與 `addReply()` 改為共用同一套回覆建立流程，移除重複驗證與資料組裝。
  - `getReplies()` 的「有幫助 / 沒幫助」兩次查詢改為單次聚合查詢（`SUM(CASE WHEN ...)`）。

- `backend/api/clubs.php`
  - 抽出共用函式：`validateMeetingLocationIfProvided()`。
  - `createClub()` 與 `updateClub()` 改為共用同一套社課地點驗證。

- `backend/api/events.php`
  - 抽出共用函式：`validateHalfHourField()`。
  - `getEvents()`、`createEvent()`、`updateEvent()` 的半點時間驗證改為共用邏輯，降低重複 if 區塊。

### 2) HTML/CSS 瘦身
- `frontend/pages/club-admin-dashboard.html`
  - 清除最後殘留 inline style（`style="display:none"`）。

- `frontend/css/base.css`
  - 新增通用工具類 `.u-hidden`，供頁面統一控制隱藏狀態。

### 3) 文件維護
- 新增本檔作為本次精簡的可追溯紀錄。

## 驗證結果
- `frontend/pages/club-admin-dashboard.html` inline style 計數：`0`。
- 本次變更為重構型精簡，未新增功能端點；目的為減碼、統一邏輯、降低維護成本。

## 影響範圍
- 主要影響檔案：
  - `backend/api/qa.php`
  - `backend/api/clubs.php`
  - `backend/api/events.php`
  - `frontend/pages/club-admin-dashboard.html`
  - `frontend/css/base.css`

## 後續可再做（第二階段）
- 將 `frontend/index.html` 大量 inline style 逐步 class 化並併入 `home.css`（風險較高，建議分批）。
- 持續把 `frontend/css/styles.css` 的 fallback 區塊搬移到分層 CSS 後，再刪除重複定義。
- 檢查 API 內的跨檔欄位查詢是否可再集中在共用 DAO/Service 層，減少重複 SQL 字串。

## 全檔檢查日誌

### Batch-01（輕檔：md/sql/ps1/tool）
- 已檢：15 檔。
- 主要發現：`database/migrations/2026_04_09_qa_reply_threads.sql` 目前非冪等，重複執行可能因重複加欄位/外鍵而失敗。
- 主要發現：`COMPLETION_REPORT.md`、`PROJECT_STATUS.md`、`QUICKSTART.md`、`TESTING_REPORT.md` 存在部分重複內容，可再做引用式瘦身。
- 主要發現：`backend/tools/clear_qa_replies.php` 為高風險清除工具，建議後續加上 `--force` 或環境保護檢查。

### Batch-02（文件/設定/工具入口）
- 已檢：8 檔。
- 主要發現：`run_migration.php` 目前僅執行 3 支 migration，與 `database/migrations/` 現況不一致，且用 `;` 切語句對複雜 SQL 有風險。
- 主要發現：`query` 內容僅有 `Apache2.4`，語意不完整，建議改為命名明確的說明檔或移除。
- 主要發現：`TESTERS_ASSIGNMENT.md`、`TESTING_TEAM.md`、`tests/manual/user_story_acceptance_checklist.md` 有可再集中引用的重複敘述。

### Batch-03（後端基礎與較輕 API）
- 已檢：9 檔。
- 主要發現：`backend/config.php` 目前硬編碼 DB 密碼與 `DEBUG_MODE=true`，建議改為環境變數與環境開關，降低洩漏風險。
- 主要發現：`backend/db.php` 的 `insert/update/fetch*` 一律以 `s` 綁定型別，可再抽型別推導，避免數值欄位長期以字串型別傳遞。
- 主要發現：`backend/api/upload.php` 以 MIME 判斷檔案型別，建議補 `finfo_file` / `getimagesize` 實檢與副檔名白名單交叉驗證。
- 主要發現：`backend/api/reviews.php` 內仍保留未使用的本地過濾輔助方法，可再刪減以避免與 `ContentFilter` 重複維護。
- 主要發現：`create_user.php` 含固定測試帳密輸出，建議改為 CLI-only + `--force` 防呆並避免誤用。

### Batch-04（後端 API 與資料結構）
- 已檢：6 檔。
- 主要發現：`backend/api/admin.php` 功能集中度高（使用者/社團/公告/轉讓），可再拆 service 層降低單檔複雜度。
- 主要發現：`database/schema.sql` 已內含 `parent_reply_id`，需與 migration 流程維持單一來源，避免初始化與遷移重複加欄位。
- 主要發現：`database/seeds/test_accounts_and_story_data.sql` 仍使用明碼測試密碼常數，建議在文件標示用途範圍並限制僅測試環境載入。
- 主要發現：`database/seeds/2026_04_02_school_clubs_seed.sql` 以大量 UNION ALL 建表資料，可考慮改 CSV 匯入或 staging table 以降低維護成本。

### Batch-05（前端模組與總說明）
- 已檢：8 檔。
- 主要發現：`frontend/js/home.js` 與 `frontend/js/main.js` 仍有不少 template 內 inline style，可再抽共用 class 以降低 DOM 字串噪音。
- 主要發現：`frontend/css/components.css` 與 `frontend/css/styles.css` 目前可能有重疊定義，建議後續做覆蓋順序盤點並刪除重複來源。
- 主要發現：`README.md` 已改為引用 `QUICKSTART.md`，方向正確；仍可再把 API 概覽縮到 `DOCS_INDEX.md` 避免雙維護。

### Batch-06（前端頁面與入口檔收尾）
- 已檢：16 檔。
- 主要發現：頁面 inline style 仍偏高（例如 `frontend/club-detail.html` 52、`frontend/index.html` 35、`frontend/event-detail.html` 34、`frontend/user-profile.html` 31），可列為下一輪主要瘦身目標。
- 主要發現：`frontend/js/club-admin-dashboard.js` 內 `style.display` 指派 23 次、`style.cssText` 2 次、模板內 inline style 字串 11 次，可再做狀態 class 化。
- 主要發現：`frontend/css/styles.css` 已導入分層檔，但仍保留大量舊定義，建議後續做 selector 去重與分層移除。
- 主要發現：根目錄 `index.html` 僅重導向用途且結構簡潔；`logs/error.log` 目前為空。

<!-- FULL_SCAN_TRACKER_START -->
## 全檔檢查追蹤（防壓縮遺失）

- 快照時間：2026-04-09
- 檔案總數：69
- 已檢數：69
- 待檢數：0
- 註記規則：`[x]` 已檢、`[ ]` 待檢

### 檔案清單
- [x] .gitignore
- [x] .vscode/settings.json
- [x] COMPLETION_REPORT.md
- [x] DOCS_INDEX.md
- [x] NEXT_FIRESTORE_GO_TO_MARKET_PLAN.md
- [x] PROJECT_STATUS.md
- [x] QUICKSTART.md
- [x] README.md
- [x] RELEASE_NOTES_2026-04-04.md
- [x] SLIMMING_REPORT_2026-04-09.md
- [x] TESTERS_ASSIGNMENT.md
- [x] TESTING_REPORT.md
- [x] TESTING_TEAM.md
- [x] backend/api/admin.php
- [x] backend/api/auth.php
- [x] backend/api/club-admin.php
- [x] backend/api/clubs.php
- [x] backend/api/events.php
- [x] backend/api/notifications.php
- [x] backend/api/qa.php
- [x] backend/api/reviews.php
- [x] backend/api/upload.php
- [x] backend/auth.php
- [x] backend/config.php
- [x] backend/content_filter.php
- [x] backend/db.php
- [x] backend/review_filter_rules.php
- [x] backend/tools/clear_qa_replies.php
- [x] create_user.php
- [x] database/migrations/2026_04_01_user_stories_core.sql
- [x] database/migrations/2026_04_03_event_tags.sql
- [x] database/migrations/2026_04_03_qa_urgency.sql
- [x] database/migrations/2026_04_03_transfer_request_workflow.sql
- [x] database/migrations/2026_04_04_event_poster_path.sql
- [x] database/migrations/2026_04_04_qa_reply_helpful.sql
- [x] database/migrations/2026_04_09_qa_reply_threads.sql
- [x] database/schema.sql
- [x] database/seeds/2026_04_02_school_clubs_seed.sql
- [x] database/seeds/test_accounts_and_story_data.sql
- [x] frontend/css/admin.css
- [x] frontend/css/base.css
- [x] frontend/css/club-admin-dashboard.css
- [x] frontend/css/components.css
- [x] frontend/css/home.css
- [x] frontend/css/layout.css
- [x] frontend/css/styles.css
- [x] frontend/index.html
- [x] frontend/js/club-admin-dashboard.js
- [x] frontend/js/home.js
- [x] frontend/js/main.js
- [x] frontend/pages/admin-dashboard.html
- [x] frontend/pages/club-admin-dashboard.html
- [x] frontend/pages/club-detail.html
- [x] frontend/pages/club-list.html
- [x] frontend/pages/event-detail.html
- [x] frontend/pages/events.html
- [x] frontend/pages/login.html
- [x] frontend/pages/notifications.html
- [x] frontend/pages/qa-detail.html
- [x] frontend/pages/qa.html
- [x] frontend/pages/register.html
- [x] frontend/pages/user-profile.html
- [x] index.html
- [x] logs/error.log
- [x] query
- [x] run_migration.php
- [x] tests/api/acceptance_user_stories.ps1
- [x] tests/api/check_frontend_links.ps1
- [x] tests/manual/user_story_acceptance_checklist.md
<!-- FULL_SCAN_TRACKER_END -->

