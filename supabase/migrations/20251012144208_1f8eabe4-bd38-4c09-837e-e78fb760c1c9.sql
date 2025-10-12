-- Phase 1: Commitment Contracts

-- Add commitment visibility to profiles
ALTER TABLE profiles 
ADD COLUMN commitment_visibility TEXT DEFAULT 'friends' 
CHECK (commitment_visibility IN ('private', 'friends', 'public'));

-- Create public commitments table
CREATE TABLE public_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  objective_id UUID NOT NULL REFERENCES weekly_objectives(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank IN (1, 2, 3)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_commitment UNIQUE (user_id, week_start, rank),
  CONSTRAINT unique_objective_commitment UNIQUE (objective_id)
);

ALTER TABLE public_commitments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public_commitments
CREATE POLICY "Users can view their own commitments"
  ON public_commitments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Friends can view commitments"
  ON public_commitments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = user_id
      AND commitment_visibility IN ('friends', 'public')
    )
    AND (
      auth.uid() = user_id
      OR are_friends(auth.uid(), user_id)
      OR (SELECT commitment_visibility FROM profiles WHERE id = user_id) = 'public'
    )
  );

CREATE POLICY "Users can create their own commitments"
  ON public_commitments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own commitments"
  ON public_commitments FOR DELETE
  USING (auth.uid() = user_id);

-- Function: Set public commitments
CREATE OR REPLACE FUNCTION set_public_commitments(
  _week_start DATE,
  _objective_ids UUID[]
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  objective_id UUID;
  idx INTEGER;
BEGIN
  IF array_length(_objective_ids, 1) != 3 THEN
    RAISE EXCEPTION 'Must provide exactly 3 objectives';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM weekly_objectives
    WHERE id = ANY(_objective_ids)
    AND user_id != auth.uid()
  ) THEN
    RAISE EXCEPTION 'Can only commit to your own objectives';
  END IF;
  
  DELETE FROM public_commitments
  WHERE user_id = auth.uid() AND week_start = _week_start;
  
  FOR idx IN 1..3 LOOP
    INSERT INTO public_commitments (user_id, week_start, objective_id, rank)
    VALUES (auth.uid(), _objective_ids[idx], _week_start, idx);
  END LOOP;
  
  RETURN TRUE;
END;
$$;

-- Function: Get public commitments
CREATE OR REPLACE FUNCTION get_public_commitments(
  _user_id UUID,
  _week_start DATE
) RETURNS TABLE (
  id UUID,
  objective_id UUID,
  objective_text TEXT,
  is_completed BOOLEAN,
  rank INTEGER
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pc.id,
    pc.objective_id,
    wo.text as objective_text,
    wo.is_completed,
    pc.rank
  FROM public_commitments pc
  JOIN weekly_objectives wo ON wo.id = pc.objective_id
  WHERE pc.user_id = _user_id
  AND pc.week_start = _week_start
  ORDER BY pc.rank;
$$;

-- Phase 2: Accountability Partners

-- Create accountability partnerships table
CREATE TABLE accountability_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_check_in_at TIMESTAMPTZ,
  check_in_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (check_in_frequency IN ('weekly', 'biweekly')),
  CONSTRAINT different_users CHECK (user1_id < user2_id),
  CONSTRAINT unique_partnership UNIQUE (user1_id, user2_id)
);

ALTER TABLE accountability_partnerships ENABLE ROW LEVEL SECURITY;

-- Create accountability check-ins table
CREATE TABLE accountability_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES accountability_partnerships(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_check_in UNIQUE (partnership_id, week_start, initiated_by)
);

ALTER TABLE accountability_check_ins ENABLE ROW LEVEL SECURITY;

-- Create accountability partner requests table
CREATE TABLE accountability_partner_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT different_users_apr CHECK (sender_id != receiver_id)
);

ALTER TABLE accountability_partner_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accountability_partnerships
CREATE POLICY "Users can view their own partnerships"
  ON accountability_partnerships FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their own partnerships"
  ON accountability_partnerships FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create partnerships"
  ON accountability_partnerships FOR INSERT
  WITH CHECK (true);

-- RLS Policies for accountability_check_ins
CREATE POLICY "Partners can view check-ins"
  ON accountability_check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accountability_partnerships
      WHERE id = partnership_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Partners can create check-ins"
  ON accountability_check_ins FOR INSERT
  WITH CHECK (
    auth.uid() = initiated_by AND
    EXISTS (
      SELECT 1 FROM accountability_partnerships
      WHERE id = partnership_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
      AND status = 'active'
    )
  );

-- RLS Policies for accountability_partner_requests
CREATE POLICY "Users can view requests involving them"
  ON accountability_partner_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send partner requests"
  ON accountability_partner_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can update requests"
  ON accountability_partner_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Function: Send accountability partner request
CREATE OR REPLACE FUNCTION send_accountability_partner_request(
  _receiver_id UUID,
  _message TEXT
) RETURNS UUID
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
  
  INSERT INTO accountability_partner_requests (sender_id, receiver_id, message)
  VALUES (auth.uid(), _receiver_id, _message)
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

-- Function: Respond to accountability partner request
CREATE OR REPLACE FUNCTION respond_to_accountability_partner_request(
  _request_id UUID,
  _response TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_record RECORD;
  partnership_id UUID;
  responder_name TEXT;
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
    INSERT INTO accountability_partnerships (user1_id, user2_id)
    VALUES (
      LEAST(request_record.sender_id, request_record.receiver_id),
      GREATEST(request_record.sender_id, request_record.receiver_id)
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

-- Function: Get accountability partner
CREATE OR REPLACE FUNCTION get_accountability_partner()
RETURNS TABLE (
  partner_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  partnership_id UUID,
  status TEXT,
  last_check_in_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN ap.user1_id = auth.uid() THEN ap.user2_id 
      ELSE ap.user1_id 
    END as partner_id,
    p.full_name,
    p.avatar_url,
    ap.id as partnership_id,
    ap.status,
    ap.last_check_in_at
  FROM accountability_partnerships ap
  JOIN profiles p ON p.id = CASE 
    WHEN ap.user1_id = auth.uid() THEN ap.user2_id 
    ELSE ap.user1_id 
  END
  WHERE (ap.user1_id = auth.uid() OR ap.user2_id = auth.uid())
  AND ap.status = 'active'
  LIMIT 1;
$$;

-- Trigger for updating accountability_partnerships updated_at
CREATE TRIGGER update_accountability_partnerships_updated_at
  BEFORE UPDATE ON accountability_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updating accountability_partner_requests updated_at
CREATE TRIGGER update_accountability_partner_requests_updated_at
  BEFORE UPDATE ON accountability_partner_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();