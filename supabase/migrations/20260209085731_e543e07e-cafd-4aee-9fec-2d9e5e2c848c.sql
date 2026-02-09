-- Fix carry-over bug: Exclude objectives that have been completed in ANY week
-- The issue: completing "Deal with incident CM" in week X still shows it as incomplete from weeks before X
-- Solution: Check if the same objective (text + goal_id) has been completed anywhere

CREATE OR REPLACE FUNCTION public.get_carryover_data(p_current_week_start text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  v_user_id UUID := auth.uid();
  v_null_uuid UUID := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jsonb_build_object(
    'incomplete_objectives', (
      -- Deduplicate by text+goal_id, keep most recent week, count occurrences
      -- EXCLUDE any objective signature that has been completed in ANY week
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', agg.id,
          'user_id', agg.user_id,
          'goal_id', agg.goal_id,
          'text', agg.text,
          'is_completed', agg.is_completed,
          'week_start', agg.most_recent_week,
          'created_at', agg.created_at,
          'updated_at', agg.updated_at,
          'carry_over_count', agg.carry_over_count,
          'oldest_week', agg.oldest_week
        ) ORDER BY agg.most_recent_week DESC
      ), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (wo.text, COALESCE(wo.goal_id, v_null_uuid))
          wo.id,
          wo.user_id,
          wo.goal_id,
          wo.text,
          wo.is_completed,
          wo.created_at,
          wo.updated_at,
          -- Get most recent week for this objective signature
          (SELECT MAX(inner_wo.week_start) 
           FROM weekly_objectives inner_wo 
           WHERE inner_wo.user_id = v_user_id 
             AND inner_wo.is_completed = false
             AND inner_wo.week_start < p_current_week_start::date
             AND inner_wo.text = wo.text 
             AND COALESCE(inner_wo.goal_id, v_null_uuid) = COALESCE(wo.goal_id, v_null_uuid)
          ) as most_recent_week,
          -- Get oldest week for this objective signature
          (SELECT MIN(inner_wo.week_start) 
           FROM weekly_objectives inner_wo 
           WHERE inner_wo.user_id = v_user_id 
             AND inner_wo.is_completed = false
             AND inner_wo.week_start < p_current_week_start::date
             AND inner_wo.text = wo.text 
             AND COALESCE(inner_wo.goal_id, v_null_uuid) = COALESCE(wo.goal_id, v_null_uuid)
          ) as oldest_week,
          -- Count how many times this objective appears
          (SELECT COUNT(*) 
           FROM weekly_objectives inner_wo 
           WHERE inner_wo.user_id = v_user_id 
             AND inner_wo.is_completed = false
             AND inner_wo.week_start < p_current_week_start::date
             AND inner_wo.text = wo.text 
             AND COALESCE(inner_wo.goal_id, v_null_uuid) = COALESCE(wo.goal_id, v_null_uuid)
          ) as carry_over_count
        FROM weekly_objectives wo
        WHERE wo.user_id = v_user_id
          AND wo.is_completed = false
          AND wo.week_start < p_current_week_start::date
          -- KEY FIX: Exclude objectives that have been completed in ANY week
          AND NOT EXISTS (
            SELECT 1 FROM weekly_objectives completed_wo
            WHERE completed_wo.user_id = v_user_id
              AND completed_wo.is_completed = true
              AND completed_wo.text = wo.text
              AND COALESCE(completed_wo.goal_id, v_null_uuid) = COALESCE(wo.goal_id, v_null_uuid)
          )
          -- Also exclude already carried over to current/future weeks
          AND NOT EXISTS (
            SELECT 1 FROM weekly_objectives future_wo
            WHERE future_wo.user_id = v_user_id
              AND future_wo.week_start >= p_current_week_start::date
              AND future_wo.text = wo.text
              AND COALESCE(future_wo.goal_id, v_null_uuid) = COALESCE(wo.goal_id, v_null_uuid)
          )
          -- Also exclude dismissed objectives
          AND NOT EXISTS (
            SELECT 1 FROM dismissed_carryover_objectives d
            WHERE d.user_id = v_user_id
              AND d.objective_text = wo.text
              AND COALESCE(d.goal_id, v_null_uuid) = COALESCE(wo.goal_id, v_null_uuid)
          )
        ORDER BY wo.text, COALESCE(wo.goal_id, v_null_uuid), wo.week_start DESC
      ) agg
    ),
    'current_future_objectives', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'text', wo.text,
          'goal_id', wo.goal_id
        )
      ), '[]'::jsonb)
      FROM weekly_objectives wo
      WHERE wo.user_id = v_user_id
        AND wo.week_start >= p_current_week_start::date
    ),
    'dismissed_objectives', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'objective_text', d.objective_text,
          'goal_id', d.goal_id,
          'dismissed_at', d.dismissed_at
        )
      ), '[]'::jsonb)
      FROM dismissed_carryover_objectives d
      WHERE d.user_id = v_user_id
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;