-- Add comment column to objective_partner_feedback
ALTER TABLE public.objective_partner_feedback
ADD COLUMN comment text;

-- Drop and recreate the notifications type check constraint to include new type
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'friend_request'::text,
    'friend_request_accepted'::text,
    'post_like'::text,
    'post_comment'::text,
    'comment_like'::text,
    'comment_added'::text,
    'post_reaction'::text,
    'accountability_partner_request'::text,
    'accountability_partner_accepted'::text,
    'accountability_check_in'::text,
    'goal_update_cheer'::text,
    'goal_update_comment'::text,
    'mention'::text,
    'partner_objective_feedback'::text
  ])
);

-- Update the notification trigger to include comment
CREATE OR REPLACE FUNCTION public.notify_objective_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  objective_owner_id uuid;
  objective_text_val text;
  partner_name text;
  feedback_message text;
BEGIN
  -- Get the objective owner and text
  SELECT wo.user_id, wo.text INTO objective_owner_id, objective_text_val
  FROM weekly_objectives wo
  WHERE wo.id = NEW.objective_id;
  
  -- Get partner name
  SELECT full_name INTO partner_name
  FROM profiles
  WHERE id = NEW.partner_id;
  
  -- Build message based on feedback type
  IF NEW.feedback_type = 'agree' THEN
    feedback_message := partner_name || ' strongly agrees with your objective: "' || 
      LEFT(objective_text_val, 50) || 
      CASE WHEN LENGTH(objective_text_val) > 50 THEN '..."' ELSE '"' END;
  ELSE
    feedback_message := partner_name || ' has a question about your objective: "' || 
      LEFT(objective_text_val, 50) || 
      CASE WHEN LENGTH(objective_text_val) > 50 THEN '..."' ELSE '"' END;
  END IF;
  
  -- Add comment if provided
  IF NEW.comment IS NOT NULL AND NEW.comment != '' THEN
    feedback_message := feedback_message || ' — "' || LEFT(NEW.comment, 100) || 
      CASE WHEN LENGTH(NEW.comment) > 100 THEN '..."' ELSE '"' END;
  END IF;
  
  -- Create notification for the objective owner
  INSERT INTO notifications (
    user_id,
    triggered_by_user_id,
    type,
    message
  ) VALUES (
    objective_owner_id,
    NEW.partner_id,
    'partner_objective_feedback',
    feedback_message
  );
  
  RETURN NEW;
END;
$$;