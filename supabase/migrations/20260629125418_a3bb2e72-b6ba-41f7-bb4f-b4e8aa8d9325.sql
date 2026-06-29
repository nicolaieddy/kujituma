-- 1. Enum for objective status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'objective_status') THEN
    CREATE TYPE public.objective_status AS ENUM ('not_started', 'in_progress', 'done');
  END IF;
END$$;

-- 2. Add status column (default not_started)
ALTER TABLE public.weekly_objectives
  ADD COLUMN IF NOT EXISTS status public.objective_status NOT NULL DEFAULT 'not_started';

-- 3. Backfill existing rows
UPDATE public.weekly_objectives
SET status = 'done'
WHERE is_completed = true AND status <> 'done';

-- 4. Two-way sync trigger between status and is_completed.
-- Rules:
--   * If status changes -> set is_completed to (status='done')
--   * If is_completed changes and status was not also explicitly changed
--     -> set status to 'done' or back to 'not_started'
--   * On INSERT, harmonize whichever side the caller provided.
CREATE OR REPLACE FUNCTION public.sync_weekly_objective_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_completed = true AND NEW.status <> 'done' THEN
      NEW.status := 'done';
    ELSIF NEW.status = 'done' AND NEW.is_completed = false THEN
      NEW.is_completed := true;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Status was changed explicitly; mirror to is_completed
    NEW.is_completed := (NEW.status = 'done');
  ELSIF NEW.is_completed IS DISTINCT FROM OLD.is_completed THEN
    -- Only is_completed changed; mirror to status
    IF NEW.is_completed = true THEN
      NEW.status := 'done';
    ELSIF OLD.status = 'done' THEN
      -- Was done, now unchecked -> revert to not_started
      NEW.status := 'not_started';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_weekly_objective_status ON public.weekly_objectives;
CREATE TRIGGER trg_sync_weekly_objective_status
  BEFORE INSERT OR UPDATE ON public.weekly_objectives
  FOR EACH ROW EXECUTE FUNCTION public.sync_weekly_objective_status();

-- 5. Index to speed up board grouping queries
CREATE INDEX IF NOT EXISTS idx_weekly_objectives_user_week_status
  ON public.weekly_objectives (user_id, week_start, status);