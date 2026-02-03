-- Update get_partner_dashboard_data to return habit_stats in the format expected by PartnerHabitsCard

CREATE OR REPLACE FUNCTION get_partner_dashboard_data(
  p_partner_id uuid,
  p_week_start text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_partnership RECORD;
  v_is_user1 BOOLEAN;
  v_can_view BOOLEAN;
  v_my_cadence TEXT;
  v_result JSONB;
BEGIN
  -- Single query to get partnership and verify permissions
  SELECT * INTO v_partnership
  FROM accountability_partnerships
  WHERE status = 'active'
    AND ((user1_id = v_user_id AND user2_id = p_partner_id)
      OR (user1_id = p_partner_id AND user2_id = v_user_id));
  
  IF v_partnership IS NULL THEN
    RETURN jsonb_build_object('error', 'Partnership not found');
  END IF;
  
  -- Determine if current user is user1 or user2
  v_is_user1 := (v_partnership.user1_id = v_user_id);
  
  -- Check if current user can view partner's goals
  v_can_view := CASE WHEN v_is_user1 
    THEN v_partnership.user1_can_view_user2_goals 
    ELSE v_partnership.user2_can_view_user1_goals 
  END;
  
  -- Get current user's cadence
  v_my_cadence := CASE WHEN v_is_user1 
    THEN COALESCE(v_partnership.my_check_in_cadence_user1, 'weekly')
    ELSE COALESCE(v_partnership.my_check_in_cadence_user2, 'weekly')
  END;

  -- Build consolidated response
  SELECT jsonb_build_object(
    'can_view_partner_goals', v_can_view,
    'partner_can_view_my_goals', CASE WHEN v_is_user1 
      THEN v_partnership.user2_can_view_user1_goals 
      ELSE v_partnership.user1_can_view_user2_goals 
    END,
    'my_check_in_cadence', v_my_cadence,
    'profile', (
      SELECT jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'email', p.email,
        'about_me', p.about_me
      )
      FROM profiles p 
      WHERE p.id = p_partner_id
    ),
    'partnership', jsonb_build_object(
      'id', v_partnership.id,
      'user1_id', v_partnership.user1_id,
      'user2_id', v_partnership.user2_id,
      'last_check_in_at', v_partnership.last_check_in_at,
      'created_at', v_partnership.created_at
    ),
    'goals', CASE WHEN v_can_view THEN (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', g.id,
        'title', g.title,
        'description', g.description,
        'status', g.status,
        'timeframe', g.timeframe,
        'category', g.category,
        'created_at', g.created_at,
        'target_date', g.target_date,
        'is_recurring', g.is_recurring,
        'habit_items', g.habit_items
      ) ORDER BY g.created_at DESC), '[]'::jsonb)
      FROM goals g
      WHERE g.user_id = p_partner_id
        AND g.status IN ('active', 'in_progress')
    ) ELSE '[]'::jsonb END,
    'objectives', CASE WHEN v_can_view THEN (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', wo.id,
        'text', wo.text,
        'is_completed', wo.is_completed,
        'week_start', wo.week_start,
        'goal_id', wo.goal_id,
        'scheduled_day', wo.scheduled_day,
        'scheduled_time', wo.scheduled_time,
        'order_index', wo.order_index,
        'goal', CASE WHEN wo.goal_id IS NOT NULL THEN (
          SELECT jsonb_build_object('title', g2.title)
          FROM goals g2 WHERE g2.id = wo.goal_id
        ) ELSE NULL END
      ) ORDER BY wo.order_index), '[]'::jsonb)
      FROM weekly_objectives wo
      WHERE wo.user_id = p_partner_id
        AND wo.week_start = p_week_start::date
    ) ELSE '[]'::jsonb END,
    -- Return habit_stats in the full format expected by PartnerHabitsCard
    'habit_stats', CASE WHEN v_can_view THEN (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'goal', jsonb_build_object(
          'id', g.id,
          'title', g.title,
          'habit_items', g.habit_items
        ),
        'currentStreak', 0,
        'completionRate', 0,
        'totalWeeks', 0,
        'completedWeeks', 0,
        'weeklyHistory', '[]'::jsonb
      )), '[]'::jsonb)
      FROM goals g
      WHERE g.user_id = p_partner_id
        AND g.status IN ('active', 'in_progress')
        AND g.habit_items IS NOT NULL
        AND jsonb_array_length(g.habit_items) > 0
    ) ELSE '[]'::jsonb END
  ) INTO v_result;

  RETURN v_result;
END;
$$;