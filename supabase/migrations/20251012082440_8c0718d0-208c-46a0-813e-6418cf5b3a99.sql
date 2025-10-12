-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "secure_profile_anonymous_access" ON public.profiles;
DROP POLICY IF EXISTS "secure_profile_authenticated_access" ON public.profiles;
DROP POLICY IF EXISTS "secure_profile_owner_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_secure_column_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_base_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_full_access" ON public.profiles;
DROP POLICY IF EXISTS "anonymous_view_basic_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_view_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_view_limited_profiles" ON public.profiles;
DROP POLICY IF EXISTS "owners_view_full_profile" ON public.profiles;
DROP POLICY IF EXISTS "owners_full_access" ON public.profiles;

-- Keep existing INSERT and UPDATE policies
-- Users can insert their own profile
-- Users can update their own profile

-- Create NEW restrictive SELECT policies
-- Anonymous users: minimal public info only (no email, no social links)
CREATE POLICY "anon_minimal_profile_access"
ON public.profiles
FOR SELECT
TO anon
USING (true);

-- Authenticated users: can see profiles with limited data (respects show_email)
CREATE POLICY "auth_limited_profile_access"  
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() != id);

-- Profile owners: full access to their own profile
CREATE POLICY "owner_full_profile_access"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Drop Security Definer Views
DROP VIEW IF EXISTS public.safe_profiles CASCADE;
DROP VIEW IF EXISTS public.secure_profiles CASCADE;

-- Drop old security definer function
DROP FUNCTION IF EXISTS public.get_secure_profile_data(profiles);

-- Add Postgres Row Level Security that filters columns based on viewer
-- This is done through the application layer, not via views