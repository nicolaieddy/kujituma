-- Add private journal entry field to daily_check_ins
-- This field is for personal reflection and should NEVER be shared with other users
ALTER TABLE public.daily_check_ins 
ADD COLUMN journal_entry TEXT DEFAULT NULL;

-- Add a comment to document the privacy requirement
COMMENT ON COLUMN public.daily_check_ins.journal_entry IS 'Private journal entry - never share with other users. RLS already restricts access to owner only.';

-- Verify RLS is enabled and only owner can access their own check-ins
-- The existing RLS policies on daily_check_ins already ensure:
-- 1. Users can only SELECT their own check-ins (auth.uid() = user_id)
-- 2. Users can only INSERT their own check-ins (auth.uid() = user_id)
-- 3. Users can only UPDATE their own check-ins (auth.uid() = user_id)