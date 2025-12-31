-- Add visibility setting columns to partner requests
ALTER TABLE public.accountability_partner_requests
ADD COLUMN IF NOT EXISTS sender_can_view_receiver_goals boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS receiver_can_view_sender_goals boolean NOT NULL DEFAULT true;

-- Drop and recreate the send_accountability_partner_request function to accept visibility settings
DROP FUNCTION IF EXISTS public.send_accountability_partner_request(uuid, text);

CREATE OR REPLACE FUNCTION public.send_accountability_partner_request(
  _receiver_id uuid, 
  _message text,
  _sender_can_view_receiver_goals boolean DEFAULT true,
  _receiver_can_view_sender_goals boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_id UUID;
  sender_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;
  
  IF auth.uid() = _receiver_id THEN
    RAISE EXCEPTION 'Cannot partner with yourself';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM accountability_partnerships
    WHERE (user1_id = LEAST(auth.uid(), _receiver_id) AND user2_id = GREATEST(auth.uid(), _receiver_id))
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Already accountability partners';
  END IF;
  
  IF NOT are_friends(auth.uid(), _receiver_id) THEN
    RAISE EXCEPTION 'Must be friends to become accountability partners';
  END IF;
  
  INSERT INTO accountability_partner_requests (
    sender_id, 
    receiver_id, 
    message,
    sender_can_view_receiver_goals,
    receiver_can_view_sender_goals
  )
  VALUES (
    auth.uid(), 
    _receiver_id, 
    _message,
    _sender_can_view_receiver_goals,
    _receiver_can_view_sender_goals
  )
  RETURNING id INTO request_id;
  
  SELECT full_name INTO sender_name FROM profiles WHERE id = auth.uid();
  PERFORM create_notification(
    _receiver_id,
    'accountability_partner_request',
    COALESCE(sender_name, 'Someone') || ' wants to be your accountability partner',
    NULL,
    NULL,
    auth.uid(),
    request_id
  );
  
  RETURN request_id;
END;
$$;

-- Update respond function to use the visibility settings from the request
DROP FUNCTION IF EXISTS public.respond_to_accountability_partner_request(uuid, text);

CREATE OR REPLACE FUNCTION public.respond_to_accountability_partner_request(_request_id uuid, _response text)
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
        THEN COALESCE(request_record.sender_can_view_receiver_goals, true)
        ELSE COALESCE(request_record.receiver_can_view_sender_goals, true)
      END,
      CASE WHEN is_sender_user1 
        THEN COALESCE(request_record.receiver_can_view_sender_goals, true)
        ELSE COALESCE(request_record.sender_can_view_receiver_goals, true)
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