-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('post_like', 'comment_added', 'comment_like')),
  message TEXT NOT NULL,
  related_post_id UUID,
  related_comment_id UUID,
  triggered_by_user_id UUID NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _type TEXT,
  _message TEXT,
  _related_post_id UUID DEFAULT NULL,
  _related_comment_id UUID DEFAULT NULL,
  _triggered_by_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    triggered_by_user_id
  )
  VALUES (
    _user_id, 
    _type, 
    _message, 
    _related_post_id, 
    _related_comment_id, 
    _triggered_by_user_id
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Update the toggle_post_like function to create notifications
CREATE OR REPLACE FUNCTION public.toggle_post_like(_user_id uuid, _post_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  like_exists BOOLEAN;
  post_owner_id UUID;
  post_owner_name TEXT;
  liker_name TEXT;
BEGIN
  -- Check if like exists
  SELECT EXISTS(
    SELECT 1 FROM post_likes 
    WHERE user_id = _user_id AND post_id = _post_id
  ) INTO like_exists;
  
  -- Get post owner info
  SELECT user_id INTO post_owner_id FROM posts WHERE id = _post_id;
  SELECT full_name INTO post_owner_name FROM profiles WHERE id = post_owner_id;
  SELECT full_name INTO liker_name FROM profiles WHERE id = _user_id;
  
  IF like_exists THEN
    -- Remove like
    DELETE FROM post_likes 
    WHERE user_id = _user_id AND post_id = _post_id;
    
    -- Decrease count
    UPDATE posts 
    SET likes = GREATEST(likes - 1, 0)
    WHERE id = _post_id;
    
    RETURN FALSE;
  ELSE
    -- Add like
    INSERT INTO post_likes (user_id, post_id) 
    VALUES (_user_id, _post_id);
    
    -- Increase count
    UPDATE posts 
    SET likes = likes + 1
    WHERE id = _post_id;
    
    -- Create notification for post owner
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
$$;

-- Update the toggle_comment_like function to create notifications
CREATE OR REPLACE FUNCTION public.toggle_comment_like(_user_id uuid, _comment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  like_exists BOOLEAN;
  comment_owner_id UUID;
  comment_owner_name TEXT;
  liker_name TEXT;
  related_post_id UUID;
BEGIN
  -- Check if like exists
  SELECT EXISTS(
    SELECT 1 FROM comment_likes 
    WHERE user_id = _user_id AND comment_id = _comment_id
  ) INTO like_exists;
  
  -- Get comment owner info and related post
  SELECT user_id, post_id INTO comment_owner_id, related_post_id FROM comments WHERE id = _comment_id;
  SELECT full_name INTO comment_owner_name FROM profiles WHERE id = comment_owner_id;
  SELECT full_name INTO liker_name FROM profiles WHERE id = _user_id;
  
  IF like_exists THEN
    -- Remove like
    DELETE FROM comment_likes 
    WHERE user_id = _user_id AND comment_id = _comment_id;
    
    -- Decrease count
    UPDATE comments 
    SET likes = GREATEST(likes - 1, 0)
    WHERE id = _comment_id;
    
    RETURN FALSE;
  ELSE
    -- Add like
    INSERT INTO comment_likes (user_id, comment_id) 
    VALUES (_user_id, _comment_id);
    
    -- Increase count
    UPDATE comments 
    SET likes = likes + 1
    WHERE id = _comment_id;
    
    -- Create notification for comment owner
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
$$;

-- Create trigger function for new comments
CREATE OR REPLACE FUNCTION public.notify_comment_added()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
  commenter_name TEXT;
BEGIN
  -- Get post owner
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  SELECT full_name INTO commenter_name FROM profiles WHERE id = NEW.user_id;
  
  -- Create notification for post owner
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new comments
CREATE TRIGGER trigger_notify_comment_added
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_comment_added();

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(_notification_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true, updated_at = now()
  WHERE id = _notification_id AND user_id = _user_id;
  
  RETURN FOUND;
END;
$$;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications 
  SET is_read = true, updated_at = now()
  WHERE user_id = _user_id AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;