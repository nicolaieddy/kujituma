
-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  -- Social
  in_app_post_like boolean NOT NULL DEFAULT true,
  in_app_comment_added boolean NOT NULL DEFAULT true,
  in_app_comment_like boolean NOT NULL DEFAULT true,
  in_app_mention boolean NOT NULL DEFAULT true,
  in_app_comment_reaction boolean NOT NULL DEFAULT true,
  -- Friends
  in_app_friend_request boolean NOT NULL DEFAULT true,
  in_app_friend_request_accepted boolean NOT NULL DEFAULT true,
  -- Accountability
  in_app_accountability_partner_request boolean NOT NULL DEFAULT true,
  in_app_accountability_partner_accepted boolean NOT NULL DEFAULT true,
  in_app_accountability_check_in boolean NOT NULL DEFAULT true,
  in_app_partner_objective_feedback boolean NOT NULL DEFAULT true,
  -- Goals & Community
  in_app_goal_update_cheer boolean NOT NULL DEFAULT true,
  in_app_goal_milestone boolean NOT NULL DEFAULT true,
  in_app_goal_help_request boolean NOT NULL DEFAULT true,
  in_app_goal_update_comment boolean NOT NULL DEFAULT true,
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_preferences_updated_at();
