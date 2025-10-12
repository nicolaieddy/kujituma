-- Fix 1: Add RLS policies to comment_likes table
CREATE POLICY "Users can view comment likes"
ON public.comment_likes FOR SELECT
USING (true);

CREATE POLICY "Users can create their own likes"
ON public.comment_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
ON public.comment_likes FOR DELETE
USING (auth.uid() = user_id);

-- Fix 2: Add SET search_path = public to all SECURITY DEFINER functions

-- Update toggle_comment_like
CREATE OR REPLACE FUNCTION public.toggle_comment_like(_user_id uuid, _comment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  like_exists BOOLEAN;
  comment_owner_id UUID;
  comment_owner_name TEXT;
  liker_name TEXT;
  related_post_id UUID;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM comment_likes 
    WHERE user_id = _user_id AND comment_id = _comment_id
  ) INTO like_exists;
  
  SELECT user_id, post_id INTO comment_owner_id, related_post_id FROM comments WHERE id = _comment_id;
  SELECT full_name INTO comment_owner_name FROM profiles WHERE id = comment_owner_id;
  SELECT full_name INTO liker_name FROM profiles WHERE id = _user_id;
  
  IF like_exists THEN
    DELETE FROM comment_likes 
    WHERE user_id = _user_id AND comment_id = _comment_id;
    
    UPDATE comments 
    SET likes = GREATEST(likes - 1, 0)
    WHERE id = _comment_id;
    
    RETURN FALSE;
  ELSE
    INSERT INTO comment_likes (user_id, comment_id) 
    VALUES (_user_id, _comment_id);
    
    UPDATE comments 
    SET likes = likes + 1
    WHERE id = _comment_id;
    
    PERFORM create_notification(
      comment_owner_id,
      'comment_like',
      COALESCE(liker_name, 'Someone') || ' liked your comment',
      related_post_id,
      _comment_id,
      _user_id
    );
    
    RETURN TRUE;
  END IF;
END;
$function$;

-- Update notify_comment_added
CREATE OR REPLACE FUNCTION public.notify_comment_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  post_owner_id UUID;
  commenter_name TEXT;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  SELECT full_name INTO commenter_name FROM profiles WHERE id = NEW.user_id;
  
  PERFORM create_notification(
    post_owner_id,
    'comment_added',
    COALESCE(commenter_name, 'Someone') || ' commented on your post',
    NEW.post_id,
    NEW.id,
    NEW.user_id
  );
  
  RETURN NEW;
END;
$function$;

