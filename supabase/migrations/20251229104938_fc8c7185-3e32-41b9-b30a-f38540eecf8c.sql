-- Add quarterly streak columns to user_streaks table
ALTER TABLE public.user_streaks 
ADD COLUMN current_quarterly_streak integer NOT NULL DEFAULT 0,
ADD COLUMN longest_quarterly_streak integer NOT NULL DEFAULT 0,
ADD COLUMN last_quarter_completed text;