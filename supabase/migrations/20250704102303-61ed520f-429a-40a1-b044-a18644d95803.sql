-- Add last_active_at column to profiles table
ALTER TABLE profiles ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing profiles to set initial last_active_at from their created_at
UPDATE profiles SET last_active_at = created_at WHERE last_active_at IS NULL;

-- Drop and recreate the admin function with last_active_at instead of last_sign_in_at
DROP FUNCTION IF EXISTS get_admin_users_data();

CREATE FUNCTION get_admin_users_data()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz,
  posts_count bigint,
  role text,
  last_active_at timestamptz
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
    p.last_active_at
  FROM profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM posts
    GROUP BY user_id
  ) post_counts ON p.id = post_counts.user_id
  LEFT JOIN user_roles ur ON p.id = ur.user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- Create function to update last_active_at when users perform actions
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the current user's last_active_at timestamp
  UPDATE profiles 
  SET last_active_at = NOW() 
  WHERE id = auth.uid();
END;
$$;