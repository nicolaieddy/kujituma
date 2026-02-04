-- Create RPC to get objective counts for all goals belonging to the current user
CREATE OR REPLACE FUNCTION get_goals_objective_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_object_agg(
      goal_id::text,
      jsonb_build_object(
        'total', total_count,
        'completed', completed_count
      )
    ), '{}'::jsonb)
    FROM (
      SELECT 
        wo.goal_id,
        COUNT(*)::int AS total_count,
        COUNT(*) FILTER (WHERE wo.is_completed = true)::int AS completed_count
      FROM weekly_objectives wo
      WHERE wo.user_id = v_user_id
        AND wo.goal_id IS NOT NULL
      GROUP BY wo.goal_id
    ) counts
  );
END;
$$;