-- Enable realtime for weekly_objectives table
-- Set REPLICA IDENTITY FULL to capture complete row data for updates
ALTER TABLE public.weekly_objectives REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_objectives;