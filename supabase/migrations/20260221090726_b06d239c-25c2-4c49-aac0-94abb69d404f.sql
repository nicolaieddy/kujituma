
-- 1. Secure function for journal data access
CREATE OR REPLACE FUNCTION public.get_safe_check_in_data(p_user_id UUID)
RETURNS SETOF daily_check_ins
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() = p_user_id THEN
    RETURN QUERY SELECT * FROM daily_check_ins WHERE user_id = p_user_id;
  ELSE
    RETURN;
  END IF;
END;
$$;

-- 2. Explicit DELETE denial on daily_check_ins
CREATE POLICY "No one can delete check-ins via API"
ON public.daily_check_ins
FOR DELETE
USING (false);

-- 3. Audit log table for journal access
CREATE TABLE IF NOT EXISTS public.journal_access_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.journal_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to audit log"
ON public.journal_access_log
FOR ALL
USING (false);

-- 4. Tighten overly permissive INSERT policies
DROP POLICY IF EXISTS "System can create partnerships" ON accountability_partnerships;
CREATE POLICY "System can create partnerships" 
ON accountability_partnerships FOR INSERT
TO authenticated
WITH CHECK (
  user1_id = auth.uid() OR user2_id = auth.uid()
);

DROP POLICY IF EXISTS "System can create friendships" ON friends;
CREATE POLICY "System can create friendships"
ON friends FOR INSERT
TO authenticated  
WITH CHECK (
  user1_id = auth.uid() OR user2_id = auth.uid()
);

DROP POLICY IF EXISTS "System can insert history" ON partnership_visibility_history;
CREATE POLICY "Members can insert visibility history"
ON partnership_visibility_history FOR INSERT
TO authenticated
WITH CHECK (
  partnership_id IN (
    SELECT id FROM accountability_partnerships
    WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  )
);
