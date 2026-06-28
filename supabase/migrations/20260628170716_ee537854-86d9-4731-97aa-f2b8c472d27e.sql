CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name TEXT;
  v_email TEXT;
  v_admin RECORD;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'user_name',
    ''
  );
  v_email := COALESCE(NEW.email, NEW.raw_user_meta_data ->> 'email', '');

  -- 1) Always create the profile (critical path)
  BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, v_full_name, v_email)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'handle_new_user: profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  -- 2) Best-effort admin notifications (must never block signup)
  BEGIN
    FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      BEGIN
        INSERT INTO public.notifications (user_id, type, message, triggered_by_user_id)
        VALUES (
          v_admin.user_id,
          'new_user_signup',
          'New user signed up: ' || COALESCE(NULLIF(v_full_name, ''), 'Unknown') || ' (' || COALESCE(NULLIF(v_email, ''), 'no email') || ')',
          NEW.id
        );
      EXCEPTION WHEN others THEN
        RAISE WARNING 'handle_new_user: admin notify failed for admin % / user %: %', v_admin.user_id, NEW.id, SQLERRM;
      END;
    END LOOP;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'handle_new_user: admin notify loop failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- Safety net: backfill any future stragglers on demand via this helper
CREATE OR REPLACE FUNCTION public.backfill_missing_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH ins AS (
    INSERT INTO public.profiles (id, full_name, email)
    SELECT u.id,
      COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
      COALESCE(u.email, '')
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.backfill_missing_profiles() FROM anon, authenticated;