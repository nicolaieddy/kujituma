-- Create sleep_entries table
CREATE TABLE public.sleep_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sleep_date date NOT NULL,
  score integer,
  quality text,
  duration_seconds integer,
  sleep_need_seconds integer,
  bedtime time,
  wake_time time,
  resting_heart_rate integer,
  body_battery integer,
  pulse_ox numeric,
  respiration numeric,
  skin_temp_change numeric,
  hrv_status text,
  sleep_alignment text,
  source text NOT NULL DEFAULT 'garmin_csv',
  raw_row jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sleep_date)
);

CREATE INDEX idx_sleep_entries_user_date ON public.sleep_entries (user_id, sleep_date DESC);

ALTER TABLE public.sleep_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sleep entries"
  ON public.sleep_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sleep entries"
  ON public.sleep_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sleep entries"
  ON public.sleep_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sleep entries"
  ON public.sleep_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_sleep_entries_updated_at
  BEFORE UPDATE ON public.sleep_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();