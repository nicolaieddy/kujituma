-- Delete duplicate pending accountability partner requests (keep the earliest one)
DELETE FROM accountability_partner_requests a
USING accountability_partner_requests b
WHERE a.sender_id = b.sender_id 
  AND a.receiver_id = b.receiver_id
  AND a.status = 'pending'
  AND b.status = 'pending'
  AND a.created_at > b.created_at;

-- Update the function to check for existing pending requests
CREATE OR REPLACE FUNCTION public.send_accountability_partner_request(
  _receiver_id UUID,
  _message TEXT DEFAULT '',
  _sender_can_view_receiver_goals BOOLEAN DEFAULT TRUE,
  _receiver_can_view_sender_goals BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Check if already accountability partners
  IF EXISTS (
    SELECT 1 FROM accountability_partnerships
    WHERE (user1_id = LEAST(auth.uid(), _receiver_id) AND user2_id = GREATEST(auth.uid(), _receiver_id))
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Already accountability partners';
  END IF;
  
  -- Check for existing pending request (in either direction)
  IF EXISTS (
    SELECT 1 FROM accountability_partner_requests
    WHERE status = 'pending'
    AND (
      (sender_id = auth.uid() AND receiver_id = _receiver_id)
      OR (sender_id = _receiver_id AND receiver_id = auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'A pending partner request already exists';
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