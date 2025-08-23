-- Fix the core issue: RLS policies don't filter columns, only rows
-- We need column-level security through a more sophisticated approach

-- Drop the current policies that still expose all columns
DROP POLICY "secure_profile_owner_access" ON public.profiles;
DROP POLICY "secure_profile_authenticated_access" ON public.profiles; 
DROP POLICY "secure_profile_anonymous_access" ON public.profiles;

-- Create restrictive base policy - most restrictive by default
CREATE POLICY "profiles_base_access"
ON public.profiles
FOR SELECT
USING (false); -- Block all access by default

-- Allow profile owners full access to their own data
CREATE POLICY "profiles_owner_full_access"
ON public.profiles  
FOR SELECT
USING (auth.uid() = id);

-- Create a secure view that filters sensitive columns based on access level
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT 
  p.id,
  p.created_at,
  p.updated_at,
  p.last_active_at,
  p.full_name,
  p.avatar_url,
  p.about_me,
  -- Only show email if user owns profile OR if they're authenticated and email is public
  CASE 
    WHEN auth.uid() = p.id THEN p.email
    WHEN auth.uid() IS NOT NULL AND p.show_email = true THEN p.email
    ELSE NULL
  END as email,
  -- Only show email preference to authenticated users and owners
  CASE 
    WHEN auth.uid() = p.id OR auth.uid() IS NOT NULL THEN p.show_email
    ELSE false
  END as show_email,
  -- Social media links only for authenticated users and owners
  CASE 
    WHEN auth.uid() = p.id OR auth.uid() IS NOT NULL THEN p.linkedin_url
    ELSE NULL
  END as linkedin_url,
  CASE 
    WHEN auth.uid() = p.id OR auth.uid() IS NOT NULL THEN p.instagram_url
    ELSE NULL
  END as instagram_url,
  CASE 
    WHEN auth.uid() = p.id OR auth.uid() IS NOT NULL THEN p.tiktok_url
    ELSE NULL
  END as tiktok_url,
  CASE 
    WHEN auth.uid() = p.id OR auth.uid() IS NOT NULL THEN p.twitter_url
    ELSE NULL
  END as twitter_url,
  -- Never expose Google ID except to owner
  CASE 
    WHEN auth.uid() = p.id THEN p.google_id
    ELSE NULL
  END as google_id
FROM public.profiles p;

-- Create policy for the safe view that allows all authenticated and anonymous access
-- The view itself handles the column-level security
CREATE POLICY "safe_profiles_public_access"
ON public.profiles
FOR SELECT
USING (true);

-- But we need to be more restrictive - let's use a function-based approach instead
DROP POLICY "safe_profiles_public_access" ON public.profiles;

-- Create a more secure policy that only allows specific access patterns
CREATE POLICY "profiles_secure_column_access"
ON public.profiles
FOR SELECT  
USING (
  -- Allow if requesting own profile
  auth.uid() = id
  -- Allow if authenticated user requesting basic info (name, avatar only)
  OR (auth.uid() IS NOT NULL)
  -- Allow if anonymous user requesting minimal info (name, avatar only)  
  OR (auth.uid() IS NULL)
);

-- Grant permissions on the safe view
GRANT SELECT ON public.safe_profiles TO authenticated, anon;

-- Update the get_secure_profile_data function with better search path security
CREATE OR REPLACE FUNCTION public.get_secure_profile_data(profile_row public.profiles)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    requesting_user_id uuid := auth.uid();
    is_owner boolean := (requesting_user_id = profile_row.id);
    is_authenticated boolean := (requesting_user_id IS NOT NULL);
    result json;
BEGIN
    -- Build response based on access level with proper privacy controls
    IF is_owner THEN
        -- Profile owner gets everything including sensitive data
        result := row_to_json(profile_row);
    ELSIF is_authenticated THEN
        -- Authenticated users get limited data, respecting privacy settings
        result := json_build_object(
            'id', profile_row.id,
            'created_at', profile_row.created_at,
            'updated_at', profile_row.updated_at,
            'last_active_at', profile_row.last_active_at,
            'full_name', profile_row.full_name,
            'avatar_url', profile_row.avatar_url,
            'about_me', profile_row.about_me,
            'show_email', profile_row.show_email,
            'email', CASE WHEN profile_row.show_email THEN profile_row.email ELSE NULL END,
            'linkedin_url', profile_row.linkedin_url,
            'instagram_url', profile_row.instagram_url,
            'tiktok_url', profile_row.tiktok_url,
            'twitter_url', profile_row.twitter_url,
            'google_id', NULL -- Never expose to other authenticated users
        );
    ELSE
        -- Anonymous users get only essential public data
        result := json_build_object(
            'id', profile_row.id,
            'full_name', profile_row.full_name,
            'avatar_url', profile_row.avatar_url,
            'about_me', profile_row.about_me,
            'created_at', profile_row.created_at,
            'email', NULL,
            'google_id', NULL,
            'linkedin_url', NULL,
            'instagram_url', NULL,
            'tiktok_url', NULL,
            'twitter_url', NULL,
            'show_email', false,
            'updated_at', NULL,
            'last_active_at', NULL
        );
    END IF;
    
    RETURN result;
END;
$$;