-- 活動時間區間 + 報名期間
-- 新增 event_end_date（活動結束時間）和 registration_start（報名開始時間）

ALTER TABLE events
  ADD COLUMN event_end_date   DATETIME NULL AFTER event_date,
  ADD COLUMN registration_start DATETIME NULL AFTER event_end_date;
