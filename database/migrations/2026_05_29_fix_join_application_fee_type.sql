-- Fix club_join_applications.fee_type ENUM
-- Original: ('semester','annual','free')  ← 與系統實際用的 none/onetime/session 不符
-- Corrected: ('none','onetime','semester','session')

-- Step 1: 修正舊資料的映射 (先轉成合法的新 ENUM 字串再改欄位定義)
UPDATE club_join_applications SET fee_type = 'none'     WHERE fee_type IN ('free', '');
UPDATE club_join_applications SET fee_type = 'onetime'  WHERE fee_type = 'annual';
-- 'semester' 不需要改，新舊值相同

-- Step 2: 修改 ENUM 定義與預設值
ALTER TABLE club_join_applications
    MODIFY COLUMN fee_type ENUM('none','onetime','semester','session')
    NOT NULL DEFAULT 'none';
