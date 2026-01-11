-- Drop the existing check constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the updated check constraint with all notification types including accountability_check_in
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'friend_request', 
  'friend_request_accepted', 
  'post_like', 
  'post_comment', 
  'comment_like',
  'comment_added',
  'post_reaction',
  'accountability_partner_request',
  'accountability_partner_accepted',
  'accountability_check_in',
  'goal_update_cheer',
  'goal_update_comment',
  'mention'
));