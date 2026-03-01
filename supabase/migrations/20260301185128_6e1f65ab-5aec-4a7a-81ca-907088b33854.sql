
CREATE OR REPLACE FUNCTION public.get_partner_weekly_completion_stats(
  p_partner_id uuid,
  p_weeks integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  v_user_id UUID := auth.uid();
  v_is_partner BOOLEAN;
  v_can_view BOOLEAN;
  v_current_week_start DATE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify partnership and visibility
  SELECT 
    TRUE,
    CASE 
      WHEN user1_id = v_user_id THEN user1_can_view_user2_goals
      ELSE user2_can_view_user1_goals
    END
  INTO v_is_partner, v_can_view
  FROM accountability_partnerships
  WHERE status = 'active'
    AND ((user1_id = v_user_id AND user2_id = p_partner_id)
         OR (user1_id = p_partner_id AND user2_id = v_user_id));

  IF NOT COALESCE(v_is_partner, FALSE) OR NOT COALESCE(v_can_view, FALSE) THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Get current Monday
  v_current_week_start := date_trunc('week', CURRENT_DATE)::date;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'week_start', ws.week_start::text,
      'total', COALESCE(stats.total, 0),
      'completed', COALESCE(stats.completed, 0)
    ) ORDER BY ws.week_start
  ), '[]'::jsonb)
  INTO result
  FROM generate_series(
    v_current_week_start - ((p_weeks - 1) * 7),
    v_current_week_start,
    '7 days'::interval
  ) AS ws(week_start)
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE is_completed)::integer AS completed
    FROM weekly_objectives
    WHERE user_id = p_partner_id
      AND week_start = ws.week_start::date
  ) stats ON TRUE;

  RETURN result;
END;
$function$;
