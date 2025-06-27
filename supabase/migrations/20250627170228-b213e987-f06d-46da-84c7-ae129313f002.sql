
-- Create weekly_objectives table
CREATE TABLE public.weekly_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  week_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_weekly_objectives_user_week ON public.weekly_objectives (user_id, week_start);
CREATE INDEX idx_weekly_objectives_goal ON public.weekly_objectives (goal_id);

-- Enable RLS
ALTER TABLE public.weekly_objectives ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own weekly objectives" 
  ON public.weekly_objectives 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weekly objectives" 
  ON public.weekly_objectives 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly objectives" 
  ON public.weekly_objectives 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly objectives" 
  ON public.weekly_objectives 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_weekly_objectives_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_weekly_objectives_updated_at
  BEFORE UPDATE ON public.weekly_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_weekly_objectives_updated_at();

-- Create weekly_progress_posts table
CREATE TABLE public.weekly_progress_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_weekly_progress_posts_user_week ON public.weekly_progress_posts (user_id, week_start);

-- Enable RLS
ALTER TABLE public.weekly_progress_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own weekly progress posts" 
  ON public.weekly_progress_posts 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weekly progress posts" 
  ON public.weekly_progress_posts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly progress posts" 
  ON public.weekly_progress_posts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly progress posts" 
  ON public.weekly_progress_posts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_weekly_progress_posts_updated_at
  BEFORE UPDATE ON public.weekly_progress_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_weekly_objectives_updated_at();
