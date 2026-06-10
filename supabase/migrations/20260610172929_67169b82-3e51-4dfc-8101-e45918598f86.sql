
-- 1. Create profiles_public view (already referenced by code, but missing)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = false) AS
SELECT
  id, full_name, avatar_url, cover_photo_url, cover_photo_position,
  about_me, linkedin_url, instagram_url, tiktok_url, twitter_url,
  youtube_url, github_url, snapchat_url, medium_url, substack_url,
  whatsapp_url, telegram_url, signal_url, website_url, email_contact,
  social_links_order, created_at, last_active_at, city, country,
  timezone, is_profile_complete
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- 2. Revoke direct column access to sensitive PII from authenticated/anon
--    Owner reads must go through get_my_private_profile() SECURITY DEFINER RPC.
REVOKE SELECT (email, phone_number, phone_verified, date_of_birth, google_id, ai_features_enabled)
  ON public.profiles FROM authenticated, anon, PUBLIC;

-- Admins still need to view sensitive cols via the admin RPC (security definer), so no grant needed.

-- 3. RPC for network module: find Kujituma users matching contact email/linkedin/phone
CREATE OR REPLACE FUNCTION public.find_kujituma_matches(
  _emails text[] DEFAULT ARRAY[]::text[],
  _linkedins text[] DEFAULT ARRAY[]::text[],
  _phones text[] DEFAULT ARRAY[]::text[]
)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  matched_email boolean,
  matched_linkedin boolean,
  matched_phone boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH normalized AS (
    SELECT
      p.id,
      p.full_name,
      p.avatar_url,
      LOWER(TRIM(p.email)) AS norm_email,
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(p.linkedin_url,''), '^https?://(www\.)?','','i'),'/+$|\?.*$','','g')) AS norm_linkedin,
      RIGHT(REGEXP_REPLACE(COALESCE(p.phone_number,''),'\D','','g'), 9) AS norm_phone
    FROM public.profiles p
    WHERE p.id <> auth.uid() AND auth.uid() IS NOT NULL
  )
  SELECT
    n.id AS user_id,
    n.full_name,
    n.avatar_url,
    (n.norm_email <> '' AND n.norm_email = ANY(SELECT LOWER(TRIM(e)) FROM unnest(_emails) e WHERE e IS NOT NULL AND e <> '')) AS matched_email,
    (n.norm_linkedin <> '' AND n.norm_linkedin = ANY(
      SELECT LOWER(REGEXP_REPLACE(REGEXP_REPLACE(l,'^https?://(www\.)?','','i'),'/+$|\?.*$','','g'))
      FROM unnest(_linkedins) l WHERE l IS NOT NULL AND l <> ''
    )) AS matched_linkedin,
    (LENGTH(n.norm_phone) >= 9 AND n.norm_phone = ANY(
      SELECT RIGHT(REGEXP_REPLACE(ph,'\D','','g'), 9)
      FROM unnest(_phones) ph WHERE ph IS NOT NULL AND ph <> ''
    )) AS matched_phone
  FROM normalized n
  WHERE
    (n.norm_email <> '' AND n.norm_email = ANY(SELECT LOWER(TRIM(e)) FROM unnest(_emails) e WHERE e IS NOT NULL AND e <> ''))
    OR
    (n.norm_linkedin <> '' AND n.norm_linkedin = ANY(
      SELECT LOWER(REGEXP_REPLACE(REGEXP_REPLACE(l,'^https?://(www\.)?','','i'),'/+$|\?.*$','','g'))
      FROM unnest(_linkedins) l WHERE l IS NOT NULL AND l <> ''
    ))
    OR
    (LENGTH(n.norm_phone) >= 9 AND n.norm_phone = ANY(
      SELECT RIGHT(REGEXP_REPLACE(ph,'\D','','g'), 9)
      FROM unnest(_phones) ph WHERE ph IS NOT NULL AND ph <> ''
    ));
$$;

GRANT EXECUTE ON FUNCTION public.find_kujituma_matches(text[], text[], text[]) TO authenticated;

-- 4. Admin RPC to read a user's AI features setting
CREATE OR REPLACE FUNCTION public.admin_get_user_ai_features(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v boolean;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT ai_features_enabled INTO v FROM public.profiles WHERE id = _user_id;
  RETURN COALESCE(v, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_user_ai_features(uuid) TO authenticated;

-- 5. Tighten weekly_objectives partner SELECT policy with visibility flag
DROP POLICY IF EXISTS "Partners can view weekly objectives" ON public.weekly_objectives;

CREATE POLICY "Partners can view weekly objectives"
ON public.weekly_objectives
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.accountability_partnerships ap
    WHERE ap.status = 'active'
      AND (
        (ap.user1_id = auth.uid() AND ap.user2_id = weekly_objectives.user_id AND ap.user1_can_view_user2_goals = true)
        OR
        (ap.user2_id = auth.uid() AND ap.user1_id = weekly_objectives.user_id AND ap.user2_can_view_user1_goals = true)
      )
  )
);
