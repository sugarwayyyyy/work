-- Fix: 被踢出社團的成員，其 club_join_applications 仍殘留 approved/pending 狀態
-- 導致 club-detail.html 顯示「前往驗證」按鈕
-- 條件：club_members.is_active = 0 且 application.status IN ('pending','approved')
--
-- 冪等性：本檔可安全重複執行，且符合 uq_active_app(club_id, user_id, status)。
-- 每位 (club_id, user_id) 最終最多保留一筆 cancelled 作為紀錄，其餘殘留刪除，
-- 避免「已存在 cancelled」或「同時殘留 pending + approved」造成的唯一鍵衝突。

-- 1. 刪除多餘的殘留申請：
--    keep_id = 若已有 cancelled 則保留該筆；否則保留 pending/approved 中 id 最小的一筆。
--    （derived table 物化，避免 DELETE 與子查詢同表的 MySQL 1093 限制）
DELETE cja FROM club_join_applications cja
INNER JOIN club_members cm
    ON cm.club_id = cja.club_id AND cm.user_id = cja.user_id AND cm.is_active = 0
INNER JOIN (
    SELECT club_id, user_id,
           COALESCE(
             MIN(CASE WHEN status = 'cancelled' THEN application_id END),
             MIN(CASE WHEN status IN ('pending','approved') THEN application_id END)
           ) AS keep_id
    FROM club_join_applications
    WHERE status IN ('pending','approved','cancelled')
    GROUP BY club_id, user_id
) k ON k.club_id = cja.club_id AND k.user_id = cja.user_id
WHERE cja.status IN ('pending','approved')
  AND cja.application_id <> k.keep_id;

-- 2. 將剩餘的代表筆（pending/approved）轉為 cancelled；
--    此時每組 (club_id, user_id) 必無其他 cancelled，不會衝突。
UPDATE club_join_applications cja
INNER JOIN club_members cm
    ON cm.club_id = cja.club_id AND cm.user_id = cja.user_id AND cm.is_active = 0
SET cja.status = 'cancelled'
WHERE cja.status IN ('pending','approved');
