-- Create a function to delete all weekly objectives for a user and week
CREATE OR REPLACE FUNCTION public.delete_all_weekly_objectives(
  _user_id uuid,
  _week_start date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Verify the user is authenticated and can only delete their own objectives
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only delete your own objectives';
  END IF;
  
  -- Delete all objectives for the user and week, return count
  DELETE FROM public.weekly_objectives 
  WHERE user_id = _user_id 
    AND week_start = _week_start;
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;