-- 社費繳納狀態：由幹部標記
ALTER TABLE club_members
  ADD COLUMN fee_paid TINYINT(1) NOT NULL DEFAULT 0 AFTER fee_type;
