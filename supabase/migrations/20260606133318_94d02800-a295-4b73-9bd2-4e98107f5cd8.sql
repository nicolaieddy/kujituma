
-- Enums
CREATE TYPE public.value_visibility AS ENUM ('private', 'public');
CREATE TYPE public.goal_value_link_source AS ENUM ('ai', 'user');

-- user_values
CREATE TABLE public.user_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  statement text NOT NULL DEFAULT '',
  feeling text,
  visibility public.value_visibility NOT NULL DEFAULT 'private',
  order_index integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_values_user_id_idx ON public.user_values(user_id);

GRANT SELECT ON public.user_values TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_values TO authenticated;
GRANT ALL ON public.user_values TO service_role;

ALTER TABLE public.user_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own values"
ON public.user_values FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public values are viewable"
ON public.user_values FOR SELECT
USING (visibility = 'public' AND is_archived = false);

-- goal_value_links
CREATE TABLE public.goal_value_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  value_id uuid NOT NULL REFERENCES public.user_values(id) ON DELETE CASCADE,
  weight smallint NOT NULL DEFAULT 3 CHECK (weight BETWEEN 1 AND 5),
  source public.goal_value_link_source NOT NULL DEFAULT 'user',
  ai_confidence numeric,
  ai_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (goal_id, value_id)
);
CREATE INDEX goal_value_links_goal_idx ON public.goal_value_links(goal_id);
CREATE INDEX goal_value_links_value_idx ON public.goal_value_links(value_id);
CREATE INDEX goal_value_links_user_idx ON public.goal_value_links(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_value_links TO authenticated;
GRANT ALL ON public.goal_value_links TO service_role;

ALTER TABLE public.goal_value_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goal value links"
ON public.goal_value_links FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- updated_at triggers (reuse existing function)
CREATE TRIGGER user_values_updated_at
BEFORE UPDATE ON public.user_values
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER goal_value_links_updated_at
BEFORE UPDATE ON public.goal_value_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Alignment view: score = round((sum(weight) / (5 * total_active_values)) * 100)
CREATE OR REPLACE VIEW public.goal_values_alignment
WITH (security_invoker = true) AS
SELECT
  g.id AS goal_id,
  g.user_id,
  COALESCE(SUM(l.weight), 0)::int AS weight_sum,
  COUNT(l.id)::int AS linked_count,
  (
    SELECT COUNT(*)::int
    FROM public.user_values uv
    WHERE uv.user_id = g.user_id AND uv.is_archived = false
  ) AS total_values,
  CASE
    WHEN (
      SELECT COUNT(*) FROM public.user_values uv
      WHERE uv.user_id = g.user_id AND uv.is_archived = false
    ) = 0 THEN 0
    ELSE ROUND(
      (COALESCE(SUM(l.weight), 0)::numeric
        / (5 * (SELECT COUNT(*) FROM public.user_values uv
                WHERE uv.user_id = g.user_id AND uv.is_archived = false))
      ) * 100
    )::int
  END AS score
FROM public.goals g
LEFT JOIN public.goal_value_links l ON l.goal_id = g.id
GROUP BY g.id, g.user_id;

GRANT SELECT ON public.goal_values_alignment TO authenticated;
GRANT SELECT ON public.goal_values_alignment TO service_role;
