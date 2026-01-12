-- Create table to track dismissed carryover objectives
CREATE TABLE public.dismissed_carryover_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  objective_text TEXT NOT NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, objective_text, goal_id)
);

-- Enable RLS
ALTER TABLE public.dismissed_carryover_objectives ENABLE ROW LEVEL SECURITY;

-- Users can only see their own dismissed objectives
CREATE POLICY "Users can view their own dismissed objectives"
ON public.dismissed_carryover_objectives
FOR SELECT
USING (auth.uid() = user_id);

-- Users can dismiss their own objectives
CREATE POLICY "Users can dismiss their own objectives"
ON public.dismissed_carryover_objectives
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can un-dismiss their own objectives
CREATE POLICY "Users can un-dismiss their own objectives"
ON public.dismissed_carryover_objectives
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_dismissed_carryover_user ON public.dismissed_carryover_objectives(user_id);
CREATE INDEX idx_dismissed_carryover_text_goal ON public.dismissed_carryover_objectives(user_id, objective_text, goal_id);