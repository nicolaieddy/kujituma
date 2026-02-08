-- Fix the get_weekly_dashboard_data function to use correct column name (scheduled_day, not scheduled_date)
-- Also add missing scheduled_time column to the output

CREATE OR REPLACE FUNCTION public.get_weekly_dashboard_data(p_week_start text, p_last_week_start text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jsonb_build_object(
    'objectives', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', wo.id,
          'user_id', wo.user_id,
          'goal_id', wo.goal_id,
          'text', wo.text,
          'is_completed', wo.is_completed,
          'week_start', wo.week_start,
          'scheduled_day', wo.scheduled_day,
          'scheduled_time', wo.scheduled_time,
          'order_index', wo.order_index,
          'created_at', wo.created_at,
          'updated_at', wo.updated_at
        ) ORDER BY wo.order_index NULLS LAST, wo.created_at
      ), '[]'::jsonb)
      FROM weekly_objectives wo
      WHERE wo.user_id = v_user_id AND wo.week_start = p_week_start::date
    ),
    'progress_post', (
      SELECT CASE WHEN wpp.id IS NOT NULL THEN
        jsonb_build_object(
          'id', wpp.id,
          'user_id', wpp.user_id,
          'week_start', wpp.week_start,
          'notes', wpp.notes,
          'is_completed', wpp.is_completed,
          'completed_at', wpp.completed_at,
          'incomplete_reflections', wpp.incomplete_reflections,
          'created_at', wpp.created_at,
          'updated_at', wpp.updated_at
        )
      ELSE NULL END
      FROM weekly_progress_posts wpp
      WHERE wpp.user_id = v_user_id AND wpp.week_start = p_week_start::date
      ORDER BY wpp.is_completed DESC, wpp.updated_at DESC
      LIMIT 1
    ),
    'planning_session', (
      SELECT CASE WHEN wps.id IS NOT NULL THEN
        jsonb_build_object(
          'id', wps.id,
          'user_id', wps.user_id,
          'week_start', wps.week_start,
          'week_intention', wps.week_intention,
          'is_completed', wps.is_completed,
          'completed_at', wps.completed_at,
          'created_at', wps.created_at,
          'updated_at', wps.updated_at
        )
      ELSE NULL END
      FROM weekly_planning_sessions wps
      WHERE wps.user_id = v_user_id AND wps.week_start = p_week_start::date
      ORDER BY wps.is_completed DESC, wps.updated_at DESC
      LIMIT 1
    ),
    'last_week_objectives', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', wo.id,
          'user_id', wo.user_id,
          'goal_id', wo.goal_id,
          'text', wo.text,
          'is_completed', wo.is_completed,
          'week_start', wo.week_start,
          'scheduled_day', wo.scheduled_day,
          'scheduled_time', wo.scheduled_time,
          'order_index', wo.order_index,
          'created_at', wo.created_at,
          'updated_at', wo.updated_at
        ) ORDER BY wo.order_index NULLS LAST, wo.created_at
      ), '[]'::jsonb)
      FROM weekly_objectives wo
      WHERE wo.user_id = v_user_id AND wo.week_start = p_last_week_start::date
    ),
    'last_week_post', (
      SELECT CASE WHEN wpp.id IS NOT NULL THEN
        jsonb_build_object(
          'id', wpp.id,
          'user_id', wpp.user_id,
          'week_start', wpp.week_start,
          'notes', wpp.notes,
          'is_completed', wpp.is_completed,
          'completed_at', wpp.completed_at,
          'incomplete_reflections', wpp.incomplete_reflections,
          'created_at', wpp.created_at,
          'updated_at', wpp.updated_at
        )
      ELSE NULL END
      FROM weekly_progress_posts wpp
      WHERE wpp.user_id = v_user_id AND wpp.week_start = p_last_week_start::date
      ORDER BY wpp.is_completed DESC, wpp.updated_at DESC
      LIMIT 1
    ),
    'last_week_planning', (
      SELECT CASE WHEN wps.id IS NOT NULL THEN
        jsonb_build_object(
          'id', wps.id,
          'user_id', wps.user_id,
          'week_start', wps.week_start,
          'week_intention', wps.week_intention,
          'is_completed', wps.is_completed,
          'completed_at', wps.completed_at,
          'created_at', wps.created_at,
          'updated_at', wps.updated_at
        )
      ELSE NULL END
      FROM weekly_planning_sessions wps
      WHERE wps.user_id = v_user_id AND wps.week_start = p_last_week_start::date
      ORDER BY wps.is_completed DESC, wps.updated_at DESC
      LIMIT 1
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;