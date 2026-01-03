-- Create tos_acceptances table
CREATE TABLE IF NOT EXISTS public.tos_acceptances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  tos_version text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tos_acceptances_user_id ON public.tos_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_tos_acceptances_user_version ON public.tos_acceptances(user_id, tos_version);

-- Enable RLS
ALTER TABLE public.tos_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can view their own ToS acceptances
CREATE POLICY "Users can view own tos acceptances"
  ON public.tos_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own ToS acceptances
CREATE POLICY "Users can insert own tos acceptances"
  ON public.tos_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Drop and recreate the admin function with ToS data
DROP FUNCTION IF EXISTS public.get_admin_users_data();

CREATE OR REPLACE FUNCTION public.get_admin_users_data()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone,
  last_active_at timestamp with time zone,
  role text,
  posts_count bigint,
  days_active bigint,
  total_time_seconds bigint,
  total_clicks bigint,
  total_keypresses bigint,
  total_scrolls bigint,
  tos_accepted_at timestamp with time zone,
  tos_version text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.last_active_at,
    COALESCE(ur.role::text, 'user') as role,
    COALESCE(post_counts.count, 0) as posts_count,
    COALESCE(session_stats.days_active, 0) as days_active,
    COALESCE(session_stats.total_time_seconds, 0) as total_time_seconds,
    COALESCE(session_stats.total_clicks, 0) as total_clicks,
    COALESCE(session_stats.total_keypresses, 0) as total_keypresses,
    COALESCE(session_stats.total_scrolls, 0) as total_scrolls,
    tos.accepted_at as tos_accepted_at,
    tos.tos_version as tos_version
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  LEFT JOIN (
    SELECT posts.user_id, COUNT(*) as count
    FROM public.posts
    GROUP BY posts.user_id
  ) post_counts ON p.id = post_counts.user_id
  LEFT JOIN (
    SELECT 
      us.user_id,
      COUNT(DISTINCT DATE(us.started_at)) as days_active,
      SUM(us.duration_seconds) as total_time_seconds,
      SUM(us.click_count) as total_clicks,
      SUM(us.keypress_count) as total_keypresses,
      SUM(us.scroll_count) as total_scrolls
    FROM public.user_sessions us
    GROUP BY us.user_id
  ) session_stats ON p.id = session_stats.user_id
  LEFT JOIN LATERAL (
    SELECT ta.accepted_at, ta.tos_version
    FROM public.tos_acceptances ta
    WHERE ta.user_id = p.id
    ORDER BY ta.accepted_at DESC
    LIMIT 1
  ) tos ON true
  ORDER BY p.created_at DESC;
END;
$$;