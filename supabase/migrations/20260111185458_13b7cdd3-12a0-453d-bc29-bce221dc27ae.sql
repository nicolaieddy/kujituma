-- Add reply_to_id column to support threaded replies
ALTER TABLE accountability_check_ins 
ADD COLUMN reply_to_id UUID REFERENCES accountability_check_ins(id) ON DELETE CASCADE;

-- Add index for faster lookups of replies
CREATE INDEX idx_accountability_check_ins_reply_to ON accountability_check_ins(reply_to_id) WHERE reply_to_id IS NOT NULL;