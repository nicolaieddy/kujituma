
-- Add is_completed field to weekly_progress_posts table
ALTER TABLE public.weekly_progress_posts 
ADD COLUMN is_completed BOOLEAN NOT NULL DEFAULT false;

-- Add completed_at timestamp to track when the week was completed
ALTER TABLE public.weekly_progress_posts 
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE NULL;
