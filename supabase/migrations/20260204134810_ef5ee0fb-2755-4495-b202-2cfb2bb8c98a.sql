-- Create an optimized RPC function for recording check-ins
-- This replaces 4 sequential queries with a single database call

CREATE OR REPLACE FUNCTION public.record_accountability_check_in(
  p_partnership_id uuid,
  p_message text DEFAULT NULL,
  p_reply_to_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_week_start date;
  v_check_in_id uuid;
  v_partner_id uuid;
  v_user_name text;
  v_user1_id uuid;
  v_user2_id uuid;
  v_notification_message text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get week start (Monday)
  v_week_start := date_trunc('week', CURRENT_DATE + INTERVAL '1 day')::date - INTERVAL '1 day';
  -- Simpler: just use the Monday of current week
  v_week_start := CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::int - 1);

  -- Verify user is part of this partnership
  SELECT user1_id, user2_id INTO v_user1_id, v_user2_id
  FROM accountability_partnerships
  WHERE id = p_partnership_id
    AND (user1_id = v_user_id OR user2_id = v_user_id);
  
  IF v_user1_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partnership not found or access denied');
  END IF;

  -- Determine partner ID
  v_partner_id := CASE WHEN v_user1_id = v_user_id THEN v_user2_id ELSE v_user1_id END;

  -- Get current user's name
  SELECT full_name INTO v_user_name FROM profiles WHERE id = v_user_id;
  v_user_name := COALESCE(v_user_name, 'Your accountability partner');

  -- Insert check-in
  INSERT INTO accountability_check_ins (
    partnership_id,
    initiated_by,
    week_start,
    message,
    reply_to_id
  ) VALUES (
    p_partnership_id,
    v_user_id,
    v_week_start,
    p_message,
    p_reply_to_id
  )
  RETURNING id INTO v_check_in_id;

  -- Update partnership timestamp
  UPDATE accountability_partnerships
  SET last_check_in_at = NOW()
  WHERE id = p_partnership_id;

  -- Build notification message
  v_notification_message := v_user_name || ' recorded a check-in';
  IF p_message IS NOT NULL AND p_message != '' THEN
    v_notification_message := v_notification_message || ': "' || 
      CASE WHEN length(p_message) > 50 THEN left(p_message, 50) || '...' ELSE p_message END || '"';
  END IF;

  -- Create notification for partner
  PERFORM create_notification(
    v_partner_id,
    'accountability_check_in',
    v_notification_message,
    v_user_id,
    p_partnership_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'check_in_id', v_check_in_id
  );
END;
$$;