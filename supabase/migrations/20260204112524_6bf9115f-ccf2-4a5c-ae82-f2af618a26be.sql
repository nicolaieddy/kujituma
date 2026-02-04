-- Create a function to auto-promote goals from 'not_started' to 'in_progress'
-- when objectives are created or completed for that goal
CREATE OR REPLACE FUNCTION public.auto_promote_goal_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only promote if the objective has a goal_id
  IF NEW.goal_id IS NOT NULL THEN
    -- Update the goal to 'in_progress' if it's currently 'not_started'
    UPDATE public.goals
    SET 
      status = 'in_progress',
      updated_at = now()
    WHERE id = NEW.goal_id
      AND status = 'not_started';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on weekly_objectives INSERT
DROP TRIGGER IF EXISTS trigger_auto_promote_goal_on_objective_insert ON public.weekly_objectives;
CREATE TRIGGER trigger_auto_promote_goal_on_objective_insert
  AFTER INSERT ON public.weekly_objectives
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_promote_goal_status();

-- Create trigger on weekly_objectives UPDATE (when marked complete)
DROP TRIGGER IF EXISTS trigger_auto_promote_goal_on_objective_update ON public.weekly_objectives;
CREATE TRIGGER trigger_auto_promote_goal_on_objective_update
  AFTER UPDATE OF is_completed ON public.weekly_objectives
  FOR EACH ROW
  WHEN (NEW.is_completed = true AND OLD.is_completed = false)
  EXECUTE FUNCTION public.auto_promote_goal_status();

-- Fix all existing goals: promote 'not_started' goals that have any objectives
UPDATE public.goals g
SET 
  status = 'in_progress',
  updated_at = now()
WHERE g.status = 'not_started'
  AND EXISTS (
    SELECT 1 FROM public.weekly_objectives wo
    WHERE wo.goal_id = g.id
  );