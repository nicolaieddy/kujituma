
CREATE TABLE public.sync_run_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('garmin','strava','fit_upload','sleep_csv')),
  trigger TEXT NOT NULL DEFAULT 'manual' CHECK (trigger IN ('manual','scheduled','upload','webhook')),
  status TEXT NOT NULL CHECK (status IN ('success','partial','failed','rate_limited','running')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  counters JSONB NOT NULL DEFAULT '{}'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sync_run_logs_user_provider_idx
  ON public.sync_run_logs (user_id, provider, started_at DESC);

GRANT SELECT ON public.sync_run_logs TO authenticated;
GRANT ALL ON public.sync_run_logs TO service_role;

ALTER TABLE public.sync_run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own sync logs"
  ON public.sync_run_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.purge_old_sync_run_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.sync_run_logs WHERE started_at < now() - INTERVAL '30 days';
$$;

REVOKE EXECUTE ON FUNCTION public.purge_old_sync_run_logs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_old_sync_run_logs() TO service_role;
