-- Add last_synced_at column to track when activities were last synced
ALTER TABLE public.strava_connections 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;