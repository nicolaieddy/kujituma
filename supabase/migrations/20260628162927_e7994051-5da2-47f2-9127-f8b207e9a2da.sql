CREATE TABLE public.media_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  summary text,
  announcement_date date NOT NULL DEFAULT CURRENT_DATE,
  cover_url text,
  tags text[] NOT NULL DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.media_stories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_stories TO authenticated;
GRANT ALL ON public.media_stories TO service_role;

ALTER TABLE public.media_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own stories"
  ON public.media_stories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can read public stories"
  ON public.media_stories FOR SELECT
  TO anon
  USING (is_public = true);

CREATE INDEX media_stories_user_date_idx ON public.media_stories (user_id, announcement_date DESC);

CREATE TRIGGER update_media_stories_updated_at
  BEFORE UPDATE ON public.media_stories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.media_mentions
  ADD COLUMN story_id uuid REFERENCES public.media_stories(id) ON DELETE SET NULL;

CREATE INDEX media_mentions_story_idx ON public.media_mentions (story_id);
