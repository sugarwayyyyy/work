# Release Notes

日期: 2026-04-04
版本提交: 44895ca
標題: feat: update club/event/qa flows and timestamp display

## 主要更新

- 社團評價防重複: 同一使用者對同一社團僅可評價一次（前後端雙重防護）。
- 活動評論體驗優化: 修正星等互動可視化，新增平均星等與評分人數顯示。
- 活動評論資格限制: 僅活動結束後且符合參與條件才可評論（前後端一致）。
- 星等顯示一致化: 多個前台頁面補齊「幾人評分」樣式與文案。
- QA 抓字推薦標籤: 發問時可依標題/內容自動推薦並送出 tag_ids。
- QA 不當字詞過濾: 提問與回覆加入禁詞/垃圾訊息攔截。
- 資訊時效性標示: 社團與活動頁面新增最新更新時間顯示，格式統一。
- 社團標籤篩選邏輯: club-list 明確使用 OR（任一標籤符合即顯示）。
- 幹部儀表板標籤關鍵字: 將時間相關拆分為日期與時間兩組並保留相容。

## 資料庫與遷移

- 新增 migration:
  - database/migrations/2026_04_03_event_tags.sql
  - database/migrations/2026_04_03_qa_urgency.sql
  - database/migrations/2026_04_04_event_poster_path.sql
  - database/migrations/2026_04_04_qa_reply_helpful.sql
- 更新 database/schema.sql

## 影響範圍（重點檔案）

- 後端 API:
  - backend/api/clubs.php
  - backend/api/events.php
  - backend/api/qa.php
  - backend/api/reviews.php
  - backend/review_filter_rules.php
- 前端頁面:
  - frontend/pages/club-detail.html
  - frontend/pages/event-detail.html
  - frontend/pages/club-list.html
  - frontend/pages/qa.html
  - frontend/pages/qa-detail.html
  - frontend/pages/club-admin-dashboard.html
  - frontend/index.html
- 其他:
  - frontend/css/styles.css
  - run_migration.php

## 部署提醒

- 請先執行新增 migration 再部署前端，以避免欄位或表結構不一致。
- 若正式環境已有資料，建議先在 staging 驗證 QA 過濾與活動評論限制流程。
