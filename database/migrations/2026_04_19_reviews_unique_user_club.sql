-- 清理重複評價，並強制同一使用者對同一社團僅能保留一筆評價

-- 1) 刪除重複資料：保留較新的紀錄（updated_at/created_at 較新，若同時則 review_id 較大）
DELETE r
FROM reviews r
JOIN reviews keep
  ON r.club_id = keep.club_id
 AND r.user_id = keep.user_id
 AND (
    COALESCE(r.updated_at, r.created_at) < COALESCE(keep.updated_at, keep.created_at)
    OR (
      COALESCE(r.updated_at, r.created_at) = COALESCE(keep.updated_at, keep.created_at)
      AND r.review_id < keep.review_id
    )
 );

-- 2) 新增唯一鍵（若已存在則跳過）
SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'reviews'
      AND index_name = 'uniq_reviews_club_user'
);

SET @sql := IF(
    @idx_exists = 0,
    'ALTER TABLE reviews ADD CONSTRAINT uniq_reviews_club_user UNIQUE (club_id, user_id)',
    'SELECT "uniq_reviews_club_user already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
