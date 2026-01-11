-- Create carry-over activity log table
CREATE TABLE public.carry_over_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL,
  objective_text TEXT NOT NULL,
  source_week_start DATE NOT NULL,
  target_week_start DATE NOT NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  goal_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carry_over_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own logs
CREATE POLICY "Users can view their own carry-over logs"
ON public.carry_over_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own logs
CREATE POLICY "Users can insert their own carry-over logs"
ON public.carry_over_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_carry_over_logs_user_created ON public.carry_over_logs(user_id, created_at DESC);