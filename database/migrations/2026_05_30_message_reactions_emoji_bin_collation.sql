-- ROOT CAUSE FIX for emoji reaction counts being merged.
--
-- The `emoji` column inherited utf8mb4_unicode_ci collation, under which most
-- supplementary-plane emoji (😂😮😢👍👏) collate as EQUAL. As a result,
-- `GROUP BY message_id, emoji` merged different emojis into one group and
-- inflated COUNT(*) (e.g. 👏 from A + 😢 from B displayed as one emoji ×2).
-- ❤️ (U+2764, BMP + variation selector) has a distinct weight, which is why
-- only the heart appeared to work.
--
-- Switching the column to utf8mb4_bin makes comparison/grouping byte-exact,
-- so every distinct emoji is treated as distinct.

ALTER TABLE message_reactions
    MODIFY COLUMN emoji VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
