-- First, let's check if there are any auth users without profiles and create profiles for them
-- This is a one-time fix for the missing profile

-- Create a more robust handle_new_user function that handles edge cases better
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_full_name TEXT;
  v_email TEXT;
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
  ON CONFLICT (id) DO NOTHING; -- Avoid errors if profile already exists
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create missing profile for user 834966d4-e2ae-4348-8347-5a7e6c6b398f
-- We'll use a placeholder email/name that will be updated when they complete onboarding
INSERT INTO public.profiles (id, full_name, email, is_profile_complete)
VALUES ('834966d4-e2ae-4348-8347-5a7e6c6b398f', '', 'nicolaieddy1@gmail.com', false)
ON CONFLICT (id) DO NOTHING;