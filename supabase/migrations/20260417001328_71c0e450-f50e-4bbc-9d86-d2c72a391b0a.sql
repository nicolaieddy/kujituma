ALTER TABLE public.synced_activities
  ADD COLUMN IF NOT EXISTS reflection text,
  ADD COLUMN IF NOT EXISTS reflection_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.update_synced_activity_reflection_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reflection IS DISTINCT FROM OLD.reflection THEN
    NEW.reflection_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_synced_activity_reflection_timestamp ON public.synced_activities;
CREATE TRIGGER trg_synced_activity_reflection_timestamp
BEFORE UPDATE ON public.synced_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_synced_activity_reflection_timestamp();