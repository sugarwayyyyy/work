-- Add recall flag to private_messages
ALTER TABLE private_messages
    ADD COLUMN is_recalled TINYINT(1) NOT NULL DEFAULT 0 AFTER is_read;
