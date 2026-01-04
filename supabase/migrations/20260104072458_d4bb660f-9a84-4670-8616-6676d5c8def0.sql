-- Add AI features enabled column to profiles (default false to save costs)
ALTER TABLE public.profiles
ADD COLUMN ai_features_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.ai_features_enabled IS 'Whether AI features (suggestions, insights) are enabled for this user. Controlled by admins.';