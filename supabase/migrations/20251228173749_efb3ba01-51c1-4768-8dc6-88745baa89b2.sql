-- Add new social link columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS youtube_url text DEFAULT ''::text,
ADD COLUMN IF NOT EXISTS email_contact text DEFAULT ''::text,
ADD COLUMN IF NOT EXISTS website_url text DEFAULT ''::text,
ADD COLUMN IF NOT EXISTS github_url text DEFAULT ''::text,
ADD COLUMN IF NOT EXISTS snapchat_url text DEFAULT ''::text,
ADD COLUMN IF NOT EXISTS medium_url text DEFAULT ''::text,
ADD COLUMN IF NOT EXISTS substack_url text DEFAULT ''::text,
ADD COLUMN IF NOT EXISTS whatsapp_url text DEFAULT ''::text,
ADD COLUMN IF NOT EXISTS telegram_url text DEFAULT ''::text,
ADD COLUMN IF NOT EXISTS signal_url text DEFAULT ''::text,
ADD COLUMN IF NOT EXISTS phone_number text DEFAULT ''::text;