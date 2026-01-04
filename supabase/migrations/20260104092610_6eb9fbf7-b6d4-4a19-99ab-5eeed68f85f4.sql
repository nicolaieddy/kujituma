-- Drop and recreate get_user_friends to include mutual_friends_count
DROP FUNCTION IF EXISTS public.get_user_friends(uuid);

CREATE OR REPLACE FUNCTION public.get_user_friends(_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  friend_id uuid,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz,
  last_active_at timestamptz,
  friend_count bigint,
  mutual_friends_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  requesting_user_id uuid;
BEGIN
  target_user_id := COALESCE(_user_id, auth.uid());
  requesting_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    p.id as friend_id,
    p.full_name,
    p.email,
    p.avatar_url,
    f.created_at,
    p.last_active_at,
    (
      SELECT COUNT(*)::bigint 
      FROM friends f2 
      WHERE f2.user1_id = p.id OR f2.user2_id = p.id
    ) as friend_count,
    -- Count mutual friends (friends of both requesting user and this friend)
    (
      SELECT COUNT(*)::bigint
      FROM (
        -- Friends of the requesting user
        SELECT CASE WHEN f3.user1_id = requesting_user_id THEN f3.user2_id ELSE f3.user1_id END as friend_of_requester
        FROM friends f3
        WHERE (f3.user1_id = requesting_user_id OR f3.user2_id = requesting_user_id)
          AND requesting_user_id != p.id -- exclude self
        INTERSECT
        -- Friends of the current friend being listed
        SELECT CASE WHEN f4.user1_id = p.id THEN f4.user2_id ELSE f4.user1_id END as friend_of_friend
        FROM friends f4
        WHERE (f4.user1_id = p.id OR f4.user2_id = p.id)
          AND p.id != requesting_user_id -- exclude requester
      ) mutual
    ) as mutual_friends_count
  FROM friends f
  JOIN profiles p ON (
    (f.user1_id = target_user_id AND f.user2_id = p.id) OR
    (f.user2_id = target_user_id AND f.user1_id = p.id)
  )
  WHERE f.user1_id = target_user_id OR f.user2_id = target_user_id;
END;
$$;