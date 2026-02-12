
CREATE TABLE public.objective_comment_reads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  objective_id uuid REFERENCES public.weekly_objectives(id) ON DELETE CASCADE NOT NULL,
  last_read_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, objective_id)
);

CREATE INDEX idx_objective_comment_reads_user_obj ON public.objective_comment_reads(user_id, objective_id);

ALTER TABLE public.objective_comment_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reads"
  ON public.objective_comment_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own reads"
  ON public.objective_comment_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reads"
  ON public.objective_comment_reads FOR UPDATE
  USING (auth.uid() = user_id);
