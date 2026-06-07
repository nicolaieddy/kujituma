
-- 1) Table
CREATE TABLE IF NOT EXISTS public.user_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'installed' CHECK (status IN ('installed','uninstalled','trialing','expired')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uninstalled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_modules TO authenticated;
GRANT ALL ON public.user_modules TO service_role;

ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own modules"
  ON public.user_modules
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at trigger (reuse existing helper if present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $f$
    BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $f$ LANGUAGE plpgsql SET search_path = public;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_user_modules_updated_at ON public.user_modules;
CREATE TRIGGER update_user_modules_updated_at
  BEFORE UPDATE ON public.user_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) has_module helper
CREATE OR REPLACE FUNCTION public.has_module(_user_id UUID, _module_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_modules
    WHERE user_id = _user_id
      AND module_id = _module_id
      AND status IN ('installed','trialing')
  );
$$;

-- 3) Backfill Training Plan for any user with existing training-related data
INSERT INTO public.user_modules (user_id, module_id, status)
SELECT DISTINCT u.user_id, 'training_plan', 'installed'
FROM (
  SELECT user_id FROM public.synced_activities
  UNION
  SELECT user_id FROM public.training_plan_workouts
  UNION
  SELECT user_id FROM public.strava_connections
  UNION
  SELECT user_id FROM public.garmin_connections
  UNION
  SELECT user_id FROM public.sleep_entries
  UNION
  SELECT user_id FROM public.workout_preferences
) u
ON CONFLICT (user_id, module_id) DO NOTHING;
