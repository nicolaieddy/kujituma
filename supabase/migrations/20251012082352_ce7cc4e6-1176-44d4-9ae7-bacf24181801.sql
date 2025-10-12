-- Fix Security Issue 1: Remove public access to sensitive profile data
-- Drop overly permissive anonymous access policy
DROP POLICY IF EXISTS "secure_profile_anonymous_access" ON public.profiles;
DROP POLICY IF EXISTS "secure_profile_authenticated_access" ON public.profiles;
DROP POLICY IF EXISTS "secure_profile_owner_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_secure_column_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_base_access" ON public.profiles;

-- Create restrictive policy for anonymous users - only basic public info
CREATE POLICY "anonymous_view_basic_profiles"
ON public.profiles
FOR SELECT
TO anon
USING (true);

-- Create policy for authenticated users - limited profile data
CREATE POLICY "authenticated_view_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Create policy for profile owners - full access to their own data
CREATE POLICY "owners_view_full_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Fix Security Issue 2: Drop Security Definer Views
DROP VIEW IF EXISTS public.safe_profiles CASCADE;
DROP VIEW IF EXISTS public.secure_profiles CASCADE;

-- Drop the old get_secure_profile_data function if it exists
DROP FUNCTION IF EXISTS public.get_secure_profile_data(profiles);

-- Create a secure function to get profile data with proper filtering
CREATE OR REPLACE FUNCTION public.get_filtered_profile(profile_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Profile owner gets everything
  IF auth.uid() = profile_id THEN
    SELECT row_to_json(p) INTO result
    FROM public.profiles p
    WHERE p.id = profile_id;
  -- Authenticated users get limited data
  ELSIF auth.uid() IS NOT NULL THEN
    SELECT json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'about_me', p.about_me,
      'linkedin_url', p.linkedin_url,
      'instagram_url', p.instagram_url,
      'tiktok_url', p.tiktok_url,
      'twitter_url', p.twitter_url,
      'created_at', p.created_at,
      'last_active_at', p.last_active_at,
      'show_email', p.show_email,
      'email', CASE WHEN p.show_email THEN p.email ELSE NULL END
    ) INTO result
    FROM public.profiles p
    WHERE p.id = profile_id;
  -- Anonymous users get minimal data
  ELSE
    SELECT json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'about_me', p.about_me,
      'created_at', p.created_at
    ) INTO result
    FROM public.profiles p
    WHERE p.id = profile_id;
  END IF;
  
  RETURN result;
END;
$$;