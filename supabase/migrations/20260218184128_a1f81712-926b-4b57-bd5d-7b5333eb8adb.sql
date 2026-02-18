
-- Create phone_verification_codes table
CREATE TABLE IF NOT EXISTS public.phone_verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  phone_number text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see/insert/update their own rows
CREATE POLICY "Users can manage their own verification codes"
  ON public.phone_verification_codes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Drop old auto-verify trigger if it exists
DROP TRIGGER IF EXISTS trg_sync_phone_verified ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_phone_verified();

-- Trigger: reset phone_verified to false when phone_number changes
CREATE OR REPLACE FUNCTION public.reset_phone_verified_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
    NEW.phone_verified := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_phone_verified ON public.profiles;
CREATE TRIGGER trg_reset_phone_verified
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_phone_verified_on_change();
