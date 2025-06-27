
-- Add likes column to posts table
ALTER TABLE posts ADD COLUMN likes INTEGER DEFAULT 0;

-- Add likes column to comments table
ALTER TABLE comments ADD COLUMN likes INTEGER DEFAULT 0;

-- Create a table to track user likes on posts
CREATE TABLE post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create a table to track user likes on comments
CREATE TABLE comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  comment_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

-- Function to toggle post like
CREATE OR REPLACE FUNCTION toggle_post_like(
  _user_id UUID,
  _post_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  like_exists BOOLEAN;
BEGIN
  -- Check if like exists
  SELECT EXISTS(
    SELECT 1 FROM post_likes 
    WHERE user_id = _user_id AND post_id = _post_id
  ) INTO like_exists;
  
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
    
    RETURN TRUE;
  END IF;
END;
$$;

-- Function to toggle comment like
CREATE OR REPLACE FUNCTION toggle_comment_like(
  _user_id UUID,
  _comment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  like_exists BOOLEAN;
BEGIN
  -- Check if like exists
  SELECT EXISTS(
    SELECT 1 FROM comment_likes 
    WHERE user_id = _user_id AND comment_id = _comment_id
  ) INTO like_exists;
  
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
    
    RETURN TRUE;
  END IF;
END;
$$;
