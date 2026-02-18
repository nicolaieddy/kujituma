CREATE OR REPLACE FUNCTION public.reset_phone_verified_on_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Only reset phone_verified if the phone number is changing
  -- AND verification isn't being explicitly granted in the same statement
  IF NEW.phone_number IS DISTINCT FROM OLD.phone_number AND NEW.phone_verified IS NOT TRUE THEN
    NEW.phone_verified := false;
  END IF;
  RETURN NEW;
END;
$$;