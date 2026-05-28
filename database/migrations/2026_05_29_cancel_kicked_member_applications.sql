-- Fix: 被踢出社團的成員，其 club_join_applications 仍殘留 approved/pending 狀態
-- 導致 club-detail.html 顯示「前往驗證」按鈕
-- 條件：club_members.is_active = 0 且 application.status IN ('pending','approved')

UPDATE club_join_applications cja
INNER JOIN club_members cm
    ON cm.club_id = cja.club_id AND cm.user_id = cja.user_id AND cm.is_active = 0
SET cja.status = 'cancelled'
WHERE cja.status IN ('pending','approved');
