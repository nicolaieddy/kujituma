CREATE TABLE public.social_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  metric text NOT NULL CHECK (metric IN ('followers','posts_published')),
  start_date date NOT NULL,
  start_value numeric NOT NULL,
  target_value numeric NOT NULL,
  target_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','achieved')),
  linked_goal_id uuid NULL REFERENCES public.goals(id) ON DELETE SET NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX social_goals_one_active_per_metric
  ON public.social_goals (user_id, platform, metric)
  WHERE status = 'active';

CREATE INDEX social_goals_user_platform_idx
  ON public.social_goals (user_id, platform, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_goals TO authenticated;
GRANT ALL ON public.social_goals TO service_role;

ALTER TABLE public.social_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own social goals"
  ON public.social_goals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_social_goals_updated_at
  BEFORE UPDATE ON public.social_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();