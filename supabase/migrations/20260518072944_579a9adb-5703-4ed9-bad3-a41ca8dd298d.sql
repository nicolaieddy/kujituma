CREATE TABLE public.partnership_check_in_reads (
  user_id UUID NOT NULL,
  partnership_id UUID NOT NULL REFERENCES public.accountability_partnerships(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, partnership_id)
);

ALTER TABLE public.partnership_check_in_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own check-in reads"
ON public.partnership_check_in_reads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own check-in reads"
ON public.partnership_check_in_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own check-in reads"
ON public.partnership_check_in_reads
FOR UPDATE
USING (auth.uid() = user_id);

CREATE INDEX idx_partnership_check_in_reads_partnership ON public.partnership_check_in_reads(partnership_id);