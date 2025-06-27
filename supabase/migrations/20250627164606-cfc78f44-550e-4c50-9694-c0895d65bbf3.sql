
-- Create goals table with all necessary fields
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  timeframe TEXT NOT NULL CHECK (timeframe IN ('1 Month', '3 Months', 'Quarter', '6 Months', 'End of Year', 'Custom Date')),
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'coming_up' CHECK (status IN ('coming_up', 'in_progress', 'completed', 'deleted')),
  category TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  order_index INTEGER DEFAULT 0
);

-- Create goal status history table to track changes
CREATE TABLE public.goal_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- Enable RLS on goals table
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for goals
CREATE POLICY "Users can view their own goals" 
  ON public.goals 
  FOR SELECT 
  USING (user_id = (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create their own goals" 
  ON public.goals 
  FOR INSERT 
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own goals" 
  ON public.goals 
  FOR UPDATE 
  USING (user_id = (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their own goals" 
  ON public.goals 
  FOR DELETE 
  USING (user_id = (SELECT id FROM profiles WHERE id = auth.uid()));

-- Enable RLS on goal_status_history table
ALTER TABLE public.goal_status_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for goal status history
CREATE POLICY "Users can view their own goal history" 
  ON public.goal_status_history 
  FOR SELECT 
  USING (user_id = (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create their own goal history" 
  ON public.goal_status_history 
  FOR INSERT 
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE id = auth.uid()));

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER goals_updated_at_trigger
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION update_goals_updated_at();

-- Create function to track status changes
CREATE OR REPLACE FUNCTION track_goal_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.goal_status_history (goal_id, old_status, new_status, user_id)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.user_id);
    
    -- Set completed_at timestamp when status changes to completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      NEW.completed_at = now();
    ELSIF NEW.status != 'completed' THEN
      NEW.completed_at = NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to track status changes
CREATE TRIGGER track_goal_status_change_trigger
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION track_goal_status_change();
