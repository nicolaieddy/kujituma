-- First, update existing records
UPDATE goals SET status = 'not_started' WHERE status = 'coming_up';

-- Drop the old constraint
ALTER TABLE goals DROP CONSTRAINT goals_status_check;

-- Add new constraint with 'not_started' instead of 'coming_up'
ALTER TABLE goals ADD CONSTRAINT goals_status_check 
CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'deleted'::text]));

-- Update the default value
ALTER TABLE goals ALTER COLUMN status SET DEFAULT 'not_started';