-- Migrate old comments to the new objective_comments table
INSERT INTO objective_comments (objective_id, user_id, message, created_at)
SELECT objective_id, partner_id, comment, created_at
FROM objective_partner_feedback
WHERE comment IS NOT NULL AND comment != '';

-- Drop the comment column from objective_partner_feedback
ALTER TABLE objective_partner_feedback DROP COLUMN IF EXISTS comment;