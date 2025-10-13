-- Allow accountability partners to view each other's weekly progress posts
CREATE POLICY "Partners can view weekly progress posts"
ON weekly_progress_posts FOR SELECT
USING (
  user_id IN (
    SELECT CASE 
      WHEN user1_id = auth.uid() THEN user2_id
      WHEN user2_id = auth.uid() THEN user1_id
    END
    FROM accountability_partnerships
    WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
    AND status = 'active'
  )
);

-- Allow accountability partners to view each other's public goals
CREATE POLICY "Partners can view public goals"
ON goals FOR SELECT
USING (
  is_public = true AND
  user_id IN (
    SELECT CASE 
      WHEN user1_id = auth.uid() THEN user2_id
      WHEN user2_id = auth.uid() THEN user1_id
    END
    FROM accountability_partnerships
    WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
    AND status = 'active'
  )
);

-- Allow accountability partners to view each other's weekly objectives
CREATE POLICY "Partners can view weekly objectives"
ON weekly_objectives FOR SELECT
USING (
  user_id IN (
    SELECT CASE 
      WHEN user1_id = auth.uid() THEN user2_id
      WHEN user2_id = auth.uid() THEN user1_id
    END
    FROM accountability_partnerships
    WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
    AND status = 'active'
  )
);