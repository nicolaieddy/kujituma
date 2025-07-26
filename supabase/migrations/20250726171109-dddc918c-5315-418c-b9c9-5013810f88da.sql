-- Drop the old constraint first
ALTER TABLE goals DROP CONSTRAINT goals_status_check;

-- Update existing records
UPDATE goals SET status = 'not_started' WHERE status = 'coming_up';

-- Add new constraint with 'not_started' instead of 'coming_up'
ALTER TABLE goals ADD CONSTRAINT goals_status_check 
CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'deleted'::text]));

-- Update the default value
ALTER TABLE goals ALTER COLUMN status SET DEFAULT 'not_started';