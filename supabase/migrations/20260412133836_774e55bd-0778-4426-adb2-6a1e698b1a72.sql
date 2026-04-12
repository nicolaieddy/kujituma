
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_email TEXT;
  v_admin RECORD;
BEGIN
  -- Extract full name from various possible metadata fields
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'user_name',
    ''
  );
  
  -- Get email from either the email field or metadata
  v_email := COALESCE(
    NEW.email,
    NEW.raw_user_meta_data ->> 'email',
    ''
  );
  
  -- Insert the profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, v_full_name, v_email)
  ON CONFLICT (id) DO NOTHING;
  
  -- Notify all admins about the new user
  FOR v_admin IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, message, triggered_by_user_id)
    VALUES (
      v_admin.user_id,
      'new_user_signup',
      'New user signed up: ' || COALESCE(NULLIF(v_full_name, ''), 'Unknown') || ' (' || COALESCE(NULLIF(v_email, ''), 'no email') || ')',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
