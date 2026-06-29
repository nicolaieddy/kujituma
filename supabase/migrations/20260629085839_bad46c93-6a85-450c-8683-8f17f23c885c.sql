
ALTER TABLE public.feedback_submissions
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Allow admins to update feedback (mark read/unread)
DROP POLICY IF EXISTS "Admins update feedback" ON public.feedback_submissions;
CREATE POLICY "Admins update feedback"
  ON public.feedback_submissions
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
