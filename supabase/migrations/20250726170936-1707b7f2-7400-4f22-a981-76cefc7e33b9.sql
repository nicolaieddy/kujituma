-- Update the default status value and existing records
UPDATE goals SET status = 'not_started' WHERE status = 'coming_up';

-- Update the default value for new goals
ALTER TABLE goals ALTER COLUMN status SET DEFAULT 'not_started';