-- Add policy to allow authenticated users to view basic profile info of other users
-- This is needed for features like partner requests, friend lists, community feed, etc.

CREATE POLICY "Authenticated users can view basic profile info" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- The owner_full_profile_access policy is now redundant since the new policy covers it
-- But we'll keep it for backwards compatibility and clarity

COMMENT ON POLICY "Authenticated users can view basic profile info" ON public.profiles IS 
'Allows authenticated users to view profile information. Sensitive fields should be filtered at the application level if needed.';