
CREATE TABLE public.training_event_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.training_events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('fit','document','image','other','note')),
  file_path TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  synced_activity_id UUID REFERENCES public.synced_activities(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_event_attachments_event ON public.training_event_attachments(event_id);
CREATE INDEX idx_training_event_attachments_user ON public.training_event_attachments(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_event_attachments TO authenticated;
GRANT ALL ON public.training_event_attachments TO service_role;

ALTER TABLE public.training_event_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own event attachments"
  ON public.training_event_attachments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_training_event_attachments_updated_at
  BEFORE UPDATE ON public.training_event_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
