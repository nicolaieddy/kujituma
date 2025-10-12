-- Fix parameter order bug in set_public_commitments function
CREATE OR REPLACE FUNCTION public.set_public_commitments(_week_start date, _objective_ids uuid[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  objective_id UUID;
  idx INTEGER;
BEGIN
  IF array_length(_objective_ids, 1) != 3 THEN
    RAISE EXCEPTION 'Must provide exactly 3 objectives';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM weekly_objectives
    WHERE id = ANY(_objective_ids)
    AND user_id != auth.uid()
  ) THEN
    RAISE EXCEPTION 'Can only commit to your own objectives';
  END IF;
  
  DELETE FROM public_commitments
  WHERE user_id = auth.uid() AND week_start = _week_start;
  
  FOR idx IN 1..3 LOOP
    INSERT INTO public_commitments (user_id, week_start, objective_id, rank)
    VALUES (auth.uid(), _week_start, _objective_ids[idx], idx);
  END LOOP;
  
  RETURN TRUE;
END;
$function$;