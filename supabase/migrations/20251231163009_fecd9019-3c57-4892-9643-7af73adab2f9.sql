-- Clean up stale pending requests where a partnership already exists
-- Mark them as 'accepted' since the partnership was established
UPDATE accountability_partner_requests
SET status = 'accepted', updated_at = now()
WHERE status = 'pending'
AND EXISTS (
  SELECT 1 FROM accountability_partnerships ap
  WHERE ap.status = 'active'
  AND (
    (ap.user1_id = accountability_partner_requests.sender_id AND ap.user2_id = accountability_partner_requests.receiver_id)
    OR (ap.user1_id = accountability_partner_requests.receiver_id AND ap.user2_id = accountability_partner_requests.sender_id)
  )
);

-- Create a trigger to auto-mark pending requests as accepted when a partnership is created
CREATE OR REPLACE FUNCTION cancel_pending_partner_requests()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE accountability_partner_requests
  SET status = 'accepted', updated_at = now()
  WHERE status = 'pending'
  AND (
    (sender_id = NEW.user1_id AND receiver_id = NEW.user2_id)
    OR (sender_id = NEW.user2_id AND receiver_id = NEW.user1_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_partnership_created_cancel_requests ON accountability_partnerships;

-- Create the trigger
CREATE TRIGGER on_partnership_created_cancel_requests
AFTER INSERT ON accountability_partnerships
FOR EACH ROW
EXECUTE FUNCTION cancel_pending_partner_requests();