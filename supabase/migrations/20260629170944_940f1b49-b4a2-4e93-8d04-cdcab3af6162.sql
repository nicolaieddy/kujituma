
-- 1. Goals: data migration first, then re-add the constraint
ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_status_check;
UPDATE public.goals SET status = 'done' WHERE status = 'completed';
ALTER TABLE public.goals ADD CONSTRAINT goals_status_check
  CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'done'::text, 'deleted'::text, 'deprioritized'::text]));

-- 2. Goals status-change trigger
CREATE OR REPLACE FUNCTION public.track_goal_status_change()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.goal_status_history (goal_id, old_status, new_status, user_id)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.user_id);
    IF NEW.status = 'done' AND OLD.status != 'done' THEN
      NEW.completed_at = now();
    ELSIF NEW.status != 'done' THEN
      NEW.completed_at = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Admin users data
CREATE OR REPLACE FUNCTION public.get_admin_users_data()
 RETURNS TABLE(id uuid, email text, full_name text, avatar_url text, created_at timestamp with time zone, last_active_at timestamp with time zone, role text, posts_count bigint, days_active bigint, total_time_seconds bigint, total_clicks bigint, total_keypresses bigint, total_scrolls bigint, tos_accepted_at timestamp with time zone, tos_version text, goals_active bigint, goals_completed bigint, habits_count bigint, check_ins_total bigint, country text, city text, phone_verified boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.avatar_url, p.created_at, p.last_active_at,
    COALESCE(ur.role::text, 'user') as role,
    COALESCE(post_counts.count, 0) as posts_count,
    COALESCE(session_stats.days_active, 0) as days_active,
    COALESCE(session_stats.total_time_seconds, 0) as total_time_seconds,
    COALESCE(session_stats.total_clicks, 0) as total_clicks,
    COALESCE(session_stats.total_keypresses, 0) as total_keypresses,
    COALESCE(session_stats.total_scrolls, 0) as total_scrolls,
    tos.accepted_at as tos_accepted_at, tos.tos_version as tos_version,
    COALESCE(goal_stats.active_count, 0) as goals_active,
    COALESCE(goal_stats.completed_count, 0) as goals_completed,
    COALESCE(goal_stats.habits_count, 0) as habits_count,
    COALESCE(checkin_counts.count, 0) as check_ins_total,
    p.country, p.city, COALESCE(p.phone_verified, false) as phone_verified
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  LEFT JOIN (SELECT posts.user_id, COUNT(*) as count FROM public.posts GROUP BY posts.user_id) post_counts ON p.id = post_counts.user_id
  LEFT JOIN (
    SELECT us.user_id,
      COUNT(DISTINCT DATE(us.started_at)) as days_active,
      SUM(us.duration_seconds) as total_time_seconds,
      SUM(us.click_count) as total_clicks,
      SUM(us.keypress_count) as total_keypresses,
      SUM(us.scroll_count) as total_scrolls
    FROM public.user_sessions us GROUP BY us.user_id
  ) session_stats ON p.id = session_stats.user_id
  LEFT JOIN (
    SELECT g.user_id,
      COUNT(*) FILTER (WHERE g.status IN ('not_started','active','in_progress')) AS active_count,
      COUNT(*) FILTER (WHERE g.status = 'done') AS completed_count,
      COUNT(*) FILTER (WHERE g.habit_items IS NOT NULL AND jsonb_typeof(g.habit_items) = 'array' AND jsonb_array_length(g.habit_items) > 0) AS habits_count
    FROM public.goals g WHERE g.status <> 'deleted' GROUP BY g.user_id
  ) goal_stats ON p.id = goal_stats.user_id
  LEFT JOIN (SELECT dc.user_id, COUNT(*) AS count FROM public.daily_check_ins dc GROUP BY dc.user_id) checkin_counts ON p.id = checkin_counts.user_id
  LEFT JOIN LATERAL (SELECT ta.accepted_at, ta.tos_version FROM public.tos_acceptances ta WHERE ta.user_id = p.id ORDER BY ta.accepted_at DESC LIMIT 1) tos ON true
  ORDER BY p.created_at DESC;
END;
$function$;

-- 4. Profile page data
CREATE OR REPLACE FUNCTION public.get_profile_page_data(p_profile_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB; v_user_id UUID := auth.uid();
  v_is_owner BOOLEAN; v_is_friend BOOLEAN; v_is_partner BOOLEAN;
  v_partner_can_view_goals BOOLEAN := false; v_partnership_id UUID;
  v_friendship_status JSONB; v_partnership_status JSONB;
  v_profile_data JSONB; v_visible_goals JSONB; v_stats JSONB;
BEGIN
  v_is_owner := (v_user_id = p_profile_user_id);
  IF v_user_id IS NOT NULL AND NOT v_is_owner THEN
    SELECT EXISTS(SELECT 1 FROM friends WHERE user1_id = LEAST(v_user_id, p_profile_user_id) AND user2_id = GREATEST(v_user_id, p_profile_user_id)) INTO v_is_friend;
  ELSE v_is_friend := false; END IF;
  IF v_user_id IS NOT NULL AND NOT v_is_owner THEN
    SELECT id, CASE WHEN user1_id = v_user_id THEN user1_can_view_user2_goals ELSE user2_can_view_user1_goals END
    INTO v_partnership_id, v_partner_can_view_goals
    FROM accountability_partnerships
    WHERE status = 'active' AND ((user1_id = v_user_id AND user2_id = p_profile_user_id) OR (user1_id = p_profile_user_id AND user2_id = v_user_id));
    v_is_partner := v_partnership_id IS NOT NULL;
  ELSE v_is_partner := false; END IF;
  IF v_is_owner THEN v_friendship_status := jsonb_build_object('is_owner', true);
  ELSIF v_is_friend THEN v_friendship_status := jsonb_build_object('is_friend', true);
  ELSIF v_user_id IS NOT NULL THEN
    SELECT jsonb_build_object('is_friend', false, 'friend_request_status', CASE WHEN sender_id = v_user_id THEN 'sent' ELSE 'received' END, 'request_id', id)
    INTO v_friendship_status FROM friend_requests
    WHERE status = 'pending' AND ((sender_id = v_user_id AND receiver_id = p_profile_user_id) OR (sender_id = p_profile_user_id AND receiver_id = v_user_id)) LIMIT 1;
    IF v_friendship_status IS NULL THEN v_friendship_status := jsonb_build_object('is_friend', false); END IF;
  ELSE v_friendship_status := jsonb_build_object('is_friend', false); END IF;
  IF v_is_owner THEN v_partnership_status := jsonb_build_object('is_owner', true);
  ELSIF v_is_partner THEN v_partnership_status := jsonb_build_object('is_partner', true, 'partnership_id', v_partnership_id, 'can_view_partner_goals', v_partner_can_view_goals);
  ELSIF v_user_id IS NOT NULL THEN
    SELECT jsonb_build_object('is_partner', false, 'request_status', CASE WHEN sender_id = v_user_id THEN 'sent' ELSE 'received' END, 'request_id', id)
    INTO v_partnership_status FROM accountability_partner_requests
    WHERE status = 'pending' AND ((sender_id = v_user_id AND receiver_id = p_profile_user_id) OR (sender_id = p_profile_user_id AND receiver_id = v_user_id)) LIMIT 1;
    IF v_partnership_status IS NULL THEN v_partnership_status := jsonb_build_object('is_partner', false); END IF;
  ELSE v_partnership_status := jsonb_build_object('is_partner', false); END IF;
  IF v_is_owner THEN
    SELECT to_jsonb(p) INTO v_profile_data FROM profiles p WHERE p.id = p_profile_user_id;
  ELSIF v_user_id IS NOT NULL THEN
    SELECT jsonb_build_object('id', id, 'full_name', full_name, 'avatar_url', avatar_url, 'cover_photo_url', cover_photo_url, 'cover_photo_position', cover_photo_position, 'about_me', about_me, 'linkedin_url', linkedin_url, 'instagram_url', instagram_url, 'tiktok_url', tiktok_url, 'twitter_url', twitter_url, 'social_links_order', social_links_order, 'created_at', created_at, 'last_active_at', last_active_at)
    INTO v_profile_data FROM profiles WHERE id = p_profile_user_id;
  ELSE
    SELECT jsonb_build_object('id', id, 'full_name', full_name, 'avatar_url', avatar_url, 'cover_photo_url', cover_photo_url, 'cover_photo_position', cover_photo_position, 'about_me', about_me, 'created_at', created_at)
    INTO v_profile_data FROM profiles WHERE id = p_profile_user_id;
  END IF;
  SELECT jsonb_build_object(
    'goals_completed', (SELECT COUNT(*) FROM goals WHERE user_id = p_profile_user_id AND status = 'done'),
    'current_streak', COALESCE((SELECT current_weekly_streak FROM user_streaks WHERE user_id = p_profile_user_id), 0),
    'longest_streak', COALESCE((SELECT longest_weekly_streak FROM user_streaks WHERE user_id = p_profile_user_id), 0),
    'weeks_shared', (SELECT COUNT(*) FROM posts WHERE user_id = p_profile_user_id AND hidden = false)
  ) INTO v_stats;
  IF v_is_owner THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'description', description, 'status', status, 'visibility', visibility, 'timeframe', timeframe, 'category', category, 'target_date', target_date, 'created_at', created_at, 'completed_at', completed_at, 'is_recurring', is_recurring) ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_visible_goals FROM goals WHERE user_id = p_profile_user_id AND status != 'deprioritized';
  ELSIF v_is_friend OR v_partner_can_view_goals THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'description', description, 'status', status, 'visibility', visibility, 'timeframe', timeframe, 'category', category, 'target_date', target_date, 'created_at', created_at, 'completed_at', completed_at, 'is_recurring', is_recurring) ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_visible_goals FROM goals WHERE user_id = p_profile_user_id AND status != 'deprioritized' AND visibility IN ('public', 'friends');
  ELSE
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'description', description, 'status', status, 'visibility', visibility, 'timeframe', timeframe, 'category', category, 'target_date', target_date, 'created_at', created_at, 'completed_at', completed_at, 'is_recurring', is_recurring) ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_visible_goals FROM goals WHERE user_id = p_profile_user_id AND status != 'deprioritized' AND visibility = 'public';
  END IF;
  result := jsonb_build_object('profile', v_profile_data, 'stats', v_stats, 'friendship', v_friendship_status, 'partnership', v_partnership_status, 'goals', v_visible_goals, 'viewer_context', jsonb_build_object('is_owner', v_is_owner, 'is_friend', v_is_friend, 'is_partner', v_is_partner, 'can_view_partner_goals', v_partner_can_view_goals));
  RETURN result;
