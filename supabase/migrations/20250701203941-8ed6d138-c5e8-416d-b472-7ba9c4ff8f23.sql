-- Update posts table to support weekly progress posts
ALTER TABLE public.posts 
ADD COLUMN week_start DATE,
ADD COLUMN week_end DATE,
ADD COLUMN objectives_completed INTEGER DEFAULT 0,
ADD COLUMN total_objectives INTEGER DEFAULT 0,
ADD COLUMN completion_percentage INTEGER DEFAULT 0;

-- Create index for better performance on week-based queries
CREATE INDEX idx_posts_week_start ON public.posts(week_start);
CREATE INDEX idx_posts_user_week ON public.posts(user_id, week_start);