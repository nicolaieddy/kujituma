CREATE TABLE public.social_daily_account_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform public.social_platform NOT NULL,
  date date NOT NULL,
  impressions integer,
  engagements integer,
  members_reached integer,
  new_followers integer,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_daily_account_metrics TO authenticated;
GRANT ALL ON public.social_daily_account_metrics TO service_role;
CREATE INDEX idx_social_daily_account_metrics_user_platform_date
  ON public.social_daily_account_metrics(user_id, platform, date);
ALTER TABLE public.social_daily_account_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily account metrics"
  ON public.social_daily_account_metrics FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_social_daily_account_metrics_updated_at
  BEFORE UPDATE ON public.social_daily_account_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();