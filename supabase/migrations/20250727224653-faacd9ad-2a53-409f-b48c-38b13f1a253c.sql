-- Add related_request_id column to notifications table for friend requests
ALTER TABLE notifications ADD COLUMN related_request_id UUID REFERENCES friend_requests(id) ON DELETE SET NULL;

-- Update the create_notification function to accept related_request_id
CREATE OR REPLACE FUNCTION public.create_notification(_user_id uuid, _type text, _message text, _related_post_id uuid DEFAULT NULL::uuid, _related_comment_id uuid DEFAULT NULL::uuid, _triggered_by_user_id uuid DEFAULT NULL::uuid, _related_request_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  notification_id UUID;
BEGIN
  -- Don't create notification if user is triggering action on their own content
  IF _user_id = _triggered_by_user_id THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO public.notifications (
    user_id, 
    type, 
    message, 
    related_post_id, 
    related_comment_id, 
    triggered_by_user_id,
    related_request_id
  )
  VALUES (
    _user_id, 
    _type, 
    _message, 
    _related_post_id, 
    _related_comment_id, 
    _triggered_by_user_id,
    _related_request_id
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

-- Update the send_friend_request function to include the request_id when creating notification
CREATE OR REPLACE FUNCTION public.send_friend_request(_receiver_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  request_id UUID;
  sender_name TEXT;
  existing_friendship BOOLEAN;
  existing_request BOOLEAN;
BEGIN
  -- Check if sender is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to send friend requests';
  END IF;
  
  -- Check if trying to send to self
  IF auth.uid() = _receiver_id THEN
    RAISE EXCEPTION 'Cannot send friend request to yourself';
  END IF;
  
  -- Check if already friends
  SELECT EXISTS(
    SELECT 1 FROM friends 
    WHERE (user1_id = LEAST(auth.uid(), _receiver_id) AND user2_id = GREATEST(auth.uid(), _receiver_id))
  ) INTO existing_friendship;
  
  IF existing_friendship THEN
    RAISE EXCEPTION 'Users are already friends';
  END IF;
  
  -- Check if request already exists
  SELECT EXISTS(
    SELECT 1 FROM friend_requests 
    WHERE (sender_id = auth.uid() AND receiver_id = _receiver_id)
       OR (sender_id = _receiver_id AND receiver_id = auth.uid())
  ) INTO existing_request;
  
  IF existing_request THEN
    RAISE EXCEPTION 'Friend request already exists';
  END IF;
  
  -- Create friend request
  INSERT INTO friend_requests (sender_id, receiver_id)
  VALUES (auth.uid(), _receiver_id)
  RETURNING id INTO request_id;
  
  -- Get sender name for notification
  SELECT full_name INTO sender_name FROM profiles WHERE id = auth.uid();
  
  -- Create notification with request_id
  PERFORM create_notification(
    _receiver_id,
    'friend_request',
    COALESCE(sender_name, 'Someone') || ' sent you a friend request',
    NULL,
    NULL,
    auth.uid(),
    request_id
  );
  
  RETURN request_id;
END;
$function$;