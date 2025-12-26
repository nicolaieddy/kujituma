-- Add recurring goal columns to goals table
ALTER TABLE public.goals
ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN recurrence_frequency TEXT DEFAULT 'weekly' CHECK (recurrence_frequency IN ('weekly', 'biweekly', 'monthly')),
ADD COLUMN recurring_objective_text TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN public.goals.is_recurring IS 'Whether this goal auto-generates weekly objectives';
COMMENT ON COLUMN public.goals.recurrence_frequency IS 'How often to generate objectives: weekly, biweekly, or monthly';
COMMENT ON COLUMN public.goals.recurring_objective_text IS 'Text to use for auto-generated objectives, defaults to goal title if null';