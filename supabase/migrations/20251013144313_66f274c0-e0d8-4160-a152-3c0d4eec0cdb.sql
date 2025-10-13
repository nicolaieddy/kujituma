-- Drop existing problematic policies
DROP POLICY IF EXISTS "Members can view group members" ON public.accountability_group_members;
DROP POLICY IF EXISTS "Group admins can add members" ON public.accountability_group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON public.accountability_group_members;

-- Create security definer functions to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accountability_group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accountability_group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
      AND role = 'admin'
  )
$$;

-- Recreate policies using the security definer functions
CREATE POLICY "Members can view group members"
ON public.accountability_group_members
FOR SELECT
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Group admins can add members"
ON public.accountability_group_members
FOR INSERT
WITH CHECK (public.is_group_admin(auth.uid(), group_id));

CREATE POLICY "Group admins can remove members"
ON public.accountability_group_members
FOR DELETE
USING (public.is_group_admin(auth.uid(), group_id));