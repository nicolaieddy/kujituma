-- Create friend requests table
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);

-- Create friends table for accepted friendships
CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id != user2_id),
  CHECK (user1_id < user2_id) -- Ensure consistent ordering
);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_requests
CREATE POLICY "Users can view friend requests involving them"
ON public.friend_requests
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
ON public.friend_requests
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update friend requests they received"
ON public.friend_requests
FOR UPDATE
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete friend requests they sent or received"
ON public.friend_requests
FOR DELETE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- RLS Policies for friends
CREATE POLICY "Users can view their friendships"
ON public.friends
FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create friendships"
ON public.friends
FOR INSERT
WITH CHECK (true); -- Will be handled by functions

CREATE POLICY "Users can delete their friendships"
ON public.friends
FOR DELETE
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Functions for friend request management
CREATE OR REPLACE FUNCTION public.send_friend_request(_receiver_id UUID)
RETURNS UUID
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
  
  -- Create notification
  PERFORM create_notification(
    _receiver_id,
    'friend_request',
    COALESCE(sender_name, 'Someone') || ' sent you a friend request',
    NULL,
    NULL,
    auth.uid()
  );
  
  RETURN request_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.respond_to_friend_request(_request_id UUID, _response TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  request_record RECORD;
  friendship_id UUID;
  responder_name TEXT;
BEGIN
  -- Validate response
  IF _response NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Response must be "accepted" or "rejected"';
  END IF;
  
  -- Get request details
  SELECT * INTO request_record 
  FROM friend_requests 
  WHERE id = _request_id AND receiver_id = auth.uid() AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or not authorized';
  END IF;
  
  -- Update request status
  UPDATE friend_requests 
  SET status = _response, updated_at = now()
  WHERE id = _request_id;
  
  -- If accepted, create friendship
  IF _response = 'accepted' THEN
    INSERT INTO friends (user1_id, user2_id)
    VALUES (
      LEAST(request_record.sender_id, request_record.receiver_id),
      GREATEST(request_record.sender_id, request_record.receiver_id)
    )
    RETURNING id INTO friendship_id;
    
    -- Get responder name
    SELECT full_name INTO responder_name FROM profiles WHERE id = auth.uid();
    
    -- Create notification for sender
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

CREATE OR REPLACE FUNCTION public.remove_friend(_friend_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Delete friendship where user is involved
  DELETE FROM friends 
  WHERE (user1_id = LEAST(auth.uid(), _friend_id) AND user2_id = GREATEST(auth.uid(), _friend_id));
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friendship not found';
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Helper function to check if users are friends
CREATE OR REPLACE FUNCTION public.are_friends(_user1_id UUID, _user2_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM friends 
    WHERE user1_id = LEAST(_user1_id, _user2_id) 
      AND user2_id = GREATEST(_user1_id, _user2_id)
  );
$function$;

-- Function to get user's friends
CREATE OR REPLACE FUNCTION public.get_user_friends(_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  friend_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE SECURITY DEFINER
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

-- Update notifications constraint to include friend types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY['post_like'::text, 'comment_added'::text, 'comment_like'::text, 'mention'::text, 'friend_request'::text, 'friend_request_accepted'::text]));

-- Add triggers for updated_at
CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create the update function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;