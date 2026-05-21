-- 加入社團功能：記錄成員選擇的費用方式
-- fee_type: none = 免費/未指定, onetime = 一次付清, semester = 學期費, session = 單堂費

ALTER TABLE club_members
  ADD COLUMN fee_type ENUM('none','onetime','semester','session') NOT NULL DEFAULT 'none' AFTER is_active;
