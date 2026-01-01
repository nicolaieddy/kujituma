-- Drop and recreate get_admin_users_data with new columns
DROP FUNCTION IF EXISTS public.get_admin_users_data();

CREATE OR REPLACE FUNCTION public.get_admin_users_data()
RETURNS TABLE(
  id uuid, 
  email text, 
  full_name text, 
  avatar_url text, 
  created_at timestamp with time zone, 
  posts_count bigint, 
  role text, 
  last_active_at timestamp with time zone,
  total_time_seconds bigint,
  days_active bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    p.last_active_at,
    COALESCE(session_stats.total_seconds, 0) as total_time_seconds,
    COALESCE(session_stats.unique_days, 0) as days_active
  FROM profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM posts
    GROUP BY user_id
  ) post_counts ON p.id = post_counts.user_id
  LEFT JOIN user_roles ur ON p.id = ur.user_id
  LEFT JOIN (
    SELECT 
      us.user_id,
      SUM(us.duration_seconds)::bigint as total_seconds,
      COUNT(DISTINCT DATE(us.started_at))::bigint as unique_days
    FROM user_sessions us
    GROUP BY us.user_id
  ) session_stats ON p.id = session_stats.user_id
  ORDER BY p.last_active_at DESC NULLS LAST;
END;
$$;