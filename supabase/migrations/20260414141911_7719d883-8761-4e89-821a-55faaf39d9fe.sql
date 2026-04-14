
-- Add timezone column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text;

-- Add activity_date column to synced_activities
ALTER TABLE public.synced_activities ADD COLUMN IF NOT EXISTS activity_date date;

-- Backfill activity_date from start_date for existing rows (using UTC as default)
UPDATE public.synced_activities
SET activity_date = (start_date::timestamptz AT TIME ZONE 'UTC')::date
WHERE activity_date IS NULL AND start_date IS NOT NULL;
