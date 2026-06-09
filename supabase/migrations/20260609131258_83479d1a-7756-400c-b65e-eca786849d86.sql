-- Garmin daily wellness summary
CREATE TABLE public.garmin_wellness_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wellness_date date NOT NULL,
  steps integer,
  active_calories integer,
  total_calories integer,
  floors_climbed integer,
  resting_heart_rate integer,
  min_heart_rate integer,
  max_heart_rate integer,
  hrv_weekly_avg integer,
  hrv_last_night_avg integer,
  hrv_status text,
  stress_avg integer,
  stress_max integer,
  body_battery_min integer,
  body_battery_max integer,
  body_battery_charged integer,
  body_battery_drained integer,
  respiration_avg numeric,
  spo2_avg integer,
  raw_row jsonb,
  source text NOT NULL DEFAULT 'garmin_api',
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, wellness_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.garmin_wellness_daily TO authenticated;
GRANT ALL ON public.garmin_wellness_daily TO service_role;

ALTER TABLE public.garmin_wellness_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_wellness_select" ON public.garmin_wellness_daily FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_wellness_insert" ON public.garmin_wellness_daily FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_wellness_update" ON public.garmin_wellness_daily FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_wellness_delete" ON public.garmin_wellness_daily FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER tr_garmin_wellness_daily_updated
  BEFORE UPDATE ON public.garmin_wellness_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Garmin body composition raw mirror
CREATE TABLE public.garmin_body_composition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_on date NOT NULL,
  measured_at timestamptz,
  weight_kg numeric,
  body_fat_pct numeric,
  body_water_pct numeric,
  bone_mass_kg numeric,
  muscle_mass_kg numeric,
  bmi numeric,
  visceral_fat numeric,
  metabolic_age integer,
  physique_rating text,
  source_device text,
  raw_row jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, measured_on)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.garmin_body_composition TO authenticated;
GRANT ALL ON public.garmin_body_composition TO service_role;

ALTER TABLE public.garmin_body_composition ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_body_select" ON public.garmin_body_composition FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_body_insert" ON public.garmin_body_composition FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_body_update" ON public.garmin_body_composition FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_body_delete" ON public.garmin_body_composition FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER tr_garmin_body_composition_updated
  BEFORE UPDATE ON public.garmin_body_composition
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- body_measurements: enable upsert for Garmin weight entries
ALTER TABLE public.body_measurements
  ADD CONSTRAINT body_measurements_user_date_source_unique UNIQUE (user_id, measured_on, source);

-- garmin_connections: flag for one-time historical backfill
ALTER TABLE public.garmin_connections
  ADD COLUMN IF NOT EXISTS backfill_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_activity_anchor timestamptz;

-- Reschedule cron from 2h to 6h
SELECT cron.unschedule('garmin-sync-every-2h');

SELECT cron.schedule(
  'garmin-sync-every-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yyidkpmrqvgvzbjvtnjy.supabase.co/functions/v1/garmin-sync',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aWRrcG1ycXZndnpianZ0bmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzAyNzUsImV4cCI6MjA2NjYwNjI3NX0.y3aZEjl9q6fER8lmRsL4bKWM3bBH0mxYTKHlmSqcU5g"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);