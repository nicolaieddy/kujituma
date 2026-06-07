
-- Body measurements ----------------------------------------------------------
CREATE TABLE public.body_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_on DATE NOT NULL,
  weight_kg NUMERIC(6,2),
  body_fat_pct NUMERIC(5,2),
  lean_mass_kg NUMERIC(6,2),
  waist_cm NUMERIC(6,2),
  resting_hr INTEGER,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;
GRANT ALL ON public.body_measurements TO service_role;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own body measurements"
  ON public.body_measurements FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_body_measurements_user_date ON public.body_measurements(user_id, measured_on DESC);

-- Lab panels -----------------------------------------------------------------
CREATE TABLE public.lab_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taken_on DATE NOT NULL,
  panel_name TEXT NOT NULL,
  lab_provider TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_results TO authenticated;
GRANT ALL ON public.lab_results TO service_role;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lab results"
  ON public.lab_results FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_lab_results_user_date ON public.lab_results(user_id, taken_on DESC);

-- Lab marker values ----------------------------------------------------------
CREATE TABLE public.lab_result_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_result_id UUID NOT NULL REFERENCES public.lab_results(id) ON DELETE CASCADE,
  marker_key TEXT NOT NULL,
  marker_label TEXT NOT NULL,
  value_numeric NUMERIC,
  value_text TEXT,
  unit TEXT,
  reference_low NUMERIC,
  reference_high NUMERIC,
  flag TEXT, -- low / high / normal / null
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_result_values TO authenticated;
GRANT ALL ON public.lab_result_values TO service_role;
ALTER TABLE public.lab_result_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lab marker values"
  ON public.lab_result_values FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_results lr
      WHERE lr.id = lab_result_id AND lr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lab_results lr
      WHERE lr.id = lab_result_id AND lr.user_id = auth.uid()
    )
  );
CREATE INDEX idx_lab_result_values_panel ON public.lab_result_values(lab_result_id);
CREATE INDEX idx_lab_result_values_marker ON public.lab_result_values(marker_key);

-- Supplements ----------------------------------------------------------------
CREATE TABLE public.supplements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dose NUMERIC,
  dose_unit TEXT,
  schedule TEXT NOT NULL DEFAULT 'daily', -- daily | weekdays | custom
  schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_on DATE,
  archived_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplements TO authenticated;
GRANT ALL ON public.supplements TO service_role;
ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own supplements"
  ON public.supplements FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Supplement logs ------------------------------------------------------------
CREATE TABLE public.supplement_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplement_id UUID NOT NULL REFERENCES public.supplements(id) ON DELETE CASCADE,
  taken_on DATE NOT NULL,
  taken BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplement_id, taken_on)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplement_logs TO authenticated;
GRANT ALL ON public.supplement_logs TO service_role;
ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own supplement logs"
  ON public.supplement_logs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_supplement_logs_user_date ON public.supplement_logs(user_id, taken_on DESC);

-- update_updated_at triggers --------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_body_measurements_updated_at BEFORE UPDATE ON public.body_measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_lab_results_updated_at BEFORE UPDATE ON public.lab_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_lab_result_values_updated_at BEFORE UPDATE ON public.lab_result_values
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_supplements_updated_at BEFORE UPDATE ON public.supplements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
CREATE TRIGGER trg_supplement_logs_updated_at BEFORE UPDATE ON public.supplement_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
