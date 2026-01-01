-- Add interaction tracking columns to user_sessions
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS scroll_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS keypress_count INTEGER NOT NULL DEFAULT 0;

-- Update the heartbeat function to accept interaction counts
DROP FUNCTION IF EXISTS public.upsert_session_heartbeat(UUID);
CREATE OR REPLACE FUNCTION public.upsert_session_heartbeat(
  _session_token UUID,
  _clicks INTEGER DEFAULT 0,
  _scrolls INTEGER DEFAULT 0,
  _keypresses INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_session_id UUID;
  new_session_id UUID;
  delta_seconds INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  SELECT id INTO existing_session_id
  FROM public.user_sessions
  WHERE session_token = _session_token
    AND user_id = auth.uid()
    AND ended_at IS NULL;

  IF existing_session_id IS NOT NULL THEN
    SELECT LEAST(EXTRACT(EPOCH FROM (now() - last_heartbeat_at))::INTEGER, 60)
      INTO delta_seconds
    FROM public.user_sessions
    WHERE id = existing_session_id;

    UPDATE public.user_sessions
    SET 
      last_heartbeat_at = now(),
      duration_seconds = duration_seconds + COALESCE(delta_seconds, 0),
      click_count = click_count + _clicks,
      scroll_count = scroll_count + _scrolls,
      keypress_count = keypress_count + _keypresses
    WHERE id = existing_session_id;

    RETURN existing_session_id;
  END IF;

  INSERT INTO public.user_sessions (user_id, session_token, click_count, scroll_count, keypress_count)
  VALUES (auth.uid(), _session_token, _clicks, _scrolls, _keypresses)
  RETURNING id INTO new_session_id;

  RETURN new_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_session_heartbeat(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;

-- Update admin function to include interaction stats
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
  days_active bigint,
  total_clicks bigint,
  total_scrolls bigint,
  total_keypresses bigint
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
    COALESCE(session_stats.unique_days, 0) as days_active,
    COALESCE(session_stats.total_clicks, 0) as total_clicks,
    COALESCE(session_stats.total_scrolls, 0) as total_scrolls,
    COALESCE(session_stats.total_keypresses, 0) as total_keypresses
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM public.posts
    GROUP BY user_id
  ) post_counts ON p.id = post_counts.user_id
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  LEFT JOIN (
    SELECT
      us.user_id,
      SUM(us.duration_seconds)::bigint as total_seconds,
      COUNT(DISTINCT DATE(us.started_at))::bigint as unique_days,
      SUM(us.click_count)::bigint as total_clicks,
      SUM(us.scroll_count)::bigint as total_scrolls,
      SUM(us.keypress_count)::bigint as total_keypresses
    FROM public.user_sessions us
    GROUP BY us.user_id
  ) session_stats ON p.id = session_stats.user_id
  ORDER BY p.last_active_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_users_data() TO authenticated;

NOTIFY pgrst, 'reload schema';