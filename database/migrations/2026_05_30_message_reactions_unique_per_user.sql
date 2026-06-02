-- Fix: enforce one reaction per user per message (was per user+message+emoji)
-- Root cause: concurrent requests could INSERT two different emojis for the same user,
-- causing inflated counts when another user reacts with the same emoji.

-- Step 1: remove duplicate reactions, keep only the most recent per (message_id, user_id)
DELETE r1 FROM message_reactions r1
JOIN message_reactions r2
    ON  r1.message_id = r2.message_id
    AND r1.user_id    = r2.user_id
    AND r1.reaction_id < r2.reaction_id;

-- Step 2: swap unique key
ALTER TABLE message_reactions
    DROP KEY uq_msg_user_emoji,
    ADD  UNIQUE KEY uq_msg_user (message_id, user_id);
