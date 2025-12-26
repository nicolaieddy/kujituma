-- Add habit_items JSON column to goals table for storing multiple habits per goal
-- Each habit item will have: id, text, frequency
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS habit_items JSONB DEFAULT '[]'::jsonb;

-- Create habit_completions table for tracking daily completion of individual habits
CREATE TABLE public.habit_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  habit_item_id TEXT NOT NULL, -- matches the id within the habit_items JSON array
  completion_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_habit_completion UNIQUE (user_id, goal_id, habit_item_id, completion_date)
);

-- Enable Row Level Security
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

-- Create policies for habit_completions
CREATE POLICY "Users can view their own habit completions" 
ON public.habit_completions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habit completions" 
ON public.habit_completions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit completions" 
ON public.habit_completions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for efficient querying
CREATE INDEX idx_habit_completions_user_goal_date ON public.habit_completions (user_id, goal_id, completion_date);
CREATE INDEX idx_habit_completions_week ON public.habit_completions (user_id, completion_date);