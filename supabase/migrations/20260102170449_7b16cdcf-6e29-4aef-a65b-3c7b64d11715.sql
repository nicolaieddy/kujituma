-- Drop overly-permissive anonymous profile access
DROP POLICY IF EXISTS "anon_minimal_profile_access" ON public.profiles;

-- Create new anonymous policy that only exposes safe fields
-- This uses a security-definer function view pattern
CREATE POLICY "anon_minimal_profile_access"
ON public.profiles
FOR SELECT
TO anon
USING (
  -- Anonymous users can query, but only id, full_name, avatar_url are exposed
  -- (Supabase returns only queried columns; this USING clause allows access)
  true
);

-- Actually, to truly restrict columns for anon we need to use a view or RPC.
-- For now, let's simply REMOVE anon access entirely since the user chose "Only the owner".
-- Drop the anon policy we just created
DROP POLICY IF EXISTS "anon_minimal_profile_access" ON public.profiles;

-- Also drop the authenticated-others policy so only the owner can read their profile
DROP POLICY IF EXISTS "auth_limited_profile_access" ON public.profiles;
