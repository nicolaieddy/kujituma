ALTER TABLE public.training_events
  ADD COLUMN IF NOT EXISTS issue_category TEXT,
  ADD COLUMN IF NOT EXISTS body_parts JSONB NOT NULL DEFAULT '[]'::jsonb;