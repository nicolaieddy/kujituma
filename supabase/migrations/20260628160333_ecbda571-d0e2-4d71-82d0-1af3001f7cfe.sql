
-- Enums
DO $$ BEGIN
  CREATE TYPE public.media_type AS ENUM ('Article','Video','Article + Video','Podcast','Panel / Speaking','Press Conference','Interview','Quote','Social');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.media_url_status AS ENUM ('verified','verify','needs-url','no-url','dead');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.media_status AS ENUM ('Published','Upcoming','Draft');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.media_sentiment AS ENUM ('positive','neutral','negative');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.media_source AS ENUM ('manual','google-alert','mcp-agent','import');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.media_review_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- media_mentions
CREATE TABLE public.media_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  year int GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)::int) STORED,
  title text NOT NULL,
  outlet text NOT NULL DEFAULT '',
  type public.media_type NOT NULL DEFAULT 'Article',
  url text,
  url_status public.media_url_status NOT NULL DEFAULT 'verify',
  summary text,
  tags text[] NOT NULL DEFAULT '{}',
  status public.media_status NOT NULL DEFAULT 'Published',
  sentiment public.media_sentiment,
  featured boolean NOT NULL DEFAULT false,
  source public.media_source NOT NULL DEFAULT 'manual',
  archived_url text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.media_mentions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_mentions TO authenticated;
GRANT ALL ON public.media_mentions TO service_role;

ALTER TABLE public.media_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner full access on media_mentions"
  ON public.media_mentions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can read published public mentions"
  ON public.media_mentions FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND status = 'Published');

CREATE INDEX media_mentions_user_date_idx ON public.media_mentions (user_id, date DESC);
CREATE INDEX media_mentions_user_year_idx ON public.media_mentions (user_id, year);
CREATE INDEX media_mentions_user_status_idx ON public.media_mentions (user_id, status);
CREATE INDEX media_mentions_tags_gin ON public.media_mentions USING GIN (tags);
CREATE UNIQUE INDEX media_mentions_dedupe_uidx
  ON public.media_mentions (user_id, lower(title), date, lower(outlet));

-- media_candidates
CREATE TABLE public.media_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date,
  title text NOT NULL,
  outlet text DEFAULT '',
  type public.media_type DEFAULT 'Article',
  url text,
  url_status public.media_url_status DEFAULT 'verify',
  summary text,
  tags text[] NOT NULL DEFAULT '{}',
  status public.media_status DEFAULT 'Draft',
  sentiment public.media_sentiment,
  featured boolean NOT NULL DEFAULT false,
  source public.media_source NOT NULL DEFAULT 'mcp-agent',
  archived_url text,
  raw_snippet text,
  confidence numeric,
  review_status public.media_review_status NOT NULL DEFAULT 'pending',
  approved_mention_id uuid REFERENCES public.media_mentions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_candidates TO authenticated;
GRANT ALL ON public.media_candidates TO service_role;

ALTER TABLE public.media_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner full access on media_candidates"
  ON public.media_candidates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX media_candidates_user_review_idx ON public.media_candidates (user_id, review_status, created_at DESC);

-- updated_at trigger (reuse existing function if present)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_media_mentions_updated_at
  BEFORE UPDATE ON public.media_mentions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_media_candidates_updated_at
  BEFORE UPDATE ON public.media_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
