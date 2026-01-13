-- Create a function to notify objective owner when partner gives feedback
CREATE OR REPLACE FUNCTION public.notify_objective_feedback()
RETURNS TRIGGER AS $$
DECLARE
  objective_owner_id UUID;
  objective_text TEXT;
  partner_name TEXT;
  feedback_message TEXT;
BEGIN
  -- Get the objective owner and text
  SELECT user_id, text INTO objective_owner_id, objective_text
  FROM public.weekly_objectives
  WHERE id = NEW.objective_id;
  
  -- Get the partner's name
  SELECT full_name INTO partner_name
  FROM public.profiles
  WHERE id = NEW.partner_id;
  
  -- Don't notify yourself
  IF objective_owner_id = NEW.partner_id THEN
    RETURN NEW;
  END IF;
  
  -- Build the message based on feedback type
  IF NEW.feedback_type = 'agree' THEN
    feedback_message := partner_name || ' strongly agrees with your objective: "' || LEFT(objective_text, 50) || CASE WHEN LENGTH(objective_text) > 50 THEN '..."' ELSE '"' END;
  ELSE
    feedback_message := partner_name || ' has a question about your objective: "' || LEFT(objective_text, 50) || CASE WHEN LENGTH(objective_text) > 50 THEN '..."' ELSE '"' END;
  END IF;
  
  -- Create notification
  INSERT INTO public.notifications (
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on objective_partner_feedback table
DROP TRIGGER IF EXISTS on_objective_feedback_notify ON public.objective_partner_feedback;
CREATE TRIGGER on_objective_feedback_notify
  AFTER INSERT ON public.objective_partner_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_objective_feedback();