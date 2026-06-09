
GRANT INSERT ON public.sync_run_logs TO authenticated;

CREATE POLICY "Users insert their own sync logs"
  ON public.sync_run_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
