
DO $$ BEGIN
  CREATE TYPE public.objective_resolution AS ENUM ('none', 'completed', 'deprioritized', 'abandoned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.weekly_objectives
  ADD COLUMN IF NOT EXISTS resolution public.objective_resolution NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

UPDATE public.weekly_objectives
  SET resolution = 'completed',
      resolved_at = COALESCE(resolved_at, updated_at)
  WHERE is_completed = true AND resolution = 'none';

CREATE INDEX IF NOT EXISTS idx_weekly_objectives_resolution
  ON public.weekly_objectives (user_id, resolution);
