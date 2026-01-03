-- Drop and recreate get_admin_users_data function with ToS fields
DROP FUNCTION IF EXISTS public.get_admin_users_data();

CREATE OR REPLACE FUNCTION public.get_admin_users_data()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  posts_count BIGINT,
  role TEXT,
  last_active_at TIMESTAMPTZ,
  total_time_seconds BIGINT,
  days_active BIGINT,
  total_clicks BIGINT,
  total_scrolls BIGINT,
  total_keypresses BIGINT,
  tos_accepted_at TIMESTAMPTZ,
  tos_version TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.created_at,
    COALESCE((SELECT COUNT(*) FROM posts WHERE posts.user_id = p.id), 0) as posts_count,
    COALESCE((SELECT ur.role::text FROM user_roles ur WHERE ur.user_id = p.id LIMIT 1), 'user') as role,
    p.last_active_at,
    COALESCE((SELECT SUM(us.duration_seconds) FROM user_sessions us WHERE us.user_id = p.id), 0) as total_time_seconds,
    COALESCE((SELECT COUNT(DISTINCT DATE(us.started_at)) FROM user_sessions us WHERE us.user_id = p.id), 0) as days_active,
    COALESCE((SELECT SUM(us.click_count) FROM user_sessions us WHERE us.user_id = p.id), 0) as total_clicks,
    COALESCE((SELECT SUM(us.scroll_count) FROM user_sessions us WHERE us.user_id = p.id), 0) as total_scrolls,
    COALESCE((SELECT SUM(us.keypress_count) FROM user_sessions us WHERE us.user_id = p.id), 0) as total_keypresses,
    (SELECT ta.accepted_at FROM tos_acceptances ta WHERE ta.user_id = p.id ORDER BY ta.accepted_at DESC LIMIT 1) as tos_accepted_at,
    (SELECT ta.tos_version FROM tos_acceptances ta WHERE ta.user_id = p.id ORDER BY ta.accepted_at DESC LIMIT 1) as tos_version
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;