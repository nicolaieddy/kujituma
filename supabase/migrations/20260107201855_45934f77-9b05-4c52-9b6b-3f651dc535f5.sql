-- Enable realtime for check_in_reactions table
ALTER TABLE public.check_in_reactions REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_in_reactions;