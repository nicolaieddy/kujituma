-- Drop and recreate get_user_friends function to include last_active_at and friend_count
DROP FUNCTION IF EXISTS public.get_user_friends(uuid);

CREATE FUNCTION public.get_user_friends(_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  friend_id uuid,
  full_name text,
  avatar_url text,
  email text,
  created_at timestamp with time zone,
  last_active_at timestamp with time zone,
  friend_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  ),
  friend_counts AS (
    SELECT 
      uf.friend_id,
      (
        SELECT COUNT(*) 
        FROM friends f2 
        WHERE f2.user1_id = uf.friend_id OR f2.user2_id = uf.friend_id
      ) as friend_count
    FROM user_friends uf
  )
  SELECT 
    uf.friend_id,
    p.full_name,
    p.avatar_url,
    p.email,
    uf.created_at,
    p.last_active_at,
    fc.friend_count
  FROM user_friends uf
  JOIN profiles p ON p.id = uf.friend_id
  JOIN friend_counts fc ON fc.friend_id = uf.friend_id
  ORDER BY uf.created_at DESC;
$$;