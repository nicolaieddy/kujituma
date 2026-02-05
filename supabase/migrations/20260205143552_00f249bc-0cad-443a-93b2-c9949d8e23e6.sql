-- Phase 2: Add partnership_id to check_in_reactions for efficient server-side filtering

-- Step 1: Add the column (nullable initially for backfill)
ALTER TABLE public.check_in_reactions 
ADD COLUMN IF NOT EXISTS partnership_id uuid REFERENCES public.accountability_partnerships(id) ON DELETE CASCADE;

-- Step 2: Backfill existing rows
UPDATE public.check_in_reactions r
SET partnership_id = c.partnership_id
FROM public.accountability_check_ins c
WHERE r.check_in_id = c.id
  AND r.partnership_id IS NULL;

-- Step 3: Create trigger to auto-populate partnership_id on insert
CREATE OR REPLACE FUNCTION public.set_reaction_partnership_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Look up the partnership_id from the parent check-in
  SELECT partnership_id INTO NEW.partnership_id
  FROM public.accountability_check_ins
  WHERE id = NEW.check_in_id;
  
  IF NEW.partnership_id IS NULL THEN
    RAISE EXCEPTION 'Check-in not found for reaction';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_set_reaction_partnership_id ON public.check_in_reactions;
CREATE TRIGGER trigger_set_reaction_partnership_id
  BEFORE INSERT ON public.check_in_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_reaction_partnership_id();

-- Step 4: Make the column NOT NULL now that all rows are backfilled
ALTER TABLE public.check_in_reactions 
ALTER COLUMN partnership_id SET NOT NULL;

-- Step 5: Add index for efficient filtering by partnership
CREATE INDEX IF NOT EXISTS idx_check_in_reactions_partnership 
ON public.check_in_reactions(partnership_id, created_at DESC);