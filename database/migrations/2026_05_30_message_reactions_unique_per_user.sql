-- Fix: enforce one reaction per user per message (was per user+message+emoji)
-- Root cause: concurrent requests could INSERT two different emojis for the same user,
-- causing inflated counts when another user reacts with the same emoji.

-- Step 1: remove duplicate reactions, keep only the most recent per (message_id, user_id)
DELETE r1 FROM message_reactions r1
JOIN message_reactions r2
    ON  r1.message_id = r2.message_id
    AND r1.user_id    = r2.user_id
    AND r1.reaction_id < r2.reaction_id;

-- Step 2: swap unique key, but only if the old one still exists.
SET @uq_msg_user_emoji_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'message_reactions'
      AND INDEX_NAME = 'uq_msg_user_emoji'
);
SET @sql := IF(
    @uq_msg_user_emoji_exists > 0,
    'ALTER TABLE message_reactions DROP INDEX uq_msg_user_emoji',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @uq_msg_user_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'message_reactions'
      AND INDEX_NAME = 'uq_msg_user'
);
SET @sql := IF(
    @uq_msg_user_exists = 0,
    'ALTER TABLE message_reactions ADD UNIQUE KEY uq_msg_user (message_id, user_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
