-- Add time-blocking fields to weekly_objectives for Implementation Intentions
ALTER TABLE public.weekly_objectives
ADD COLUMN IF NOT EXISTS scheduled_day text,
ADD COLUMN IF NOT EXISTS scheduled_time time;

-- Create daily_check_ins table for quick daily progress tracking
CREATE TABLE public.daily_check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  focus_today TEXT,
  quick_win TEXT,
  blocker TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, check_in_date)
);

-- Enable RLS on daily_check_ins
ALTER TABLE public.daily_check_ins ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_check_ins
CREATE POLICY "Users can view their own check-ins"
ON public.daily_check_ins
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own check-ins"
ON public.daily_check_ins
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own check-ins"
ON public.daily_check_ins
FOR UPDATE
USING (auth.uid() = user_id);

-- Create user_streaks table for tracking consistency
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  current_daily_streak INTEGER NOT NULL DEFAULT 0,
  longest_daily_streak INTEGER NOT NULL DEFAULT 0,
  current_weekly_streak INTEGER NOT NULL DEFAULT 0,
  longest_weekly_streak INTEGER NOT NULL DEFAULT 0,
  last_check_in_date DATE,
  last_week_completed DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_streaks
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_streaks
CREATE POLICY "Users can view their own streaks"
ON public.user_streaks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own streaks"
ON public.user_streaks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
ON public.user_streaks
FOR UPDATE
USING (auth.uid() = user_id);

-- Create quarterly_reviews table
CREATE TABLE public.quarterly_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  quarter_start DATE NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  wins TEXT,
  challenges TEXT,
  lessons_learned TEXT,
  next_quarter_focus TEXT,
  goals_review JSONB,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, quarter)
);

-- Enable RLS on quarterly_reviews
ALTER TABLE public.quarterly_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for quarterly_reviews
CREATE POLICY "Users can view their own quarterly reviews"
ON public.quarterly_reviews
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quarterly reviews"
ON public.quarterly_reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quarterly reviews"
ON public.quarterly_reviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Create weekly_planning_sessions table
CREATE TABLE public.weekly_planning_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  week_start DATE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_week_reflection TEXT,
  week_intention TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable RLS on weekly_planning_sessions
ALTER TABLE public.weekly_planning_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly_planning_sessions
CREATE POLICY "Users can view their own planning sessions"
ON public.weekly_planning_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own planning sessions"
ON public.weekly_planning_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planning sessions"
ON public.weekly_planning_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_daily_check_ins_updated_at
BEFORE UPDATE ON public.daily_check_ins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_streaks_updated_at
BEFORE UPDATE ON public.user_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quarterly_reviews_updated_at
BEFORE UPDATE ON public.quarterly_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_planning_sessions_updated_at
BEFORE UPDATE ON public.weekly_planning_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();