END;
$function$;

-- 5. is_completed-based functions migrated to status='done'
CREATE OR REPLACE FUNCTION public.get_carryover_data(p_current_week_start text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result JSONB; v_user_id UUID := auth.uid(); v_null_uuid UUID := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT jsonb_build_object(
    'incomplete_objectives', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', agg.id, 'user_id', agg.user_id, 'goal_id', agg.goal_id, 'text', agg.text, 'status', agg.status, 'week_start', agg.most_recent_week, 'created_at', agg.created_at, 'updated_at', agg.updated_at, 'carry_over_count', agg.carry_over_count, 'oldest_week', agg.oldest_week) ORDER BY agg.most_recent_week DESC), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (wo.text, COALESCE(wo.goal_id, v_null_uuid))
          wo.id, wo.user_id, wo.goal_id, wo.text, wo.status, wo.created_at, wo.updated_at,
          (SELECT MAX(i.week_start) FROM weekly_objectives i WHERE i.user_id = v_user_id AND i.status <> 'done' AND i.week_start < p_current_week_start::date AND i.text = wo.text AND COALESCE(i.goal_id, v_null_uuid) = COALESCE(wo.goal_id, v_null_uuid)) as most_recent_week,
          (SELECT MIN(i.week_start) FROM weekly_objectives i WHERE i.user_id = v_user_id AND i.status <> 'done' AND i.week_start < p_current_week_start::date AND i.text = wo.text AND COALESCE(i.goal_id, v_null_uuid) = COALESCE(wo.goal_id, v_null_uuid)) as oldest_week,
          (SELECT COUNT(*) FROM weekly_objectives i WHERE i.user_id = v_user_id AND i.status <> 'done' AND i.week_start < p_current_week_start::date AND i.text = wo.text AND COALESCE(i.goal_id, v_null_uuid) = COALESCE(wo.goal_id, v_null_uuid)) as carry_over_count
        FROM weekly_objectives wo
        WHERE wo.user_id = v_user_id AND wo.status <> 'done' AND wo.week_start < p_current_week_start::date
          AND NOT EXISTS (SELECT 1 FROM weekly_objectives c WHERE c.user_id = v_user_id AND c.status = 'done' AND c.text = wo.text AND COALESCE(c.goal_id, v_null_uuid) = COALESCE(wo.goal_id, v_null_uuid))
          AND NOT EXISTS (SELECT 1 FROM weekly_objectives f WHERE f.user_id = v_user_id AND f.week_start >= p_current_week_start::date AND f.text = wo.text AND COALESCE(f.goal_id, v_null_uuid) = COALESCE(wo.goal_id, v_null_uuid))
          AND NOT EXISTS (SELECT 1 FROM dismissed_carryover_objectives d WHERE d.user_id = v_user_id AND d.objective_text = wo.text AND COALESCE(d.goal_id, v_null_uuid) = COALESCE(wo.goal_id, v_null_uuid))
        ORDER BY wo.text, COALESCE(wo.goal_id, v_null_uuid), wo.week_start DESC
      ) agg
    ),
    'current_future_objectives', (SELECT COALESCE(jsonb_agg(jsonb_build_object('text', wo.text, 'goal_id', wo.goal_id)), '[]'::jsonb) FROM weekly_objectives wo WHERE wo.user_id = v_user_id AND wo.week_start >= p_current_week_start::date),
    'dismissed_objectives', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', d.id, 'objective_text', d.objective_text, 'goal_id', d.goal_id, 'dismissed_at', d.dismissed_at)), '[]'::jsonb) FROM dismissed_carryover_objectives d WHERE d.user_id = v_user_id)
  ) INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_goals_objective_counts()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_object_agg(goal_id::text, jsonb_build_object('total', total_count, 'completed', completed_count)), '{}'::jsonb)
    FROM (
      SELECT wo.goal_id, COUNT(*)::int AS total_count, COUNT(*) FILTER (WHERE wo.status = 'done')::int AS completed_count
      FROM weekly_objectives wo WHERE wo.user_id = v_user_id AND wo.goal_id IS NOT NULL GROUP BY wo.goal_id
    ) counts
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_partner_dashboard_data(p_partner_id uuid, p_week_start text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID := auth.uid(); v_partnership RECORD; v_is_user1 BOOLEAN; v_can_view BOOLEAN; v_my_cadence TEXT; v_result JSONB;
BEGIN
  SELECT * INTO v_partnership FROM accountability_partnerships
  WHERE status = 'active' AND ((user1_id = v_user_id AND user2_id = p_partner_id) OR (user1_id = p_partner_id AND user2_id = v_user_id));
  IF v_partnership IS NULL THEN RETURN jsonb_build_object('error', 'Partnership not found'); END IF;
  v_is_user1 := (v_partnership.user1_id = v_user_id);
  v_can_view := CASE WHEN v_is_user1 THEN v_partnership.user1_can_view_user2_goals ELSE v_partnership.user2_can_view_user1_goals END;
  v_my_cadence := CASE WHEN v_is_user1 THEN COALESCE(v_partnership.my_check_in_cadence_user1, 'weekly') ELSE COALESCE(v_partnership.my_check_in_cadence_user2, 'weekly') END;
  WITH goal_objective_counts AS (
    SELECT wo.goal_id, COUNT(*)::int as total_count, COUNT(*) FILTER (WHERE wo.status = 'done')::int as completed_count
    FROM weekly_objectives wo WHERE wo.goal_id IS NOT NULL GROUP BY wo.goal_id
  ),
  partner_goals AS (
    SELECT g.id, g.title, g.description, g.status, g.timeframe, g.category, g.created_at, g.target_date, g.is_recurring, g.habit_items,
      COALESCE(goc.total_count, 0) as objectives_count, COALESCE(goc.completed_count, 0) as completed_objectives_count
    FROM goals g LEFT JOIN goal_objective_counts goc ON goc.goal_id = g.id
    WHERE g.user_id = p_partner_id AND g.status IN ('not_started', 'active', 'in_progress')
  ),
  week_objectives AS (
    SELECT wo.id, wo.text, wo.status, wo.week_start, wo.goal_id, wo.scheduled_day, wo.scheduled_time, wo.order_index, g.title as goal_title
    FROM weekly_objectives wo LEFT JOIN goals g ON g.id = wo.goal_id
    WHERE wo.user_id = p_partner_id AND wo.week_start = p_week_start::date
  ),
  habit_goals AS (
    SELECT g.id, g.title, g.habit_items FROM goals g
    WHERE g.user_id = p_partner_id AND g.status IN ('not_started', 'active', 'in_progress')
      AND g.habit_items IS NOT NULL AND jsonb_array_length(g.habit_items) > 0
  )
  SELECT jsonb_build_object(
    'can_view_partner_goals', v_can_view,
    'partner_can_view_my_goals', CASE WHEN v_is_user1 THEN v_partnership.user2_can_view_user1_goals ELSE v_partnership.user1_can_view_user2_goals END,
    'my_check_in_cadence', v_my_cadence,
    'profile', (SELECT jsonb_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url, 'email', p.email, 'about_me', p.about_me) FROM profiles p WHERE p.id = p_partner_id),
    'partnership', jsonb_build_object('id', v_partnership.id, 'user1_id', v_partnership.user1_id, 'user2_id', v_partnership.user2_id, 'last_check_in_at', v_partnership.last_check_in_at, 'created_at', v_partnership.created_at),
    'goals', CASE WHEN v_can_view THEN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', pg.id, 'title', pg.title, 'description', pg.description, 'status', pg.status, 'timeframe', pg.timeframe, 'category', pg.category, 'created_at', pg.created_at, 'target_date', pg.target_date, 'is_recurring', pg.is_recurring, 'habit_items', pg.habit_items, 'objectives_count', pg.objectives_count, 'completed_objectives_count', pg.completed_objectives_count) ORDER BY pg.created_at DESC), '[]'::jsonb) FROM partner_goals pg) ELSE '[]'::jsonb END,
    'objectives', CASE WHEN v_can_view THEN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', wo.id, 'text', wo.text, 'status', wo.status, 'week_start', wo.week_start, 'goal_id', wo.goal_id, 'scheduled_day', wo.scheduled_day, 'scheduled_time', wo.scheduled_time, 'order_index', wo.order_index, 'goal', CASE WHEN wo.goal_id IS NOT NULL THEN jsonb_build_object('title', wo.goal_title) ELSE NULL END) ORDER BY wo.order_index), '[]'::jsonb) FROM week_objectives wo) ELSE '[]'::jsonb END,
    'habit_stats', CASE WHEN v_can_view THEN (SELECT COALESCE(jsonb_agg(jsonb_build_object('goal', jsonb_build_object('id', hg.id, 'title', hg.title, 'habit_items', hg.habit_items), 'currentStreak', 0, 'completionRate', 0, 'totalWeeks', 0, 'completedWeeks', 0, 'weeklyHistory', '[]'::jsonb)), '[]'::jsonb) FROM habit_goals hg) ELSE '[]'::jsonb END
  ) INTO v_result;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_partner_weekly_completion_stats(p_partner_id uuid, p_weeks integer DEFAULT 12)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result JSONB; v_user_id UUID := auth.uid(); v_is_partner BOOLEAN; v_can_view BOOLEAN; v_current_week_start DATE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT TRUE, CASE WHEN user1_id = v_user_id THEN user1_can_view_user2_goals ELSE user2_can_view_user1_goals END
  INTO v_is_partner, v_can_view
  FROM accountability_partnerships
  WHERE status = 'active' AND ((user1_id = v_user_id AND user2_id = p_partner_id) OR (user1_id = p_partner_id AND user2_id = v_user_id));
  IF NOT COALESCE(v_is_partner, FALSE) OR NOT COALESCE(v_can_view, FALSE) THEN RETURN '[]'::jsonb; END IF;
  v_current_week_start := date_trunc('week', CURRENT_DATE)::date;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('week_start', ws.week_start::text, 'total', COALESCE(stats.total, 0), 'completed', COALESCE(stats.completed, 0)) ORDER BY ws.week_start), '[]'::jsonb)
  INTO result
  FROM generate_series(v_current_week_start - ((p_weeks - 1) * 7), v_current_week_start, '7 days'::interval) AS ws(week_start)
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS total, COUNT(*) FILTER (WHERE status = 'done')::integer AS completed
    FROM weekly_objectives WHERE user_id = p_partner_id AND week_start = ws.week_start::date
  ) stats ON TRUE;
  RETURN result;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_public_commitments(uuid, date);
