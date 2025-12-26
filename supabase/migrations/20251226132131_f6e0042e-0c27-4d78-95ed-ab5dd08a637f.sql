-- Add start_date column to goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS start_date DATE;