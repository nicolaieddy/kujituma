-- Add email visibility control to profiles table
ALTER TABLE public.profiles 
ADD COLUMN show_email boolean NOT NULL DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.show_email IS 'Controls whether the user email is visible to other users';