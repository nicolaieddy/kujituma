CREATE OR REPLACE FUNCTION public.reorder_goals(
  p_goal_orders jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Batch update using a single query
  UPDATE goals g
  SET order_index = (p_goal_orders->>g.id::text)::integer
  WHERE g.id IN (SELECT jsonb_object_keys(p_goal_orders)::uuid)
    AND g.user_id = v_user_id;
END;
$$;