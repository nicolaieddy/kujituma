CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with this name
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'garmin-sync-every-2h';

SELECT cron.schedule(
  'garmin-sync-every-2h',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yyidkpmrqvgvzbjvtnjy.supabase.co/functions/v1/garmin-sync',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aWRrcG1ycXZndnpianZ0bmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzAyNzUsImV4cCI6MjA2NjYwNjI3NX0.y3aZEjl9q6fER8lmRsL4bKWM3bBH0mxYTKHlmSqcU5g"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);