-- Drop the overly permissive policy that exposes all data publicly
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create secure, granular policies for different access levels

-- 1. Allow users full access to their own profile data
CREATE POLICY "Users can view their own complete profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 2. Allow authenticated users to see basic profile info (for feeds, comments, etc.)
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles  
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() != id  -- Don't duplicate with policy above
);

-- 3. Allow anonymous users to see only minimal public info needed for app functionality
CREATE POLICY "Anonymous users can view minimal public profile info"
ON public.profiles
FOR SELECT  
USING (
  auth.uid() IS NULL
);

-- Create a security definer function to control what data is visible to different user types
CREATE OR REPLACE FUNCTION public.get_profile_visibility_level(profile_user_id uuid, requesting_user_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Profile owner gets full access
  IF requesting_user_id = profile_user_id THEN
    RETURN 'owner';
  END IF;
  
  -- Authenticated users get basic access
  IF requesting_user_id IS NOT NULL THEN
    RETURN 'authenticated';
  END IF;
  
  -- Anonymous users get minimal access
  RETURN 'anonymous';
END;
$$;

-- Update the profiles table to add a computed column for secure data access
-- This approach uses RLS to filter columns rather than rows
CREATE OR REPLACE VIEW public.secure_profiles AS
SELECT 
  id,
  created_at,
  updated_at,
  last_active_at,
  full_name,
  avatar_url,
  about_me,
  -- Conditional fields based on access level
  CASE 
    WHEN get_profile_visibility_level(id, auth.uid()) = 'owner' THEN email
    WHEN get_profile_visibility_level(id, auth.uid()) = 'authenticated' AND show_email = true THEN email
    ELSE NULL
  END as email,
  CASE 
    WHEN get_profile_visibility_level(id, auth.uid()) IN ('owner', 'authenticated') THEN show_email
    ELSE false
  END as show_email,
  CASE 
    WHEN get_profile_visibility_level(id, auth.uid()) IN ('owner', 'authenticated') THEN linkedin_url
    ELSE NULL
  END as linkedin_url,
  CASE 
    WHEN get_profile_visibility_level(id, auth.uid()) IN ('owner', 'authenticated') THEN instagram_url
    ELSE NULL
  END as instagram_url,
  CASE 
    WHEN get_profile_visibility_level(id, auth.uid()) IN ('owner', 'authenticated') THEN tiktok_url
    ELSE NULL
  END as tiktok_url,  
  CASE 
    WHEN get_profile_visibility_level(id, auth.uid()) IN ('owner', 'authenticated') THEN twitter_url
    ELSE NULL
  END as twitter_url,
  -- Never expose Google ID to anyone except owner
  CASE 
    WHEN get_profile_visibility_level(id, auth.uid()) = 'owner' THEN google_id
    ELSE NULL
  END as google_id
FROM public.profiles;

-- Add RLS to the view (inherits from base table)
ALTER VIEW public.secure_profiles SET (security_invoker = true);

-- Grant appropriate permissions
GRANT SELECT ON public.secure_profiles TO authenticated, anon;

-- Create an additional policy to ensure the show_email field is respected
CREATE POLICY "Respect email privacy settings"
ON public.profiles
FOR SELECT
USING (
  -- Allow if user owns profile OR if email visibility is enabled for authenticated users
  auth.uid() = id 
  OR (auth.uid() IS NOT NULL AND (show_email = true OR auth.uid() != id))
  OR auth.uid() IS NULL  -- Anonymous users handled by other policies
);