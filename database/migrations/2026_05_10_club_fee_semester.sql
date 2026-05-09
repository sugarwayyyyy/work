-- 社費收費方式：新增學期費欄位，允許與一次付清並行
-- club_fee 維持一次性費用（入會費 / 年費）
-- club_fee_semester NULL 表示未設定學期費，整數表示每學期金額

ALTER TABLE clubs
  ADD COLUMN club_fee_semester INT DEFAULT NULL AFTER club_fee;