-- Update mark_notification_read
CREATE OR REPLACE FUNCTION public.mark_notification_read(_notification_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE notifications 
  SET is_read = true, updated_at = now()
  WHERE id = _notification_id AND user_id = _user_id;
  
  RETURN FOUND;
END;
$function$;

-- Update update_user_last_active
CREATE OR REPLACE FUNCTION public.update_user_last_active()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE profiles 
  SET last_active_at = NOW() 
  WHERE id = auth.uid();
END;
$function$;

-- Update mark_all_notifications_read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications 
  SET is_read = true, updated_at = now()
  WHERE user_id = _user_id AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$function$;

-- Update handle_comment_mentions
CREATE OR REPLACE FUNCTION public.handle_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  mention_pattern TEXT := '@([a-zA-Z0-9_]+)';
  mention_match TEXT;
  mentioned_user_id UUID;
  commenter_name TEXT;
  mentioned_user_name TEXT;
  word_array TEXT[];
  word TEXT;
BEGIN
  SELECT full_name INTO commenter_name FROM profiles WHERE id = NEW.user_id;
  
  word_array := regexp_split_to_array(NEW.message, '\s+');
  
  FOREACH word IN ARRAY word_array
  LOOP
    IF word LIKE '@%' THEN
      mention_match := trim(substring(word from 2));
      
      SELECT id INTO mentioned_user_id 
      FROM profiles 
      WHERE LOWER(REPLACE(full_name, ' ', '')) = LOWER(REPLACE(mention_match, ' ', ''))
         OR LOWER(full_name) LIKE LOWER('%' || mention_match || '%')
      LIMIT 1;
      
      IF mentioned_user_id IS NOT NULL THEN
        SELECT full_name INTO mentioned_user_name FROM profiles WHERE id = mentioned_user_id;
        
        PERFORM create_notification(
          mentioned_user_id,
          'mention',
          COALESCE(commenter_name, 'Someone') || ' mentioned you in a comment',
          NEW.post_id,
          NEW.id,
          NEW.user_id
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Update respond_to_friend_request
CREATE OR REPLACE FUNCTION public.respond_to_friend_request(_request_id uuid, _response text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  request_record RECORD;
  friendship_id UUID;
  responder_name TEXT;
BEGIN
  IF _response NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Response must be "accepted" or "rejected"';
  END IF;
  
  SELECT * INTO request_record 
  FROM friend_requests 
  WHERE id = _request_id AND receiver_id = auth.uid() AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or not authorized';
  END IF;
  
  UPDATE friend_requests 
  SET status = _response, updated_at = now()
  WHERE id = _request_id;
  
  IF _response = 'accepted' THEN
    INSERT INTO friends (user1_id, user2_id)
    VALUES (
      LEAST(request_record.sender_id, request_record.receiver_id),
      GREATEST(request_record.sender_id, request_record.receiver_id)
    )
    RETURNING id INTO friendship_id;
    
    SELECT full_name INTO responder_name FROM profiles WHERE id = auth.uid();
    
    PERFORM create_notification(
      request_record.sender_id,
      'friend_request_accepted',
      COALESCE(responder_name, 'Someone') || ' accepted your friend request',
      NULL,
      NULL,
      auth.uid()
    );
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Update remove_friend
CREATE OR REPLACE FUNCTION public.remove_friend(_friend_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM friends 
  WHERE (user1_id = LEAST(auth.uid(), _friend_id) AND user2_id = GREATEST(auth.uid(), _friend_id));
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friendship not found';
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Update are_friends (change SET search_path TO '' to = public)
CREATE OR REPLACE FUNCTION public.are_friends(_user1_id uuid, _user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM friends 
    WHERE user1_id = LEAST(_user1_id, _user2_id) 
      AND user2_id = GREATEST(_user1_id, _user2_id)
  );
$function$;

-- Update get_user_friends (change SET search_path TO '' to = public)
CREATE OR REPLACE FUNCTION public.get_user_friends(_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(friend_id uuid, full_name text, avatar_url text, email text, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH user_friends AS (
    SELECT 
      CASE 
        WHEN f.user1_id = COALESCE(_user_id, auth.uid()) THEN f.user2_id 
        ELSE f.user1_id 
      END as friend_id,
      f.created_at
    FROM friends f
    WHERE f.user1_id = COALESCE(_user_id, auth.uid()) 
       OR f.user2_id = COALESCE(_user_id, auth.uid())
  )
  SELECT 
    uf.friend_id,
    p.full_name,
    p.avatar_url,
    p.email,
    uf.created_at
  FROM user_friends uf
  JOIN profiles p ON p.id = uf.friend_id
  ORDER BY uf.created_at DESC;
$function$;

-- Update auto_befriend_nicolas
CREATE OR REPLACE FUNCTION public.auto_befriend_nicolas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  nicolas_id UUID;
BEGIN
  SELECT id INTO nicolas_id FROM profiles WHERE email = 'nicolaieddy@gmail.com';
  
  IF nicolas_id IS NOT NULL AND NEW.id != nicolas_id THEN
    INSERT INTO friends (user1_id, user2_id)
    VALUES (
      LEAST(nicolas_id, NEW.id),
      GREATEST(nicolas_id, NEW.id)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update send_friend_request
CREATE OR REPLACE FUNCTION public.send_friend_request(_receiver_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  request_id UUID;
  sender_name TEXT;
  existing_friendship BOOLEAN;
  existing_request BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to send friend requests';
  END IF;
  
  IF auth.uid() = _receiver_id THEN
    RAISE EXCEPTION 'Cannot send friend request to yourself';
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM friends 
    WHERE (user1_id = LEAST(auth.uid(), _receiver_id) AND user2_id = GREATEST(auth.uid(), _receiver_id))
  ) INTO existing_friendship;
  
  IF existing_friendship THEN
    RAISE EXCEPTION 'Users are already friends';
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM friend_requests 
    WHERE (sender_id = auth.uid() AND receiver_id = _receiver_id)
       OR (sender_id = _receiver_id AND receiver_id = auth.uid())
  ) INTO existing_request;
  
  IF existing_request THEN
    RAISE EXCEPTION 'Friend request already exists';
  END IF;
  
  INSERT INTO friend_requests (sender_id, receiver_id)
  VALUES (auth.uid(), _receiver_id)
  RETURNING id INTO request_id;
  
  SELECT full_name INTO sender_name FROM profiles WHERE id = auth.uid();
  
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

-- Update create_notification
CREATE OR REPLACE FUNCTION public.create_notification(_user_id uuid, _type text, _message text, _related_post_id uuid DEFAULT NULL::uuid, _related_comment_id uuid DEFAULT NULL::uuid, _triggered_by_user_id uuid DEFAULT NULL::uuid, _related_request_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  notification_id UUID;
BEGIN
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

-- Update toggle_post_like
CREATE OR REPLACE FUNCTION public.toggle_post_like(_user_id uuid, _post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  like_exists BOOLEAN;
  post_owner_id UUID;
  post_owner_name TEXT;
  liker_name TEXT;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM post_likes 
    WHERE user_id = _user_id AND post_id = _post_id
  ) INTO like_exists;
  
  SELECT user_id INTO post_owner_id FROM posts WHERE id = _post_id;
  SELECT full_name INTO post_owner_name FROM profiles WHERE id = post_owner_id;
  SELECT full_name INTO liker_name FROM profiles WHERE id = _user_id;
  
  IF like_exists THEN
    DELETE FROM post_likes 
    WHERE user_id = _user_id AND post_id = _post_id;
    
    UPDATE posts 
    SET likes = GREATEST(likes - 1, 0)
    WHERE id = _post_id;
    
    RETURN FALSE;
  ELSE
    INSERT INTO post_likes (user_id, post_id) 
    VALUES (_user_id, _post_id);
    
    UPDATE posts 
    SET likes = likes + 1
    WHERE id = _post_id;
    
    PERFORM create_notification(
      post_owner_id,
      'post_like',
      COALESCE(liker_name, 'Someone') || ' liked your post',
      _post_id,
      NULL,
      _user_id
    );
    
    RETURN TRUE;
  END IF;
END;
$function$;

-- Update delete_all_weekly_objectives
CREATE OR REPLACE FUNCTION public.delete_all_weekly_objectives(_user_id uuid, _week_start date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only delete your own objectives';
  END IF;
  
  DELETE FROM public.weekly_objectives 
  WHERE user_id = _user_id 
    AND week_start = _week_start;
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$function$;

-- Update get_admin_users_data
CREATE OR REPLACE FUNCTION public.get_admin_users_data()
RETURNS TABLE(id uuid, email text, full_name text, avatar_url text, created_at timestamp with time zone, posts_count bigint, role text, last_active_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.created_at,
    COALESCE(post_counts.count, 0) as posts_count,
    COALESCE(ur.role::text, 'user') as role,
    p.last_active_at
  FROM profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM posts
    GROUP BY user_id
  ) post_counts ON p.id = post_counts.user_id
  LEFT JOIN user_roles ur ON p.id = ur.user_id
  ORDER BY p.created_at DESC;
END;
$function$;