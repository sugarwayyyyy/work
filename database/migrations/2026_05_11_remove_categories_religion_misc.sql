-- 移除「宗教性」與「綜合性」社團分類
-- 先將已指派這兩個分類的社團改為無分類，再刪除分類本身。

UPDATE clubs
SET category_id = NULL
WHERE category_id IN (
    SELECT category_id FROM club_categories WHERE category_name IN ('宗教性', '綜合性')
);

DELETE FROM club_categories WHERE category_name IN ('宗教性', '綜合性');
