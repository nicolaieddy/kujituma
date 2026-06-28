
CREATE TABLE public.user_nav_preferences (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  module_order TEXT[] NOT NULL DEFAULT '{}',
  module_pinned TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_nav_preferences TO authenticated;
GRANT ALL ON public.user_nav_preferences TO service_role;
ALTER TABLE public.user_nav_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own nav prefs"
  ON public.user_nav_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
