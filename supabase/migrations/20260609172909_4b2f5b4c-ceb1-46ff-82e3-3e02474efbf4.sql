
DROP FUNCTION IF EXISTS public.get_my_private_profile();
CREATE OR REPLACE FUNCTION public.get_my_private_profile()
RETURNS TABLE (
  email text,
  phone_number text,
  phone_verified boolean,
  date_of_birth date,
  google_id text,
  ai_features_enabled boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email, phone_number, phone_verified, date_of_birth, google_id, ai_features_enabled
  FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_private_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;

-- Now apply the remaining steps that ran successfully or need re-application
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can view non-hidden posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can view non-hidden posts" ON public.posts;
CREATE POLICY "Authenticated users can view non-hidden posts"
ON public.posts FOR SELECT TO authenticated
USING ((NOT hidden) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;
CREATE POLICY "Authenticated users can view comments"
ON public.comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON public.post_likes;
DROP POLICY IF EXISTS "Authenticated users can view post likes" ON public.post_likes;
CREATE POLICY "Authenticated users can view post likes"
ON public.post_likes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view post reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Authenticated users can view post reactions" ON public.post_reactions;
CREATE POLICY "Authenticated users can view post reactions"
ON public.post_reactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Authenticated users can view comment likes" ON public.comment_likes;
CREATE POLICY "Authenticated users can view comment likes"
ON public.comment_likes FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.posts, public.comments, public.post_likes,
       public.post_reactions, public.comment_likes FROM anon;

DROP POLICY IF EXISTS "Authenticated users can view public profile fields" ON public.profiles;
CREATE POLICY "Authenticated users can view public profile fields"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);
REVOKE SELECT (ai_features_enabled) ON public.profiles FROM authenticated, anon;

DROP POLICY IF EXISTS "Users view own garmin connection" ON public.garmin_connections;
DROP POLICY IF EXISTS "Users insert own garmin connection" ON public.garmin_connections;
DROP POLICY IF EXISTS "Users update own garmin connection" ON public.garmin_connections;
CREATE POLICY "Users view own garmin connection"
ON public.garmin_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own garmin connection"
ON public.garmin_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own garmin connection"
ON public.garmin_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own strava connection" ON public.strava_connections;
DROP POLICY IF EXISTS "Users insert own strava connection" ON public.strava_connections;
DROP POLICY IF EXISTS "Users update own strava connection" ON public.strava_connections;
CREATE POLICY "Users view own strava connection"
ON public.strava_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own strava connection"
ON public.strava_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own strava connection"
ON public.strava_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can use realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can use realtime"
ON realtime.messages FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can broadcast" ON realtime.messages;
CREATE POLICY "Authenticated users can broadcast"
ON realtime.messages FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
