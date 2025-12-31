-- Add visibility columns to accountability_partnerships (using IF NOT EXISTS since it might have succeeded partially before)
ALTER TABLE public.accountability_partnerships
ADD COLUMN IF NOT EXISTS user1_can_view_user2_goals boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS user2_can_view_user1_goals boolean NOT NULL DEFAULT true;

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_accountability_partners();

-- Recreate the function with visibility info
CREATE FUNCTION public.get_accountability_partners()
RETURNS TABLE (
  partnership_id uuid,
  partner_id uuid,
  full_name text,
  avatar_url text,
  status text,
  last_check_in_at timestamptz,
  can_view_partner_goals boolean,
  partner_can_view_my_goals boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ap.id as partnership_id,
    CASE 
      WHEN ap.user1_id = auth.uid() THEN ap.user2_id
      ELSE ap.user1_id
    END as partner_id,
    p.full_name,
    p.avatar_url,
    ap.status,
    ap.last_check_in_at,
    CASE 
      WHEN ap.user1_id = auth.uid() THEN ap.user1_can_view_user2_goals
      ELSE ap.user2_can_view_user1_goals
    END as can_view_partner_goals,
    CASE 
      WHEN ap.user1_id = auth.uid() THEN ap.user2_can_view_user1_goals
      ELSE ap.user1_can_view_user2_goals
    END as partner_can_view_my_goals
  FROM accountability_partnerships ap
  JOIN profiles p ON p.id = CASE 
    WHEN ap.user1_id = auth.uid() THEN ap.user2_id
    ELSE ap.user1_id
  END
  WHERE (ap.user1_id = auth.uid() OR ap.user2_id = auth.uid())
    AND ap.status = 'active';
$$;