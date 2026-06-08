
-- Create training_plan_imports table to log every coach plan import with source notes, dates, and attachment paths
CREATE TABLE IF NOT EXISTS public.training_plan_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('text','image','document')),
  source_text text,
  source_file_path text,
  source_file_name text,
  source_mime text,
  parsed_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  field_mapping_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  workout_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_plan_imports TO authenticated;
GRANT ALL ON public.training_plan_imports TO service_role;

ALTER TABLE public.training_plan_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own coach plan imports"
ON public.training_plan_imports
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tpi_user_week ON public.training_plan_imports(user_id, week_start);

-- Link workouts to their originating import
ALTER TABLE public.training_plan_workouts
  ADD COLUMN IF NOT EXISTS source_import_id uuid REFERENCES public.training_plan_imports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tpw_source_import ON public.training_plan_workouts(source_import_id);

-- updated_at trigger
CREATE TRIGGER set_tpi_updated_at
BEFORE UPDATE ON public.training_plan_imports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for the coach-plans bucket (created via storage tool)
CREATE POLICY "Coach plan owners read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'coach-plans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Coach plan owners write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'coach-plans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Coach plan owners update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'coach-plans' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Coach plan owners delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'coach-plans' AND auth.uid()::text = (storage.foldername(name))[1]);
