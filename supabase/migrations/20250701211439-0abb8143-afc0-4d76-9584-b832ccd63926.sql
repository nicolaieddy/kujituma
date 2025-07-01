-- Add a column to store incomplete objective reflections in weekly_progress_posts
ALTER TABLE public.weekly_progress_posts 
ADD COLUMN incomplete_reflections JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.weekly_progress_posts.incomplete_reflections IS 'Stores reflections on why objectives were not completed, keyed by objective_id';