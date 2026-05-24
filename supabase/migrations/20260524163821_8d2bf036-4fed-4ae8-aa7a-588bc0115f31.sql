
-- Garmin connections (one per user, encrypted-at-rest by Supabase)
CREATE TABLE public.garmin_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  garmin_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,
  scopes TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_garmin_connections_garmin_user_id ON public.garmin_connections(garmin_user_id);

ALTER TABLE public.garmin_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own garmin connection"
  ON public.garmin_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own garmin connection"
  ON public.garmin_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own garmin connection"
  ON public.garmin_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own garmin connection"
  ON public.garmin_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_garmin_connections_updated_at
  BEFORE UPDATE ON public.garmin_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Webhook event audit log (server-only, no client access)
CREATE TABLE public.garmin_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  garmin_user_id TEXT,
  user_id UUID,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature_valid BOOLEAN,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_garmin_webhook_events_user_id ON public.garmin_webhook_events(user_id, created_at DESC);
CREATE INDEX idx_garmin_webhook_events_unprocessed ON public.garmin_webhook_events(created_at) WHERE processed_at IS NULL;

ALTER TABLE public.garmin_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (edge functions) may read/write.

-- Pending OAuth states (PKCE verifier storage, short-lived)
CREATE TABLE public.garmin_oauth_states (
  state TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL,
  code_verifier TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);
ALTER TABLE public.garmin_oauth_states ENABLE ROW LEVEL SECURITY;
-- No client policies: edge functions only.

-- Extend synced_activities for Garmin Health API ingestion
ALTER TABLE public.synced_activities
  ADD COLUMN garmin_activity_id TEXT,
  ADD COLUMN garmin_summary_id TEXT;
CREATE UNIQUE INDEX idx_synced_activities_user_garmin_activity
  ON public.synced_activities(user_id, garmin_activity_id)
  WHERE garmin_activity_id IS NOT NULL;

-- Extend sleep_entries for Garmin Health API ingestion
ALTER TABLE public.sleep_entries
  ADD COLUMN garmin_summary_id TEXT;
CREATE UNIQUE INDEX idx_sleep_entries_user_garmin_summary
  ON public.sleep_entries(user_id, garmin_summary_id)
  WHERE garmin_summary_id IS NOT NULL;
