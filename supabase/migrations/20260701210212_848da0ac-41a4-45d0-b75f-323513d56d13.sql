ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS media_focus text;

ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_media_type_check
    CHECK (media_type IS NULL OR media_type IN ('none','photo','video','carousel','graphic'));

ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_media_focus_check
    CHECK (media_focus IS NULL OR media_focus IN ('self','flyer','product','team','other'));