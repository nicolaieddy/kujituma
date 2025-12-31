-- Allow senders to delete/cancel their pending requests
CREATE POLICY "Senders can delete pending requests"
ON accountability_partner_requests
FOR DELETE
USING (auth.uid() = sender_id AND status = 'pending');