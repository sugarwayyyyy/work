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
