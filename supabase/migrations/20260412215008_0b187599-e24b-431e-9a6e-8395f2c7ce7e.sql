-- Enrich synced_activities with fields from the .FIT build brief
ALTER TABLE public.synced_activities
  ADD COLUMN IF NOT EXISTS device_manufacturer text,
  ADD COLUMN IF NOT EXISTS device_product text,
  ADD COLUMN IF NOT EXISTS sub_sport text,
  ADD COLUMN IF NOT EXISTS max_power integer,
  ADD COLUMN IF NOT EXISTS ftp integer,
  ADD COLUMN IF NOT EXISTS total_ascent integer,
  ADD COLUMN IF NOT EXISTS total_descent integer,
  ADD COLUMN IF NOT EXISTS avg_vertical_oscillation real,
  ADD COLUMN IF NOT EXISTS avg_stance_time real,
  ADD COLUMN IF NOT EXISTS avg_vertical_ratio real,
  ADD COLUMN IF NOT EXISTS avg_step_length real,
  ADD COLUMN IF NOT EXISTS total_strides integer,
  ADD COLUMN IF NOT EXISTS avg_temperature integer,
  ADD COLUMN IF NOT EXISTS num_laps integer,
  ADD COLUMN IF NOT EXISTS bbox_north real,
  ADD COLUMN IF NOT EXISTS bbox_south real,
  ADD COLUMN IF NOT EXISTS bbox_east real,
  ADD COLUMN IF NOT EXISTS bbox_west real,
  ADD COLUMN IF NOT EXISTS records_json jsonb;

-- Add index for efficient dashboard queries
CREATE INDEX IF NOT EXISTS idx_synced_activities_user_start
  ON public.synced_activities (user_id, start_date DESC);

-- Enrich activity_laps with missing fields
ALTER TABLE public.activity_laps
  ADD COLUMN IF NOT EXISTS total_elapsed_time real,
  ADD COLUMN IF NOT EXISTS total_timer_time real,
  ADD COLUMN IF NOT EXISTS min_altitude real,
  ADD COLUMN IF NOT EXISTS max_altitude real,
  ADD COLUMN IF NOT EXISTS start_lat real,
  ADD COLUMN IF NOT EXISTS start_lng real,
  ADD COLUMN IF NOT EXISTS end_lat real,
  ADD COLUMN IF NOT EXISTS end_lng real,
  ADD COLUMN IF NOT EXISTS total_strides integer,
  ADD COLUMN IF NOT EXISTS normalized_power real;