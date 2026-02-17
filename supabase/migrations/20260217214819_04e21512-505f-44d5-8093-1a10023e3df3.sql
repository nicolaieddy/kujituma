
-- Create goal_comments table for partner encouragement on goals
CREATE TABLE public.goal_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.goal_comments ENABLE ROW LEVEL SECURITY;

-- Goal owner can see all comments on their goals
CREATE POLICY "Goal owner can view comments"
  ON public.goal_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.goals g WHERE g.id = goal_comments.goal_id AND g.user_id = auth.uid()
  ));

-- Partners with goal visibility can view comments
CREATE POLICY "Partners can view goal comments"
  ON public.goal_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.goals g
    JOIN public.accountability_partnerships ap ON (
      (ap.user1_id = auth.uid() AND ap.user2_id = g.user_id AND ap.user1_can_view_user2_goals = true)
      OR
      (ap.user2_id = auth.uid() AND ap.user1_id = g.user_id AND ap.user2_can_view_user1_goals = true)
    )
    WHERE g.id = goal_comments.goal_id AND ap.status = 'active'
  ));

-- The commenter can view their own comments
CREATE POLICY "Commenter can view own comments"
  ON public.goal_comments FOR SELECT
  USING (auth.uid() = user_id);

-- Partners with goal visibility can insert comments
CREATE POLICY "Partners can add comments on visible goals"
  ON public.goal_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Own goal
      EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_comments.goal_id AND g.user_id = auth.uid())
      OR
      -- Partner with visibility
      EXISTS (
        SELECT 1 FROM public.goals g
        JOIN public.accountability_partnerships ap ON (
          (ap.user1_id = auth.uid() AND ap.user2_id = g.user_id AND ap.user1_can_view_user2_goals = true)
          OR
          (ap.user2_id = auth.uid() AND ap.user1_id = g.user_id AND ap.user2_can_view_user1_goals = true)
        )
        WHERE g.id = goal_comments.goal_id AND ap.status = 'active'
      )
    )
  );

-- Users can delete their own comments
CREATE POLICY "Users can delete own goal comments"
  ON public.goal_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_goal_comments_goal_id ON public.goal_comments(goal_id);
CREATE INDEX idx_goal_comments_user_id ON public.goal_comments(user_id);
