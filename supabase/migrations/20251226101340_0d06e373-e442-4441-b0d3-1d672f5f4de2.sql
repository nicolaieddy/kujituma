-- Add deprioritized_at timestamp column to goals table
ALTER TABLE public.goals 
ADD COLUMN deprioritized_at timestamp with time zone DEFAULT NULL;