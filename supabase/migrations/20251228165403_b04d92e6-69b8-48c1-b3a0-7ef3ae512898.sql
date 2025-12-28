-- Add cover_photo_url column to profiles table for profile banner customization
ALTER TABLE public.profiles 
ADD COLUMN cover_photo_url text DEFAULT NULL;