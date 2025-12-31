-- Update respond function to allow receiver to override visibility settings
DROP FUNCTION IF EXISTS public.respond_to_accountability_partner_request(uuid, text);

CREATE OR REPLACE FUNCTION public.respond_to_accountability_partner_request(
  _request_id uuid, 
  _response text,
  _override_sender_can_view_receiver_goals boolean DEFAULT NULL,
  _override_receiver_can_view_sender_goals boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_record RECORD;
  partnership_id UUID;
  responder_name TEXT;
  is_sender_user1 BOOLEAN;
  final_sender_can_view BOOLEAN;
  final_receiver_can_view BOOLEAN;
BEGIN
  IF _response NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Response must be "accepted" or "rejected"';
  END IF;
  
  SELECT * INTO request_record
  FROM accountability_partner_requests
  WHERE id = _request_id AND receiver_id = auth.uid() AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not authorized';
  END IF;
  
  UPDATE accountability_partner_requests
  SET status = _response, updated_at = NOW()
  WHERE id = _request_id;
  
  IF _response = 'accepted' THEN
    -- Use overrides if provided, otherwise use original request values
    final_sender_can_view := COALESCE(_override_sender_can_view_receiver_goals, request_record.sender_can_view_receiver_goals, true);
    final_receiver_can_view := COALESCE(_override_receiver_can_view_sender_goals, request_record.receiver_can_view_sender_goals, true);
    
    -- Determine if sender is user1 (sender_id < receiver_id)
    is_sender_user1 := request_record.sender_id < request_record.receiver_id;
    
    INSERT INTO accountability_partnerships (
      user1_id, 
      user2_id,
      user1_can_view_user2_goals,
      user2_can_view_user1_goals
    )
    VALUES (
      LEAST(request_record.sender_id, request_record.receiver_id),
      GREATEST(request_record.sender_id, request_record.receiver_id),
      -- Map sender/receiver visibility to user1/user2 columns
      CASE WHEN is_sender_user1 
        THEN final_sender_can_view
        ELSE final_receiver_can_view
      END,
      CASE WHEN is_sender_user1 
        THEN final_receiver_can_view
        ELSE final_sender_can_view
      END
    )
    RETURNING id INTO partnership_id;
    
    SELECT full_name INTO responder_name FROM profiles WHERE id = auth.uid();
    PERFORM create_notification(
      request_record.sender_id,
      'accountability_partner_accepted',
      COALESCE(responder_name, 'Someone') || ' accepted your accountability partner request',
      NULL,
      NULL,
      auth.uid()
    );
  END IF;
  
  RETURN TRUE;
END;
$$;