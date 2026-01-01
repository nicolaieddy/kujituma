-- Session tracking table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_token UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON public.user_sessions(session_token);

-- Permissions (required for PostgREST)
GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO authenticated;
REVOKE ALL ON public.user_sessions FROM anon;

-- RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;

CREATE POLICY "Users can manage their own sessions"
ON public.user_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
ON public.user_sessions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Heartbeat RPC
DROP FUNCTION IF EXISTS public.upsert_session_heartbeat(UUID);
CREATE OR REPLACE FUNCTION public.upsert_session_heartbeat(_session_token UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_session_id UUID;
  new_session_id UUID;
  delta_seconds INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  SELECT id INTO existing_session_id
  FROM public.user_sessions
  WHERE session_token = _session_token
    AND user_id = auth.uid()
    AND ended_at IS NULL;

  IF existing_session_id IS NOT NULL THEN
    SELECT LEAST(EXTRACT(EPOCH FROM (now() - last_heartbeat_at))::INTEGER, 60)
      INTO delta_seconds
    FROM public.user_sessions
    WHERE id = existing_session_id;

    UPDATE public.user_sessions
    SET last_heartbeat_at = now(),
        duration_seconds = duration_seconds + COALESCE(delta_seconds, 0)
    WHERE id = existing_session_id;

    RETURN existing_session_id;
  END IF;

  INSERT INTO public.user_sessions (user_id, session_token)
  VALUES (auth.uid(), _session_token)
  RETURNING id INTO new_session_id;

  RETURN new_session_id;
END;
$$;

DROP FUNCTION IF EXISTS public.end_session(UUID);
CREATE OR REPLACE FUNCTION public.end_session(_session_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_sessions
  SET ended_at = now(),
      last_heartbeat_at = now()
  WHERE session_token = _session_token
    AND user_id = auth.uid()
    AND ended_at IS NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_session_heartbeat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_session(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_session_heartbeat(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.end_session(UUID) FROM anon;

-- Update admin RPC
DROP FUNCTION IF EXISTS public.get_admin_users_data();
CREATE OR REPLACE FUNCTION public.get_admin_users_data()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone,
  posts_count bigint,
  role text,
  last_active_at timestamp with time zone,
  total_time_seconds bigint,
  days_active bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.created_at,
    COALESCE(post_counts.count, 0) as posts_count,
    COALESCE(ur.role::text, 'user') as role,
    p.last_active_at,
    COALESCE(session_stats.total_seconds, 0) as total_time_seconds,
    COALESCE(session_stats.unique_days, 0) as days_active
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM public.posts
    GROUP BY user_id
  ) post_counts ON p.id = post_counts.user_id
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  LEFT JOIN (
    SELECT
      us.user_id,
      SUM(us.duration_seconds)::bigint as total_seconds,
      COUNT(DISTINCT DATE(us.started_at))::bigint as unique_days
    FROM public.user_sessions us
    GROUP BY us.user_id
  ) session_stats ON p.id = session_stats.user_id
  ORDER BY p.last_active_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_users_data() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_users_data() FROM anon;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';