-- Add date_of_birth and is_profile_complete columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS is_profile_complete boolean NOT NULL DEFAULT false;

-- Update existing profiles to mark them as complete (since they're existing users)
UPDATE public.profiles SET is_profile_complete = true WHERE is_profile_complete = false;