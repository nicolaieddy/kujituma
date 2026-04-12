
-- Storage bucket for .fit files
INSERT INTO storage.buckets (id, name, public)
VALUES ('fit-files', 'fit-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for fit-files bucket
CREATE POLICY "Users can upload their own fit files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fit-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own fit files"
ON storage.objects FOR SELECT
USING (bucket_id = 'fit-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own fit files"
ON storage.objects FOR DELETE
USING (bucket_id = 'fit-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enrich synced_activities with new columns
ALTER TABLE public.synced_activities
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'strava',
  ADD COLUMN IF NOT EXISTS average_power real,
  ADD COLUMN IF NOT EXISTS normalized_power real,
  ADD COLUMN IF NOT EXISTS tss real,
  ADD COLUMN IF NOT EXISTS training_effect real,
  ADD COLUMN IF NOT EXISTS max_cadence real,
  ADD COLUMN IF NOT EXISTS fit_file_path text;

-- Make strava_activity_id nullable for fit uploads
ALTER TABLE public.synced_activities
  ALTER COLUMN strava_activity_id DROP NOT NULL;

-- Activity laps table
CREATE TABLE public.activity_laps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.synced_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  lap_index integer NOT NULL,
  start_time timestamptz,
  duration_seconds real,
  distance_meters real,
  avg_heart_rate real,
  max_heart_rate real,
  avg_speed real,
  max_speed real,
  avg_cadence real,
  avg_power real,
  total_elevation_gain real,
  calories integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_laps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own laps"
ON public.activity_laps FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own laps"
ON public.activity_laps FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own laps"
ON public.activity_laps FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_activity_laps_activity_id ON public.activity_laps(activity_id);

-- Activity streams table (time-series data)
CREATE TABLE public.activity_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.synced_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  timestamp_offset_seconds real NOT NULL,
  heart_rate smallint,
  speed real,
  cadence smallint,
  power smallint,
  altitude real,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streams"
ON public.activity_streams FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streams"
ON public.activity_streams FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streams"
ON public.activity_streams FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_activity_streams_activity_id ON public.activity_streams(activity_id);
