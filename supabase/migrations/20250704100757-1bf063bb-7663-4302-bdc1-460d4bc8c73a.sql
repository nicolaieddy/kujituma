-- Create admin function to get user data with last login info
CREATE OR REPLACE FUNCTION get_admin_users_data()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz,
  posts_count bigint,
  role text,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user has admin role
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
    au.last_sign_in_at
  FROM profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM posts
    GROUP BY user_id
  ) post_counts ON p.id = post_counts.user_id
  LEFT JOIN user_roles ur ON p.id = ur.user_id
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$;