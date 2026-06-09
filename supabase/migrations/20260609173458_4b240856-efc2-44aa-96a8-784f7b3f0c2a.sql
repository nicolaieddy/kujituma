
-- 1) Fix functions with mutable search_path
ALTER FUNCTION public.normalize_to_monday(date) SET search_path = public;
ALTER FUNCTION public.normalize_week_start_trigger() SET search_path = public;

-- 2) Block anonymous (unauthenticated) execution of all SECURITY DEFINER functions in public.
-- These functions are designed for signed-in users only; anon should never invoke them.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, PUBLIC;', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role;', r.proname, r.args);
  END LOOP;
END $$;
