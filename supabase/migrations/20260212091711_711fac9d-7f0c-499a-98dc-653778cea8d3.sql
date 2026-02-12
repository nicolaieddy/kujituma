
-- Add related_objective_id column to notifications
ALTER TABLE public.notifications ADD COLUMN related_objective_id uuid;

-- Update the trigger function to populate related_objective_id
CREATE OR REPLACE FUNCTION public.notify_objective_comment()
RETURNS TRIGGER AS $$
DECLARE
  objective_owner_id uuid;
  objective_text_val text;
  commenter_name text;
BEGIN
  SELECT wo.user_id, wo.text INTO objective_owner_id, objective_text_val
  FROM weekly_objectives wo WHERE wo.id = NEW.objective_id;

  SELECT full_name INTO commenter_name FROM profiles WHERE id = NEW.user_id;

  IF NEW.user_id != objective_owner_id THEN
    INSERT INTO notifications (user_id, triggered_by_user_id, type, message, related_objective_id)
    VALUES (objective_owner_id, NEW.user_id, 'partner_objective_feedback',
      commenter_name || ' commented on your objective: "' ||
      LEFT(objective_text_val, 50) ||
      CASE WHEN LENGTH(objective_text_val) > 50 THEN '..."' ELSE '"' END,
      NEW.objective_id
    );
  ELSE
    INSERT INTO notifications (user_id, triggered_by_user_id, type, message, related_objective_id)
    SELECT DISTINCT oc.user_id, NEW.user_id, 'partner_objective_feedback',
      commenter_name || ' replied on objective: "' ||
      LEFT(objective_text_val, 50) ||
      CASE WHEN LENGTH(objective_text_val) > 50 THEN '..."' ELSE '"' END,
      NEW.objective_id
    FROM objective_comments oc
    WHERE oc.objective_id = NEW.objective_id
      AND oc.user_id != NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
