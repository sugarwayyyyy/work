-- Add reply_to_id to private_messages for threading
ALTER TABLE private_messages
    ADD COLUMN reply_to_id INT NULL AFTER is_recalled,
    ADD CONSTRAINT fk_pm_reply FOREIGN KEY (reply_to_id)
        REFERENCES private_messages(message_id) ON DELETE SET NULL;
