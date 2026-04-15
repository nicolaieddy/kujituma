-- Junction table for multi-session workout-activity linking
CREATE TABLE public.training_workout_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.training_plan_workouts(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.synced_activities(id) ON DELETE CASCADE,
  session_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workout_id, activity_id)
);

-- Index for fast lookups
CREATE INDEX idx_twa_workout_id ON public.training_workout_activities(workout_id);
CREATE INDEX idx_twa_activity_id ON public.training_workout_activities(activity_id);

-- Enable RLS
ALTER TABLE public.training_workout_activities ENABLE ROW LEVEL SECURITY;

-- Users can view links for their own workouts
CREATE POLICY "Users can view their own workout activity links"
ON public.training_workout_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.training_plan_workouts w
    WHERE w.id = workout_id AND w.user_id = auth.uid()
  )
);

-- Users can insert links for their own workouts
CREATE POLICY "Users can insert their own workout activity links"
ON public.training_workout_activities
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.training_plan_workouts w
    WHERE w.id = workout_id AND w.user_id = auth.uid()
  )
);

-- Users can delete links for their own workouts
CREATE POLICY "Users can delete their own workout activity links"
ON public.training_workout_activities
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.training_plan_workouts w
    WHERE w.id = workout_id AND w.user_id = auth.uid()
  )
);

-- Backfill existing matched_activity_id data
INSERT INTO public.training_workout_activities (workout_id, activity_id, session_order)
SELECT id, matched_activity_id, 0
FROM public.training_plan_workouts
WHERE matched_activity_id IS NOT NULL
ON CONFLICT DO NOTHING;