-- Goal Follows: Track users following specific goals
CREATE TABLE public.goal_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_user_id, goal_id)
);

-- Goal Updates: The new goal-centric posts
CREATE TABLE public.goal_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL CHECK (update_type IN ('weekly_progress', 'milestone', 'reflection', 'ask_for_help', 'started', 'completed')),
  content TEXT,
  objectives_snapshot JSONB DEFAULT '[]'::jsonb,
  milestone_type TEXT CHECK (milestone_type IN ('started', '25_percent', '50_percent', '75_percent', 'completed', NULL)),
  week_start DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Goal Update Cheers: Encouragement with optional message
CREATE TABLE public.goal_update_cheers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  update_id UUID NOT NULL REFERENCES public.goal_updates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cheer_type TEXT NOT NULL DEFAULT 'encourage' CHECK (cheer_type IN ('celebrate', 'encourage', 'offer_help')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(update_id, user_id)
);

-- Goal Update Comments
CREATE TABLE public.goal_update_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  update_id UUID NOT NULL REFERENCES public.goal_updates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_goal_follows_follower ON public.goal_follows(follower_user_id);
CREATE INDEX idx_goal_follows_goal ON public.goal_follows(goal_id);
CREATE INDEX idx_goal_updates_goal ON public.goal_updates(goal_id);
CREATE INDEX idx_goal_updates_user ON public.goal_updates(user_id);
CREATE INDEX idx_goal_updates_created ON public.goal_updates(created_at DESC);
CREATE INDEX idx_goal_update_cheers_update ON public.goal_update_cheers(update_id);
CREATE INDEX idx_goal_update_comments_update ON public.goal_update_comments(update_id);

-- Enable RLS
ALTER TABLE public.goal_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_update_cheers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_update_comments ENABLE ROW LEVEL SECURITY;

-- Goal Follows RLS
CREATE POLICY "Users can view follows on visible goals"
ON public.goal_follows FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = goal_id
    AND (
      g.visibility = 'public'
      OR g.user_id = auth.uid()
      OR (g.visibility = 'friends' AND are_friends(g.user_id, auth.uid()))
    )
  )
);

CREATE POLICY "Users can follow visible goals"
ON public.goal_follows FOR INSERT
WITH CHECK (
  follower_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = goal_id
    AND g.user_id != auth.uid()
    AND (
      g.visibility = 'public'
      OR (g.visibility = 'friends' AND are_friends(g.user_id, auth.uid()))
    )
  )
);

CREATE POLICY "Users can unfollow goals"
ON public.goal_follows FOR DELETE
USING (follower_user_id = auth.uid());

-- Goal Updates RLS
CREATE POLICY "Users can view updates on visible goals"
ON public.goal_updates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = goal_id
    AND (
      g.visibility = 'public'
      OR g.user_id = auth.uid()
      OR (g.visibility = 'friends' AND are_friends(g.user_id, auth.uid()))
    )
  )
);

CREATE POLICY "Users can create updates on their goals"
ON public.goal_updates FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own updates"
ON public.goal_updates FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own updates"
ON public.goal_updates FOR DELETE
USING (user_id = auth.uid());

-- Goal Update Cheers RLS
CREATE POLICY "Users can view cheers on visible updates"
ON public.goal_update_cheers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.goal_updates gu
    JOIN public.goals g ON g.id = gu.goal_id
    WHERE gu.id = update_id
    AND (
      g.visibility = 'public'
      OR g.user_id = auth.uid()
      OR (g.visibility = 'friends' AND are_friends(g.user_id, auth.uid()))
    )
  )
);

CREATE POLICY "Users can cheer on visible updates"
ON public.goal_update_cheers FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.goal_updates gu
    JOIN public.goals g ON g.id = gu.goal_id
    WHERE gu.id = update_id
    AND (
      g.visibility = 'public'
      OR (g.visibility = 'friends' AND are_friends(g.user_id, auth.uid()))
    )
  )
);

CREATE POLICY "Users can remove their cheers"
ON public.goal_update_cheers FOR DELETE
USING (user_id = auth.uid());

-- Goal Update Comments RLS
CREATE POLICY "Users can view comments on visible updates"
ON public.goal_update_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.goal_updates gu
    JOIN public.goals g ON g.id = gu.goal_id
    WHERE gu.id = update_id
    AND (
      g.visibility = 'public'
      OR g.user_id = auth.uid()
      OR (g.visibility = 'friends' AND are_friends(g.user_id, auth.uid()))
    )
  )
);

CREATE POLICY "Users can comment on visible updates"
ON public.goal_update_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.goal_updates gu
    JOIN public.goals g ON g.id = gu.goal_id
    WHERE gu.id = update_id
    AND (
      g.visibility = 'public'
      OR (g.visibility = 'friends' AND are_friends(g.user_id, auth.uid()))
    )
  )
);

CREATE POLICY "Users can delete their own comments"
ON public.goal_update_comments FOR DELETE
USING (user_id = auth.uid());