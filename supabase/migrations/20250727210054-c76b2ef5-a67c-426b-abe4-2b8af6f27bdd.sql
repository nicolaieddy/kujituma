-- Add new social media fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN instagram_url TEXT DEFAULT '',
ADD COLUMN tiktok_url TEXT DEFAULT '',
ADD COLUMN twitter_url TEXT DEFAULT '';