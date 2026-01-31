-- Performance optimization: Create combined RPC functions to reduce database round-trips

-- Index for faster goals lookup by user and status
CREATE INDEX IF NOT EXISTS idx_goals_user_status 
ON goals(user_id, status) 
WHERE status != 'deleted';

-- Index for faster weekly_objectives lookup
CREATE INDEX IF NOT EXISTS idx_weekly_objectives_user_week 
ON weekly_objectives(user_id, week_start);

-- Index for faster weekly_progress_posts lookup
CREATE INDEX IF NOT EXISTS idx_weekly_progress_posts_user_week 
ON weekly_progress_posts(user_id, week_start);

-- Combined RPC: Get all weekly dashboard data in a single call
CREATE OR REPLACE FUNCTION get_weekly_dashboard_data(
  p_week_start TEXT,
  p_last_week_start TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
          'scheduled_date', wo.scheduled_date,
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
          'scheduled_date', wo.scheduled_date,
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
      LIMIT 1
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Combined RPC: Get habit stats data in a single call
CREATE OR REPLACE FUNCTION get_habit_stats_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jsonb_build_object(
    'goals_with_habits', (
      SELECT COALESCE(jsonb_agg(g.*), '[]'::jsonb)
      FROM goals g 
      WHERE g.user_id = v_user_id 
        AND g.status != 'deleted' 
        AND g.habit_items IS NOT NULL 
        AND jsonb_array_length(g.habit_items) > 0
    ),
    'habit_objectives', (
      SELECT COALESCE(jsonb_agg(wo.*), '[]'::jsonb)
      FROM weekly_objectives wo
      WHERE wo.user_id = v_user_id
        AND wo.goal_id IN (
          SELECT id FROM goals 
          WHERE user_id = v_user_id 
            AND status != 'deleted'
            AND habit_items IS NOT NULL
            AND jsonb_array_length(habit_items) > 0
        )
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Combined RPC: Get incomplete objectives for carry-over in a single call
CREATE OR REPLACE FUNCTION get_carryover_data(p_current_week_start TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jsonb_build_object(
    'incomplete_objectives', (
      SELECT COALESCE(jsonb_agg(wo.*), '[]'::jsonb)
      FROM weekly_objectives wo
      WHERE wo.user_id = v_user_id
        AND wo.is_completed = false
        AND wo.week_start < p_current_week_start::date
    ),
    'current_future_objectives', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('text', wo.text, 'goal_id', wo.goal_id)), '[]'::jsonb)
      FROM weekly_objectives wo
      WHERE wo.user_id = v_user_id
        AND wo.week_start >= p_current_week_start::date
    ),
    'dismissed_objectives', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('objective_text', d.objective_text, 'goal_id', d.goal_id)), '[]'::jsonb)
      FROM dismissed_carryover_objectives d
      WHERE d.user_id = v_user_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$;