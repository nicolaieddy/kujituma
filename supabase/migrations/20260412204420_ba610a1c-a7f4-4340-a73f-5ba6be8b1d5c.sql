
-- Junction table for many-to-many workout ↔ goal relationship
CREATE TABLE public.training_workout_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.training_plan_workouts(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workout_id, goal_id)
);

-- Index for fast lookups by goal
CREATE INDEX idx_training_workout_goals_goal ON public.training_workout_goals(goal_id);
CREATE INDEX idx_training_workout_goals_workout ON public.training_workout_goals(workout_id);

-- Enable RLS
ALTER TABLE public.training_workout_goals ENABLE ROW LEVEL SECURITY;

-- Users can view links for their own workouts
CREATE POLICY "Users can view their workout-goal links"
  ON public.training_workout_goals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.training_plan_workouts w
    WHERE w.id = training_workout_goals.workout_id AND w.user_id = auth.uid()
  ));

-- Users can create links for their own workouts
CREATE POLICY "Users can create workout-goal links"
  ON public.training_workout_goals FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.training_plan_workouts w
    WHERE w.id = training_workout_goals.workout_id AND w.user_id = auth.uid()
  ));

-- Users can delete links for their own workouts
CREATE POLICY "Users can delete workout-goal links"
  ON public.training_workout_goals FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.training_plan_workouts w
    WHERE w.id = training_workout_goals.workout_id AND w.user_id = auth.uid()
  ));

-- Migrate existing goal_id data into the junction table
INSERT INTO public.training_workout_goals (workout_id, goal_id)
SELECT id, goal_id FROM public.training_plan_workouts
WHERE goal_id IS NOT NULL
ON CONFLICT DO NOTHING;
