-- Add public field to goals table to allow hiding goals from public view
ALTER TABLE public.goals 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;

-- Create index for better performance when filtering public goals
CREATE INDEX idx_goals_is_public ON public.goals(is_public);