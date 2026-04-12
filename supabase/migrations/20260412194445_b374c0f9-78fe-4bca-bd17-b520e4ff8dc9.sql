
-- Create training_plan_workouts table
CREATE TABLE public.training_plan_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  workout_type text NOT NULL DEFAULT 'Run',
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  target_distance_meters real,
  target_duration_seconds integer,
  target_pace_per_km real,
  notes text DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  matched_strava_activity_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for weekly lookups
CREATE INDEX idx_training_plan_workouts_user_week ON public.training_plan_workouts(user_id, week_start);

-- Enable RLS
ALTER TABLE public.training_plan_workouts ENABLE ROW LEVEL SECURITY;

-- Owner-only CRUD policies
CREATE POLICY "Users can view their own training plan workouts"
  ON public.training_plan_workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own training plan workouts"
  ON public.training_plan_workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training plan workouts"
  ON public.training_plan_workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training plan workouts"
  ON public.training_plan_workouts FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_training_plan_workouts_updated_at
  BEFORE UPDATE ON public.training_plan_workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enrich synced_activities with additional Strava data
ALTER TABLE public.synced_activities
  ADD COLUMN IF NOT EXISTS average_speed real,
  ADD COLUMN IF NOT EXISTS max_speed real,
  ADD COLUMN IF NOT EXISTS average_heartrate real,
  ADD COLUMN IF NOT EXISTS max_heartrate real,
  ADD COLUMN IF NOT EXISTS total_elevation_gain real,
  ADD COLUMN IF NOT EXISTS calories integer,
  ADD COLUMN IF NOT EXISTS suffer_score integer,
  ADD COLUMN IF NOT EXISTS average_cadence real,
  ADD COLUMN IF NOT EXISTS elapsed_time_seconds integer,
  ADD COLUMN IF NOT EXISTS sport_type text,
  ADD COLUMN IF NOT EXISTS strava_description text,
  ADD COLUMN IF NOT EXISTS workout_type_id integer;
