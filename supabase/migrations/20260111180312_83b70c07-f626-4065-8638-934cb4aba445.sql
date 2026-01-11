-- Remove the unique constraint that prevents multiple check-ins per week
ALTER TABLE accountability_check_ins DROP CONSTRAINT IF EXISTS unique_check_in;