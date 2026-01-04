-- Enable realtime for goals table
ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;

-- Enable realtime for habit_completions table
ALTER TABLE public.habit_completions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_completions;