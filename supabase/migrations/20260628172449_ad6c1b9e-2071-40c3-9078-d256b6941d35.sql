DROP FUNCTION IF EXISTS public.get_admin_users_data();

CREATE FUNCTION public.get_admin_users_data()
 RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone,
  last_active_at timestamp with time zone,
  role text,
  posts_count bigint,
  days_active bigint,
  total_time_seconds bigint,
  total_clicks bigint,
  total_keypresses bigint,
  total_scrolls bigint,
  tos_accepted_at timestamp with time zone,
  tos_version text,
  goals_active bigint,
  goals_completed bigint,
  habits_count bigint,
  check_ins_total bigint,
  country text,
  city text,
  phone_verified boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.last_active_at,
    COALESCE(ur.role::text, 'user') as role,
    COALESCE(post_counts.count, 0) as posts_count,
    COALESCE(session_stats.days_active, 0) as days_active,
    COALESCE(session_stats.total_time_seconds, 0) as total_time_seconds,
    COALESCE(session_stats.total_clicks, 0) as total_clicks,
    COALESCE(session_stats.total_keypresses, 0) as total_keypresses,
    COALESCE(session_stats.total_scrolls, 0) as total_scrolls,
    tos.accepted_at as tos_accepted_at,
    tos.tos_version as tos_version,
    COALESCE(goal_stats.active_count, 0) as goals_active,
    COALESCE(goal_stats.completed_count, 0) as goals_completed,
    COALESCE(goal_stats.habits_count, 0) as habits_count,
    COALESCE(checkin_counts.count, 0) as check_ins_total,
    p.country,
    p.city,
    COALESCE(p.phone_verified, false) as phone_verified
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  LEFT JOIN (
    SELECT posts.user_id, COUNT(*) as count
    FROM public.posts
    GROUP BY posts.user_id
  ) post_counts ON p.id = post_counts.user_id
  LEFT JOIN (
    SELECT 
      us.user_id,
      COUNT(DISTINCT DATE(us.started_at)) as days_active,
      SUM(us.duration_seconds) as total_time_seconds,
      SUM(us.click_count) as total_clicks,
      SUM(us.keypress_count) as total_keypresses,
      SUM(us.scroll_count) as total_scrolls
    FROM public.user_sessions us
    GROUP BY us.user_id
  ) session_stats ON p.id = session_stats.user_id
  LEFT JOIN (
    SELECT 
      g.user_id,
      COUNT(*) FILTER (WHERE g.status IN ('not_started','active','in_progress')) AS active_count,
      COUNT(*) FILTER (WHERE g.status = 'completed') AS completed_count,
      COUNT(*) FILTER (
        WHERE g.habit_items IS NOT NULL 
          AND jsonb_typeof(g.habit_items) = 'array'
          AND jsonb_array_length(g.habit_items) > 0
      ) AS habits_count
    FROM public.goals g
    WHERE g.status <> 'deleted'
    GROUP BY g.user_id
  ) goal_stats ON p.id = goal_stats.user_id
  LEFT JOIN (
    SELECT dc.user_id, COUNT(*) AS count
    FROM public.daily_check_ins dc
    GROUP BY dc.user_id
  ) checkin_counts ON p.id = checkin_counts.user_id
  LEFT JOIN LATERAL (
    SELECT ta.accepted_at, ta.tos_version
    FROM public.tos_acceptances ta
    WHERE ta.user_id = p.id
    ORDER BY ta.accepted_at DESC
    LIMIT 1
  ) tos ON true
  ORDER BY p.created_at DESC;
END;
$function$;