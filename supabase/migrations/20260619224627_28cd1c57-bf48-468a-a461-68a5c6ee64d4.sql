CREATE TABLE public.monthly_distance_aggregates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month DATE NOT NULL,
  sport TEXT NOT NULL DEFAULT 'Running',
  distance_km NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'garmin_csv',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month, sport, source)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_distance_aggregates TO authenticated;
GRANT ALL ON public.monthly_distance_aggregates TO service_role;

ALTER TABLE public.monthly_distance_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own monthly distance aggregates"
  ON public.monthly_distance_aggregates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_monthly_distance_aggregates_user_month
  ON public.monthly_distance_aggregates(user_id, month);

CREATE TRIGGER monthly_distance_aggregates_set_updated_at
  BEFORE UPDATE ON public.monthly_distance_aggregates
  FOR EACH ROW EXECUTE FUNCTION public.update_notification_preferences_updated_at();