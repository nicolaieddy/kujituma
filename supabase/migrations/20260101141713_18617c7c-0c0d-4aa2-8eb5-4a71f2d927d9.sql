-- First drop the RLS policy that references commitment_visibility
DROP POLICY IF EXISTS "Friends can view commitments" ON public.public_commitments;

-- Now drop the commitment_visibility column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS commitment_visibility;

-- Recreate a simpler policy: owner can view their own, friends can view friend's commitments
CREATE POLICY "Friends can view commitments" ON public.public_commitments
FOR SELECT
USING (
  auth.uid() = user_id 
  OR are_friends(auth.uid(), user_id)
);