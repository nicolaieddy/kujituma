-- Drop the existing foreign key constraint on related_request_id if it exists
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_related_request_id_fkey;

-- The related_request_id can reference either friend_requests or accountability_partner_requests
-- Since we can't have a single foreign key to multiple tables, we'll remove the constraint
-- and rely on application logic to ensure data integrity