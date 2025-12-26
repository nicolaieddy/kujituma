-- Drop the old constraint and add a new one with all valid recurrence frequencies
ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_recurrence_frequency_check;

ALTER TABLE public.goals ADD CONSTRAINT goals_recurrence_frequency_check 
CHECK (recurrence_frequency IS NULL OR recurrence_frequency = ANY (ARRAY[
  'daily'::text, 
  'weekdays'::text, 
  'weekly'::text, 
  'biweekly'::text, 
  'monthly'::text, 
  'monthly_last_week'::text, 
  'quarterly'::text
]));