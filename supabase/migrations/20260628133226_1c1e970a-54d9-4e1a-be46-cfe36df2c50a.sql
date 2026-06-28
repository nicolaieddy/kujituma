CREATE TABLE public.social_import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  kind TEXT NOT NULL,
  action TEXT NOT NULL,
  post_id UUID REFERENCES public.social_posts(id) ON DELETE SET NULL,
  post_url TEXT,
  file_name TEXT,
  summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_import_history TO authenticated;
GRANT ALL ON public.social_import_history TO service_role;

ALTER TABLE public.social_import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own import history"
  ON public.social_import_history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_social_import_history_user_created
  ON public.social_import_history (user_id, created_at DESC);