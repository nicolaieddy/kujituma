ALTER TABLE public.workout_preferences
  ADD COLUMN IF NOT EXISTS default_goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_link_activities boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_create_weekly_objective boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS weekly_objective_template text NOT NULL DEFAULT 'plan_and_volume';