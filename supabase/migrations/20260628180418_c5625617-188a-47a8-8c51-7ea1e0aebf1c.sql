
CREATE TABLE public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  message text NOT NULL,
  page_url text,
  user_agent text,
  emailed_at timestamptz,
  email_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.feedback_submissions TO authenticated;
GRANT ALL ON public.feedback_submissions TO service_role;

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback"
ON public.feedback_submissions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own feedback"
ON public.feedback_submissions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all feedback"
ON public.feedback_submissions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX feedback_submissions_created_at_idx ON public.feedback_submissions (created_at DESC);
