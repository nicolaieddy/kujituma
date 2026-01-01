-- Remove the show_email column from profiles since email display functionality is removed
ALTER TABLE public.profiles DROP COLUMN IF EXISTS show_email;