
-- Enrich activity_laps with all Garmin-style fields
ALTER TABLE public.activity_laps
  ADD COLUMN IF NOT EXISTS cumulative_time_seconds real,
  ADD COLUMN IF NOT EXISTS avg_gap real,
  ADD COLUMN IF NOT EXISTS total_ascent real,
  ADD COLUMN IF NOT EXISTS total_descent real,
  ADD COLUMN IF NOT EXISTS avg_watts_per_kg real,
  ADD COLUMN IF NOT EXISTS max_power real,
  ADD COLUMN IF NOT EXISTS max_watts_per_kg real,
  ADD COLUMN IF NOT EXISTS avg_run_cadence real,
  ADD COLUMN IF NOT EXISTS avg_ground_contact_time real,
  ADD COLUMN IF NOT EXISTS avg_gct_balance real,
  ADD COLUMN IF NOT EXISTS avg_stride_length real,
  ADD COLUMN IF NOT EXISTS avg_vertical_oscillation real,
  ADD COLUMN IF NOT EXISTS avg_vertical_ratio real,
  ADD COLUMN IF NOT EXISTS avg_temperature real,
  ADD COLUMN IF NOT EXISTS best_pace real,
  ADD COLUMN IF NOT EXISTS max_run_cadence real,
  ADD COLUMN IF NOT EXISTS moving_time_seconds real,
  ADD COLUMN IF NOT EXISTS avg_moving_pace real,
  ADD COLUMN IF NOT EXISTS avg_step_speed_loss real,
  ADD COLUMN IF NOT EXISTS avg_step_speed_loss_percent real;

-- Workout preferences table
CREATE TABLE public.workout_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  distance_unit text NOT NULL DEFAULT 'km',
  elevation_unit text NOT NULL DEFAULT 'm',
  pace_format text NOT NULL DEFAULT 'min_per_km',
  temperature_unit text NOT NULL DEFAULT 'celsius',
  weight_unit text NOT NULL DEFAULT 'kg',
  power_display text NOT NULL DEFAULT 'watts',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workout preferences"
ON public.workout_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout preferences"
ON public.workout_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout preferences"
ON public.workout_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_workout_preferences_updated_at
BEFORE UPDATE ON public.workout_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
