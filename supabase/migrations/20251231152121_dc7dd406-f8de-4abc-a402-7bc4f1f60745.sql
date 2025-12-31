-- Create table to track visibility setting changes
CREATE TABLE public.partnership_visibility_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.accountability_partnerships(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  field_changed TEXT NOT NULL,
  old_value BOOLEAN,
  new_value BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partnership_visibility_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view history for their own partnerships
CREATE POLICY "Users can view their partnership history"
ON public.partnership_visibility_history
FOR SELECT
USING (
  partnership_id IN (
    SELECT id FROM accountability_partnerships
    WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  )
);

-- Policy: System can insert history records
CREATE POLICY "System can insert history"
ON public.partnership_visibility_history
FOR INSERT
WITH CHECK (true);

-- Create function to track visibility changes
CREATE OR REPLACE FUNCTION public.track_partnership_visibility_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Track user1_can_view_user2_goals changes
  IF OLD.user1_can_view_user2_goals IS DISTINCT FROM NEW.user1_can_view_user2_goals THEN
    INSERT INTO partnership_visibility_history (partnership_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'user1_can_view_user2_goals', OLD.user1_can_view_user2_goals, NEW.user1_can_view_user2_goals);
  END IF;
  
  -- Track user2_can_view_user1_goals changes
  IF OLD.user2_can_view_user1_goals IS DISTINCT FROM NEW.user2_can_view_user1_goals THEN
    INSERT INTO partnership_visibility_history (partnership_id, changed_by, field_changed, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'user2_can_view_user1_goals', OLD.user2_can_view_user1_goals, NEW.user2_can_view_user1_goals);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER track_visibility_changes
AFTER UPDATE ON public.accountability_partnerships
FOR EACH ROW
EXECUTE FUNCTION public.track_partnership_visibility_change();

-- Create index for faster lookups
CREATE INDEX idx_visibility_history_partnership ON public.partnership_visibility_history(partnership_id);
CREATE INDEX idx_visibility_history_created_at ON public.partnership_visibility_history(created_at DESC);