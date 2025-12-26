-- Drop the old check constraint and add updated one with 'deprioritized' status
ALTER TABLE public.goals DROP CONSTRAINT goals_status_check;

ALTER TABLE public.goals ADD CONSTRAINT goals_status_check 
  CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'deleted'::text, 'deprioritized'::text]));