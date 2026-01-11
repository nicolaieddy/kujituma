-- Add check-in cadence column to accountability_partnerships
-- This allows each partner to set their own preferred check-in frequency
ALTER TABLE public.accountability_partnerships 
ADD COLUMN IF NOT EXISTS my_check_in_cadence_user1 text DEFAULT 'weekly',
ADD COLUMN IF NOT EXISTS my_check_in_cadence_user2 text DEFAULT 'weekly';

-- Add comment for clarity
COMMENT ON COLUMN public.accountability_partnerships.my_check_in_cadence_user1 IS 'Check-in cadence preference for user1 (daily, twice_weekly, weekly, biweekly)';
COMMENT ON COLUMN public.accountability_partnerships.my_check_in_cadence_user2 IS 'Check-in cadence preference for user2 (daily, twice_weekly, weekly, biweekly)';