-- Drop the old create_notification function without related_request_id parameter
DROP FUNCTION IF EXISTS public.create_notification(uuid, text, text, uuid, uuid, uuid);

-- Ensure we have the correct create_notification function with all parameters including related_request_id
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid, 
  _type text, 
  _message text, 
  _related_post_id uuid DEFAULT NULL::uuid, 
  _related_comment_id uuid DEFAULT NULL::uuid, 
  _triggered_by_user_id uuid DEFAULT NULL::uuid, 
  _related_request_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  notification_id UUID;
BEGIN
  -- Don't create notification if user is triggering action on their own content
  IF _user_id = _triggered_by_user_id THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO public.notifications (
    user_id, 
    type, 
    message, 
    related_post_id, 
    related_comment_id, 
    triggered_by_user_id,
    related_request_id
  )
  VALUES (
    _user_id, 
    _type, 
    _message, 
    _related_post_id, 
    _related_comment_id, 
    _triggered_by_user_id,
    _related_request_id
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;