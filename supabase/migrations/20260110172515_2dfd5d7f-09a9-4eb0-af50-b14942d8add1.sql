-- Create strava_connections table
-- Stores OAuth tokens for users who have connected their Strava account
CREATE TABLE public.strava_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  strava_athlete_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  athlete_firstname TEXT,
  athlete_lastname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own connection
CREATE POLICY "Users can view own Strava connection"
ON public.strava_connections FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own connection
CREATE POLICY "Users can create own Strava connection"
ON public.strava_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own connection
CREATE POLICY "Users can update own Strava connection"
ON public.strava_connections FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own connection
CREATE POLICY "Users can delete own Strava connection"
ON public.strava_connections FOR DELETE
USING (auth.uid() = user_id);

-- Create activity_mappings table
-- Maps Strava activity types to habit items
CREATE TABLE public.activity_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strava_activity_type TEXT NOT NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  habit_item_id TEXT NOT NULL,
  min_duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, strava_activity_type)
);

-- Enable RLS
ALTER TABLE public.activity_mappings ENABLE ROW LEVEL SECURITY;

-- Users can view their own mappings
CREATE POLICY "Users can view own activity mappings"
ON public.activity_mappings FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own mappings
CREATE POLICY "Users can create own activity mappings"
ON public.activity_mappings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own mappings
CREATE POLICY "Users can update own activity mappings"
ON public.activity_mappings FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own mappings
CREATE POLICY "Users can delete own activity mappings"
ON public.activity_mappings FOR DELETE
USING (auth.uid() = user_id);

-- Create synced_activities table
-- Tracks activities synced from Strava to prevent duplicates
CREATE TABLE public.synced_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  strava_activity_id BIGINT NOT NULL UNIQUE,
  activity_type TEXT,
  activity_name TEXT,
  start_date TIMESTAMPTZ,
  duration_seconds INTEGER,
  distance_meters REAL,
  matched_habit_item_id TEXT,
  matched_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  habit_completion_created BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.synced_activities ENABLE ROW LEVEL SECURITY;

-- Users can view their own synced activities
CREATE POLICY "Users can view own synced activities"
ON public.synced_activities FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own synced activities
CREATE POLICY "Users can create own synced activities"
ON public.synced_activities FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own synced activities
CREATE POLICY "Users can update own synced activities"
ON public.synced_activities FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_strava_connections_athlete_id ON public.strava_connections(strava_athlete_id);
CREATE INDEX idx_synced_activities_user_id ON public.synced_activities(user_id);
CREATE INDEX idx_synced_activities_strava_id ON public.synced_activities(strava_activity_id);
CREATE INDEX idx_activity_mappings_user_id ON public.activity_mappings(user_id);

-- Create updated_at trigger for strava_connections
CREATE TRIGGER update_strava_connections_updated_at
BEFORE UPDATE ON public.strava_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for activity_mappings
CREATE TRIGGER update_activity_mappings_updated_at
BEFORE UPDATE ON public.activity_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();