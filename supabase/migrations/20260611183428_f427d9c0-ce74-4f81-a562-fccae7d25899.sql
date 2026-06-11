CREATE TYPE public.training_event_type AS ENUM ('injury_illness', 'race', 'other');

CREATE TABLE public.training_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type public.training_event_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  severity SMALLINT CHECK (severity IS NULL OR (severity BETWEEN 1 AND 5)),
  body_part TEXT,
  race_distance TEXT,
  race_result TEXT,
  race_priority TEXT CHECK (race_priority IS NULL OR race_priority IN ('A','B','C')),
  location TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_events TO authenticated;
GRANT ALL ON public.training_events TO service_role;

ALTER TABLE public.training_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own training events"
  ON public.training_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_training_events_user_date ON public.training_events (user_id, start_date DESC);
CREATE INDEX idx_training_events_user_type ON public.training_events (user_id, event_type);

CREATE TRIGGER update_training_events_updated_at
  BEFORE UPDATE ON public.training_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();