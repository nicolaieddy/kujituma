
-- Enums
DO $$ BEGIN
  CREATE TYPE public.social_status AS ENUM ('idea','drafting','in_review','ready','scheduled','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.social_platform AS ENUM ('linkedin','x','instagram','tiktok');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.social_trust_check AS ENUM ('passes','needs_work','not_checked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) Per-platform settings
CREATE TABLE public.social_platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform public.social_platform NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  follower_target integer,
  target_deadline date,
  current_followers_cached integer,
  pillars text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_platform_settings TO authenticated;
GRANT ALL ON public.social_platform_settings TO service_role;
ALTER TABLE public.social_platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own platform settings"
  ON public.social_platform_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2) Posts
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  body text,
  status public.social_status NOT NULL DEFAULT 'idea',
  platforms public.social_platform[] NOT NULL DEFAULT '{}',
  pillars text[] NOT NULL DEFAULT '{}',
  publish_date date,
  live_url text,
  media text[] NOT NULL DEFAULT '{}',
  trust_check public.social_trust_check NOT NULL DEFAULT 'not_checked',
  hold boolean NOT NULL DEFAULT false,
  reviewer_id uuid,
  review_notes text,
  retro text,
  goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;
CREATE INDEX idx_social_posts_user_status ON public.social_posts(user_id, status);
CREATE INDEX idx_social_posts_user_publish_date ON public.social_posts(user_id, publish_date);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own social posts"
  ON public.social_posts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) Per-post metrics snapshots
CREATE TABLE public.social_post_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  metrics_as_of date NOT NULL,
  impressions integer,
  reactions integer,
  comments integer,
  reposts integer,
  reach integer,
  profile_views integer,
  followers_gained integer,
  saves integer,
  sends integer,
  link_clicks integer,
  engagement_rate numeric GENERATED ALWAYS AS (
    (COALESCE(reactions,0) + COALESCE(comments,0) + COALESCE(reposts,0))::numeric
    / NULLIF(impressions, 0)
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, metrics_as_of, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_post_metrics TO authenticated;
GRANT ALL ON public.social_post_metrics TO service_role;
CREATE INDEX idx_social_post_metrics_post ON public.social_post_metrics(post_id, metrics_as_of DESC);
ALTER TABLE public.social_post_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own post metrics"
  ON public.social_post_metrics FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) Follower growth log
CREATE TABLE public.social_follower_growth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform public.social_platform NOT NULL,
  date date NOT NULL,
  total_followers integer NOT NULL,
  net_new integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_follower_growth TO authenticated;
GRANT ALL ON public.social_follower_growth TO service_role;
CREATE INDEX idx_social_follower_growth_user_platform_date
  ON public.social_follower_growth(user_id, platform, date);
ALTER TABLE public.social_follower_growth ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own follower growth"
  ON public.social_follower_growth FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5) Post ↔ values alignment
CREATE TABLE public.social_post_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  value_id uuid NOT NULL REFERENCES public.user_values(id) ON DELETE CASCADE,
  weight smallint NOT NULL DEFAULT 3 CHECK (weight BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, value_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_post_values TO authenticated;
GRANT ALL ON public.social_post_values TO service_role;
ALTER TABLE public.social_post_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own post values"
  ON public.social_post_values FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at triggers
CREATE TRIGGER trg_social_platform_settings_updated_at
  BEFORE UPDATE ON public.social_platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: compute net_new on follower growth insert/update
CREATE OR REPLACE FUNCTION public.compute_social_follower_net_new()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_total integer;
BEGIN
  SELECT total_followers INTO prev_total
  FROM public.social_follower_growth
  WHERE user_id = NEW.user_id
    AND platform = NEW.platform
    AND date < NEW.date
  ORDER BY date DESC
  LIMIT 1;

  IF prev_total IS NULL THEN
    NEW.net_new := NULL;
  ELSE
    NEW.net_new := NEW.total_followers - prev_total;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_social_follower_growth_net_new
  BEFORE INSERT OR UPDATE OF total_followers, date
  ON public.social_follower_growth
  FOR EACH ROW EXECUTE FUNCTION public.compute_social_follower_net_new();

-- Trigger: when a metrics row is logged on a post with a live_url, auto-publish.
CREATE OR REPLACE FUNCTION public.social_auto_publish_on_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.social_posts p
  SET
    status = CASE WHEN p.status <> 'published' AND p.live_url IS NOT NULL AND p.live_url <> ''
                  THEN 'published'::public.social_status
                  ELSE p.status END,
    publish_date = COALESCE(p.publish_date, NEW.metrics_as_of)
  WHERE p.id = NEW.post_id
    AND p.user_id = NEW.user_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_social_auto_publish_on_metrics
  AFTER INSERT ON public.social_post_metrics
  FOR EACH ROW EXECUTE FUNCTION public.social_auto_publish_on_metrics();

-- Latest-snapshot view
CREATE OR REPLACE VIEW public.social_post_latest_metrics AS
SELECT DISTINCT ON (post_id, platform)
  id, user_id, post_id, platform, metrics_as_of,
  impressions, reactions, comments, reposts, reach,
  profile_views, followers_gained, saves, sends, link_clicks,
  engagement_rate, created_at
FROM public.social_post_metrics
ORDER BY post_id, platform, metrics_as_of DESC, created_at DESC;

GRANT SELECT ON public.social_post_latest_metrics TO authenticated;
GRANT SELECT ON public.social_post_latest_metrics TO service_role;
