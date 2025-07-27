-- Update notifications type constraint to include 'mention' type
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY['post_like'::text, 'comment_added'::text, 'comment_like'::text, 'mention'::text]));