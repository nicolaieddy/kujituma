-- Add country and city columns to profiles table (private fields)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS city text;