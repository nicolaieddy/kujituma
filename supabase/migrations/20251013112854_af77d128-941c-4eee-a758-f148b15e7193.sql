-- Part 2: Add support for multiple partners and groups

-- Create accountability groups table
CREATE TABLE IF NOT EXISTS public.accountability_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active'
);

-- Create group members junction table
CREATE TABLE IF NOT EXISTS public.accountability_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.accountability_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Add group support to check-ins
ALTER TABLE public.accountability_check_ins 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.accountability_groups(id);

-- Add constraint to ensure either partnership_id OR group_id is set (not both)
ALTER TABLE public.accountability_check_ins 
DROP CONSTRAINT IF EXISTS check_partnership_or_group;

ALTER TABLE public.accountability_check_ins 
ADD CONSTRAINT check_partnership_or_group CHECK (
  (partnership_id IS NOT NULL AND group_id IS NULL) OR
  (partnership_id IS NULL AND group_id IS NOT NULL)
);

-- Enable RLS on new tables
ALTER TABLE public.accountability_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accountability_groups
CREATE POLICY "Members can view their groups"
ON public.accountability_groups FOR SELECT
USING (
  id IN (
    SELECT group_id FROM public.accountability_group_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create groups"
ON public.accountability_groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
ON public.accountability_groups FOR UPDATE
USING (
  id IN (
    SELECT group_id FROM public.accountability_group_members
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for accountability_group_members
CREATE POLICY "Members can view group members"
ON public.accountability_group_members FOR SELECT
USING (
  group_id IN (
    SELECT group_id FROM public.accountability_group_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Group admins can add members"
ON public.accountability_group_members FOR INSERT
WITH CHECK (
  group_id IN (
    SELECT group_id FROM public.accountability_group_members
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Group admins can remove members"
ON public.accountability_group_members FOR DELETE
USING (
  group_id IN (
    SELECT group_id FROM public.accountability_group_members
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Update check-ins RLS to support groups
DROP POLICY IF EXISTS "Partners can view check-ins" ON public.accountability_check_ins;

CREATE POLICY "Partners and group members can view check-ins"
ON public.accountability_check_ins FOR SELECT
USING (
  -- Partnership check-ins
  (partnership_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.accountability_partnerships
    WHERE id = accountability_check_ins.partnership_id
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  ))
  OR
  -- Group check-ins
  (group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.accountability_group_members
    WHERE group_id = accountability_check_ins.group_id
    AND user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Partners can create check-ins" ON public.accountability_check_ins;

CREATE POLICY "Partners and group members can create check-ins"
ON public.accountability_check_ins FOR INSERT
WITH CHECK (
  auth.uid() = initiated_by AND (
    -- Partnership check-ins
    (partnership_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.accountability_partnerships
      WHERE id = accountability_check_ins.partnership_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
      AND status = 'active'
    ))
    OR
    -- Group check-ins
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.accountability_group_members
      WHERE group_id = accountability_check_ins.group_id
      AND user_id = auth.uid()
    ))
  )
);

-- Function to get all accountability partners (not just one)
CREATE OR REPLACE FUNCTION public.get_accountability_partners()
RETURNS TABLE(
  partner_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  partnership_id UUID,
  status TEXT,
  last_check_in_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN ap.user1_id = auth.uid() THEN ap.user2_id 
      ELSE ap.user1_id 
    END as partner_id,
    p.full_name,
    p.avatar_url,
    ap.id as partnership_id,
    ap.status,
    ap.last_check_in_at
  FROM accountability_partnerships ap
  JOIN profiles p ON p.id = CASE 
    WHEN ap.user1_id = auth.uid() THEN ap.user2_id 
    ELSE ap.user1_id 
  END
  WHERE (ap.user1_id = auth.uid() OR ap.user2_id = auth.uid())
  AND ap.status = 'active'
  ORDER BY ap.created_at DESC;
$$;

-- Function to get user's accountability groups
CREATE OR REPLACE FUNCTION public.get_accountability_groups()
RETURNS TABLE(
  group_id UUID,
  group_name TEXT,
  group_description TEXT,
  member_count BIGINT,
  last_check_in_at TIMESTAMPTZ,
  user_role TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    g.id as group_id,
    g.name as group_name,
    g.description as group_description,
    (SELECT COUNT(*) FROM accountability_group_members WHERE group_id = g.id) as member_count,
    (SELECT MAX(created_at) FROM accountability_check_ins WHERE group_id = g.id) as last_check_in_at,
    gm.role as user_role
  FROM accountability_groups g
  JOIN accountability_group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = auth.uid()
  AND g.status = 'active'
  ORDER BY g.created_at DESC;
$$;