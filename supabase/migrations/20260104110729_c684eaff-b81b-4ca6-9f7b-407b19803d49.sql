-- Persist carry-over decisions per goal/year
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS carry_over_resolved_year integer;

CREATE INDEX IF NOT EXISTS idx_goals_user_carryover_year
ON public.goals (user_id, carry_over_resolved_year);

COMMENT ON COLUMN public.goals.carry_over_resolved_year IS 'Year in which the user resolved the carry-over prompt for this goal (e.g., 2026).';
