-- 清除已失效的社團加入申請紀錄，修正「退出後重新加入被卡住」的問題。
--
-- 背景：uq_active_app(club_id, user_id, status) 唯一鍵使每個 status 每位 (club,user)
-- 只能有一筆。退出/被踢時若把申請設為 cancelled，但同組已存在一筆 cancelled，
-- 更新會因唯一鍵衝突而失敗，導致殘留的 approved 申請卡住，後續無法重新批准，
-- 學生輸入驗證碼時會誤判為「申請尚未獲批准」。
--
-- 後端流程已改為「退出/被踢/重新申請時直接刪除舊申請紀錄」（reset 為未申請過）。
-- 本 migration 清除既有資料庫中殘留的失效申請列，使其與新流程一致。
--
-- 已失效 = 已取消(cancelled) / 已拒絕(rejected) / 已用驗證碼完成加入(approved 且 code_used=1)
-- 保留進行中的申請：pending、以及 approved 但驗證碼尚未使用(code_used=0)
-- 冪等：重複執行不會再刪到任何進行中的申請。
DELETE FROM club_join_applications
WHERE status IN ('cancelled', 'rejected')
   OR (status = 'approved' AND code_used = 1);
