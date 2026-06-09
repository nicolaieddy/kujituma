
DROP POLICY IF EXISTS "Public values are viewable" ON public.user_values;
CREATE POLICY "Public values are viewable by authenticated users"
ON public.user_values FOR SELECT TO authenticated
USING (visibility = 'public'::value_visibility AND is_archived = false);
REVOKE SELECT ON public.user_values FROM anon;

DROP POLICY IF EXISTS "Coach plan owners read" ON storage.objects;
DROP POLICY IF EXISTS "Coach plan owners write" ON storage.objects;
DROP POLICY IF EXISTS "Coach plan owners update" ON storage.objects;
DROP POLICY IF EXISTS "Coach plan owners delete" ON storage.objects;
