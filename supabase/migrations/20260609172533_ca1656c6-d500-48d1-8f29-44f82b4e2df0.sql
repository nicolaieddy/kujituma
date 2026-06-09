
-- ============ PROFILES ============
-- Drop overly permissive policy exposing email/phone/dob/google_id
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

-- Admins can still view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Re-add broad authenticated read for non-sensitive columns (column privileges enforced below)
CREATE POLICY "Authenticated users can view public profile fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Revoke client-side column SELECT on sensitive fields
REVOKE SELECT (email, phone_number, phone_verified, date_of_birth, google_id)
  ON public.profiles FROM authenticated;
REVOKE SELECT (email, phone_number, phone_verified, date_of_birth, google_id)
  ON public.profiles FROM anon;

-- Secure owner-only access to sensitive fields via SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.get_my_private_profile()
RETURNS TABLE (
  email text,
  phone_number text,
  phone_verified boolean,
  date_of_birth date,
  google_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email, phone_number, phone_verified, date_of_birth, google_id
  FROM public.profiles
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_private_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_private_profile() TO authenticated;

-- ============ GARMIN CONNECTIONS ============
-- Encrypted credentials must not be readable by the client
DROP POLICY IF EXISTS "Users view own garmin connection" ON public.garmin_connections;
DROP POLICY IF EXISTS "Users insert own garmin connection" ON public.garmin_connections;
DROP POLICY IF EXISTS "Users update own garmin connection" ON public.garmin_connections;
-- Keep DELETE so users can disconnect; also harden it
DROP POLICY IF EXISTS "Users delete own garmin connection" ON public.garmin_connections;
CREATE POLICY "Users delete own garmin connection"
ON public.garmin_connections
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
REVOKE SELECT, INSERT, UPDATE ON public.garmin_connections FROM authenticated, anon;

-- ============ STRAVA CONNECTIONS ============
-- OAuth tokens must not be readable by the client
DROP POLICY IF EXISTS "Users can view own Strava connection" ON public.strava_connections;
DROP POLICY IF EXISTS "Users can create own Strava connection" ON public.strava_connections;
DROP POLICY IF EXISTS "Users can update own Strava connection" ON public.strava_connections;
DROP POLICY IF EXISTS "Users can delete own Strava connection" ON public.strava_connections;
CREATE POLICY "Users delete own strava connection"
ON public.strava_connections
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
REVOKE SELECT, INSERT, UPDATE ON public.strava_connections FROM authenticated, anon;

-- ============ AI USAGE LOGS ============
DROP POLICY IF EXISTS "Service role can insert AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Authenticated users insert own AI usage logs"
ON public.ai_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============ OBJECTIVE COMMENT REACTIONS ============
DROP POLICY IF EXISTS "Users can view all comment reactions" ON public.objective_comment_reactions;

CREATE POLICY "Users can view reactions on visible comments"
ON public.objective_comment_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.objective_comments oc
    JOIN public.weekly_objectives wo ON wo.id = oc.objective_id
    LEFT JOIN public.accountability_partnerships ap
      ON ap.status = 'active'
     AND (
       (ap.user1_id = auth.uid() AND ap.user2_id = wo.user_id AND ap.user1_can_view_user2_goals = true)
       OR (ap.user2_id = auth.uid() AND ap.user1_id = wo.user_id AND ap.user2_can_view_user1_goals = true)
     )
    WHERE oc.id = objective_comment_reactions.comment_id
      AND (wo.user_id = auth.uid() OR ap.id IS NOT NULL)
  )
);
