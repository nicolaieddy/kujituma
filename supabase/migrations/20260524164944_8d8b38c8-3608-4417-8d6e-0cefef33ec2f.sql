-- Drop OAuth-specific tables
DROP TABLE IF EXISTS public.garmin_oauth_states;
DROP TABLE IF EXISTS public.garmin_webhook_events;

-- Drop OAuth columns and add credential bridge columns
ALTER TABLE public.garmin_connections
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token,
  DROP COLUMN IF EXISTS token_expires_at,
  DROP COLUMN IF EXISTS refresh_token_expires_at,
  DROP COLUMN IF EXISTS scopes,
  ALTER COLUMN garmin_user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS encrypted_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS encrypted_password TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS session_tokens JSONB,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_anchor TIMESTAMPTZ;

-- Remove defaults now that backfill is implicit
ALTER TABLE public.garmin_connections
  ALTER COLUMN encrypted_email DROP DEFAULT,
  ALTER COLUMN encrypted_password DROP DEFAULT;