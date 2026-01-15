-- Add auto_sync_enabled column to strava_connections
ALTER TABLE public.strava_connections 
ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN NOT NULL DEFAULT false;