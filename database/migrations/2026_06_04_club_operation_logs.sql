-- 幹部操作紀錄（稽核 Log）
-- 記錄哪位幹部（actor）對哪位成員（target）做了什麼操作，釐清帳務與管理責任。
-- 同一學生可兼任不同社團的「總務」，但不可兼任「社長」（社長唯一性已於 admin.php 強制）。

CREATE TABLE IF NOT EXISTS club_operation_logs (
    log_id          INT AUTO_INCREMENT PRIMARY KEY,
    club_id         INT NOT NULL,
    actor_user_id   INT NOT NULL,                 -- 執行操作的幹部帳號
    actor_role      VARCHAR(30) DEFAULT NULL,     -- 當下幹部職稱快照（president/treasurer…）
    action          VARCHAR(40) NOT NULL,         -- approve_join / reject_join / confirm_fee / unconfirm_fee / change_fee_type / assign_role / remove_member
    target_user_id  INT DEFAULT NULL,             -- 被操作的成員（如有）
    detail          VARCHAR(255) DEFAULT NULL,    -- 補充說明（如費用類型、金額、原/新職稱）
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubs(club_id) ON DELETE CASCADE,
    INDEX idx_col_club_time (club_id, created_at),
    INDEX idx_col_actor (actor_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
