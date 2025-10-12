-- Drop the existing check constraint on notifications type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add a new check constraint with all the notification types used in the app
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'comment_added',
  'comment_like',
  'mention',
  'post_like',
  'friend_request',
  'friend_request_accepted',
  'accountability_partner_request',
  'accountability_partner_accepted'
));