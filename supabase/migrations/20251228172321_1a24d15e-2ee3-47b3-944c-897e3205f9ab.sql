-- First, drop the existing SELECT policies that depend on is_public
DROP POLICY IF EXISTS "Public goals are viewable by everyone" ON public.goals;
DROP POLICY IF EXISTS "Partners can view public goals" ON public.goals;

-- Add visibility column to goals table
ALTER TABLE public.goals ADD COLUMN visibility text NOT NULL DEFAULT 'public';

-- Migrate existing data from is_public boolean to visibility text
UPDATE public.goals SET visibility = CASE WHEN is_public = true THEN 'public' ELSE 'private' END;

-- Now drop the old is_public column
ALTER TABLE public.goals DROP COLUMN is_public;

-- Add a check constraint to ensure valid visibility values
ALTER TABLE public.goals ADD CONSTRAINT goals_visibility_check CHECK (visibility IN ('public', 'friends', 'private'));

-- Create new RLS policies for visibility levels

-- Public goals are viewable by everyone
CREATE POLICY "Public goals are viewable by everyone"
ON public.goals
FOR SELECT
USING (visibility = 'public');

-- Friends can view goals with 'friends' or 'public' visibility
CREATE POLICY "Friends can view friends-visible goals"
ON public.goals
FOR SELECT
USING (
  visibility IN ('public', 'friends') 
  AND are_friends(auth.uid(), user_id)
);