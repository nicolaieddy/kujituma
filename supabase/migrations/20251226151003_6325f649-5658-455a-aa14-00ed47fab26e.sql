-- Add pause functionality to goals table
ALTER TABLE public.goals 
ADD COLUMN is_paused boolean NOT NULL DEFAULT false,
ADD COLUMN paused_at timestamp with time zone;

-- Create index for efficiently querying non-paused recurring goals
CREATE INDEX idx_goals_recurring_not_paused ON public.goals (user_id, is_recurring, is_paused) 
WHERE is_recurring = true AND is_paused = false;