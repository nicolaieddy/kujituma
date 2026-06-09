
-- Garmin: deny client SELECT entirely (server uses service role which bypasses RLS)
DROP POLICY IF EXISTS "Users view own garmin connection" ON public.garmin_connections;
CREATE POLICY "No client read of garmin credentials"
ON public.garmin_connections FOR SELECT TO authenticated, anon
USING (false);

-- Strava: deny client SELECT entirely
DROP POLICY IF EXISTS "Users view own strava connection" ON public.strava_connections;
CREATE POLICY "No client read of strava tokens"
ON public.strava_connections FOR SELECT TO authenticated, anon
USING (false);

-- Goals & goal_updates: require auth
DROP POLICY IF EXISTS "Public goals are viewable by everyone" ON public.goals;
CREATE POLICY "Public goals are viewable by authenticated users"
ON public.goals FOR SELECT TO authenticated
USING (visibility = 'public');

DROP POLICY IF EXISTS "Friends can view friends-visible goals" ON public.goals;
CREATE POLICY "Friends can view friends-visible goals"
ON public.goals FOR SELECT TO authenticated
USING ((visibility = ANY (ARRAY['public','friends'])) AND public.are_friends(auth.uid(), user_id));

DROP POLICY IF EXISTS "Users can view updates on visible goals" ON public.goal_updates;
CREATE POLICY "Users can view updates on visible goals"
ON public.goal_updates FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = goal_updates.goal_id
      AND (g.visibility = 'public' OR g.user_id = auth.uid()
        OR (g.visibility = 'friends' AND public.are_friends(g.user_id, auth.uid())))
  )
);

REVOKE SELECT ON public.goals, public.goal_updates FROM anon;
