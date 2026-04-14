ALTER TABLE qa_replies
    ADD COLUMN parent_reply_id INT DEFAULT NULL AFTER qa_id;

ALTER TABLE qa_replies
    ADD CONSTRAINT fk_qa_replies_parent_reply
    FOREIGN KEY (parent_reply_id) REFERENCES qa_replies(reply_id) ON DELETE CASCADE;