-- Function to normalize any date to the Monday of its week (local logic)
CREATE OR REPLACE FUNCTION public.normalize_to_monday(d date)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT d - ((extract(dow from d)::int + 6) % 7)::int;
$$;

-- =============================================
-- PHASE 1: Normalize weekly_objectives
-- =============================================

-- First, merge duplicate objectives that would collide after normalization
-- For each (user_id, normalized_week, text) group, keep the one with is_completed=true if any, else keep the earliest
WITH normalized AS (
  SELECT 
    id,
    user_id,
    text,
    week_start,
    normalize_to_monday(week_start) as monday_week,
    is_completed,
    goal_id,
    order_index,
    scheduled_day,
    scheduled_time,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, normalize_to_monday(week_start), text
      ORDER BY is_completed DESC, created_at ASC
    ) as rn
  FROM weekly_objectives
),
duplicates_to_delete AS (
  SELECT id FROM normalized WHERE rn > 1
)
DELETE FROM weekly_objectives WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Now update the remaining rows to use Monday week_start
UPDATE weekly_objectives
SET week_start = normalize_to_monday(week_start)
WHERE extract(dow from week_start) != 1;

-- =============================================
-- PHASE 2: Normalize weekly_progress_posts
-- =============================================

-- Merge duplicates for weekly_progress_posts
WITH normalized AS (
  SELECT 
    id,
    user_id,
    week_start,
    normalize_to_monday(week_start) as monday_week,
    is_completed,
    completed_at,
    notes,
    incomplete_reflections,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, normalize_to_monday(week_start)
      ORDER BY is_completed DESC, completed_at DESC NULLS LAST, created_at ASC
    ) as rn
  FROM weekly_progress_posts
),
duplicates_to_delete AS (
  SELECT id FROM normalized WHERE rn > 1
)
DELETE FROM weekly_progress_posts WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Now update the remaining rows
UPDATE weekly_progress_posts
SET week_start = normalize_to_monday(week_start)
WHERE extract(dow from week_start) != 1;

-- =============================================
-- PHASE 3: Normalize posts table (week_start nullable)
-- =============================================
UPDATE posts
SET week_start = normalize_to_monday(week_start)
WHERE week_start IS NOT NULL AND extract(dow from week_start) != 1;

-- =============================================
-- PHASE 4: Normalize goal_updates table
-- =============================================
UPDATE goal_updates
SET week_start = normalize_to_monday(week_start)
WHERE week_start IS NOT NULL AND extract(dow from week_start) != 1;

-- =============================================
-- PHASE 5: Normalize accountability_check_ins
-- =============================================
UPDATE accountability_check_ins
SET week_start = normalize_to_monday(week_start)
WHERE extract(dow from week_start) != 1;

-- =============================================
-- PHASE 6: Normalize public_commitments
-- =============================================
UPDATE public_commitments
SET week_start = normalize_to_monday(week_start)
WHERE extract(dow from week_start) != 1;

-- =============================================
-- PHASE 7: Normalize carry_over_logs
-- =============================================
UPDATE carry_over_logs
SET 
  source_week_start = normalize_to_monday(source_week_start),
  target_week_start = normalize_to_monday(target_week_start)
WHERE extract(dow from source_week_start) != 1 OR extract(dow from target_week_start) != 1;

-- =============================================
-- PHASE 8: Add triggers to prevent future non-Monday week_start values
-- =============================================

-- Trigger function to normalize week_start before insert/update
CREATE OR REPLACE FUNCTION public.normalize_week_start_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.week_start IS NOT NULL THEN
    NEW.week_start := normalize_to_monday(NEW.week_start);
  END IF;
  RETURN NEW;
END;
$$;

-- Apply triggers to all relevant tables
DROP TRIGGER IF EXISTS normalize_week_start_weekly_objectives ON weekly_objectives;
CREATE TRIGGER normalize_week_start_weekly_objectives
  BEFORE INSERT OR UPDATE ON weekly_objectives
  FOR EACH ROW
  EXECUTE FUNCTION normalize_week_start_trigger();

DROP TRIGGER IF EXISTS normalize_week_start_weekly_progress_posts ON weekly_progress_posts;
CREATE TRIGGER normalize_week_start_weekly_progress_posts
  BEFORE INSERT OR UPDATE ON weekly_progress_posts
  FOR EACH ROW
  EXECUTE FUNCTION normalize_week_start_trigger();

DROP TRIGGER IF EXISTS normalize_week_start_posts ON posts;
CREATE TRIGGER normalize_week_start_posts
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION normalize_week_start_trigger();

DROP TRIGGER IF EXISTS normalize_week_start_goal_updates ON goal_updates;
CREATE TRIGGER normalize_week_start_goal_updates
  BEFORE INSERT OR UPDATE ON goal_updates
  FOR EACH ROW
  EXECUTE FUNCTION normalize_week_start_trigger();

DROP TRIGGER IF EXISTS normalize_week_start_accountability_check_ins ON accountability_check_ins;
CREATE TRIGGER normalize_week_start_accountability_check_ins
  BEFORE INSERT OR UPDATE ON accountability_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION normalize_week_start_trigger();

DROP TRIGGER IF EXISTS normalize_week_start_public_commitments ON public_commitments;
CREATE TRIGGER normalize_week_start_public_commitments
  BEFORE INSERT OR UPDATE ON public_commitments
  FOR EACH ROW
  EXECUTE FUNCTION normalize_week_start_trigger();

DROP TRIGGER IF EXISTS normalize_week_start_carry_over_logs ON carry_over_logs;
CREATE TRIGGER normalize_week_start_carry_over_logs
  BEFORE INSERT OR UPDATE ON carry_over_logs
  FOR EACH ROW
  EXECUTE FUNCTION normalize_week_start_trigger();