CREATE OR REPLACE FUNCTION public.get_public_commitments(_user_id uuid, _week_start date)
 RETURNS TABLE(id uuid, objective_id uuid, objective_text text, status objective_status, rank integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT pc.id, pc.objective_id, wo.text as objective_text, wo.status, pc.rank
  FROM public_commitments pc JOIN weekly_objectives wo ON wo.id = pc.objective_id
  WHERE pc.user_id = _user_id AND pc.week_start = _week_start
  ORDER BY pc.rank;
$function$;

CREATE OR REPLACE FUNCTION public.get_weekly_dashboard_data(p_week_start text, p_last_week_start text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result JSONB; v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT jsonb_build_object(
    'objectives', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', wo.id, 'user_id', wo.user_id, 'goal_id', wo.goal_id, 'text', wo.text, 'status', wo.status, 'week_start', wo.week_start, 'scheduled_day', wo.scheduled_day, 'scheduled_time', wo.scheduled_time, 'order_index', wo.order_index, 'created_at', wo.created_at, 'updated_at', wo.updated_at) ORDER BY wo.order_index NULLS LAST, wo.created_at), '[]'::jsonb)
      FROM weekly_objectives wo WHERE wo.user_id = v_user_id AND wo.week_start = p_week_start::date
    ),
    'progress_post', (SELECT CASE WHEN wpp.id IS NOT NULL THEN jsonb_build_object('id', wpp.id, 'user_id', wpp.user_id, 'week_start', wpp.week_start, 'notes', wpp.notes, 'is_completed', wpp.is_completed, 'completed_at', wpp.completed_at, 'incomplete_reflections', wpp.incomplete_reflections, 'created_at', wpp.created_at, 'updated_at', wpp.updated_at) ELSE NULL END FROM weekly_progress_posts wpp WHERE wpp.user_id = v_user_id AND wpp.week_start = p_week_start::date ORDER BY wpp.is_completed DESC, wpp.updated_at DESC LIMIT 1),
    'planning_session', (SELECT CASE WHEN wps.id IS NOT NULL THEN jsonb_build_object('id', wps.id, 'user_id', wps.user_id, 'week_start', wps.week_start, 'week_intention', wps.week_intention, 'is_completed', wps.is_completed, 'completed_at', wps.completed_at, 'created_at', wps.created_at, 'updated_at', wps.updated_at) ELSE NULL END FROM weekly_planning_sessions wps WHERE wps.user_id = v_user_id AND wps.week_start = p_week_start::date ORDER BY wps.is_completed DESC, wps.updated_at DESC LIMIT 1),
    'last_week_objectives', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', wo.id, 'user_id', wo.user_id, 'goal_id', wo.goal_id, 'text', wo.text, 'status', wo.status, 'week_start', wo.week_start, 'scheduled_day', wo.scheduled_day, 'scheduled_time', wo.scheduled_time, 'order_index', wo.order_index, 'created_at', wo.created_at, 'updated_at', wo.updated_at) ORDER BY wo.order_index NULLS LAST, wo.created_at), '[]'::jsonb)
      FROM weekly_objectives wo WHERE wo.user_id = v_user_id AND wo.week_start = p_last_week_start::date
    ),
    'last_week_post', (SELECT CASE WHEN wpp.id IS NOT NULL THEN jsonb_build_object('id', wpp.id, 'user_id', wpp.user_id, 'week_start', wpp.week_start, 'notes', wpp.notes, 'is_completed', wpp.is_completed, 'completed_at', wpp.completed_at, 'incomplete_reflections', wpp.incomplete_reflections, 'created_at', wpp.created_at, 'updated_at', wpp.updated_at) ELSE NULL END FROM weekly_progress_posts wpp WHERE wpp.user_id = v_user_id AND wpp.week_start = p_last_week_start::date ORDER BY wpp.is_completed DESC, wpp.updated_at DESC LIMIT 1),
    'last_week_planning', (SELECT CASE WHEN wps.id IS NOT NULL THEN jsonb_build_object('id', wps.id, 'user_id', wps.user_id, 'week_start', wps.week_start, 'week_intention', wps.week_intention, 'is_completed', wps.is_completed, 'completed_at', wps.completed_at, 'created_at', wps.created_at, 'updated_at', wps.updated_at) ELSE NULL END FROM weekly_planning_sessions wps WHERE wps.user_id = v_user_id AND wps.week_start = p_last_week_start::date ORDER BY wps.is_completed DESC, wps.updated_at DESC LIMIT 1)
  ) INTO result;
  RETURN result;
END;
$function$;

-- 6. Recreate auto-promote trigger to watch status instead of is_completed
DROP TRIGGER IF EXISTS trigger_auto_promote_goal_on_objective_update ON public.weekly_objectives;
CREATE TRIGGER trigger_auto_promote_goal_on_objective_update
  AFTER UPDATE OF status ON public.weekly_objectives
  FOR EACH ROW
  WHEN (NEW.status = 'done' AND OLD.status <> 'done')
  EXECUTE FUNCTION public.auto_promote_goal_status();

-- 7. Drop sync trigger + is_completed column (status is single source of truth)
DROP TRIGGER IF EXISTS trg_sync_weekly_objective_status ON public.weekly_objectives;
DROP FUNCTION IF EXISTS public.sync_weekly_objective_status();
ALTER TABLE public.weekly_objectives DROP COLUMN IF EXISTS is_completed;
