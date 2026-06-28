
-- Add new enum values
ALTER TYPE public.media_type ADD VALUE IF NOT EXISTS 'Profile';
ALTER TYPE public.media_type ADD VALUE IF NOT EXISTS 'Event / Speaking';
ALTER TYPE public.media_source ADD VALUE IF NOT EXISTS 'web-scan';

-- Add new columns for richer tracking
ALTER TABLE public.media_mentions
  ADD COLUMN IF NOT EXISTS date_added date DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS news_announcement_group text,
  ADD COLUMN IF NOT EXISTS article_type_tag text,
  ADD COLUMN IF NOT EXISTS nicolai_mention_type text,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS last_checked date;

-- Indexes
CREATE INDEX IF NOT EXISTS media_mentions_user_date_idx
  ON public.media_mentions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS media_mentions_user_group_idx
  ON public.media_mentions (user_id, news_announcement_group);
CREATE UNIQUE INDEX IF NOT EXISTS media_mentions_user_url_uniq
  ON public.media_mentions (user_id, lower(url))
  WHERE url IS NOT NULL;
