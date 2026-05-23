-- Add recall flag to note_messages
ALTER TABLE note_messages
    ADD COLUMN is_recalled TINYINT(1) NOT NULL DEFAULT 0 AFTER content;
