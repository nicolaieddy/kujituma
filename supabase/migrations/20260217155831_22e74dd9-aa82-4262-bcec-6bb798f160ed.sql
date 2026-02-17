CREATE OR REPLACE FUNCTION public.notify_objective_feedback()
RETURNS TRIGGER AS $$
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
  
  -- Create notification for the objective owner
  INSERT INTO notifications (
    user_id,
    triggered_by_user_id,
    type,
    message,
    related_objective_id
  ) VALUES (
    objective_owner_id,
    NEW.partner_id,
    'partner_objective_feedback',
    feedback_message,
    NEW.objective_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;