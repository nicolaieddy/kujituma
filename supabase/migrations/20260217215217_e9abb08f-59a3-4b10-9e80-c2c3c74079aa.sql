
-- Add custom_answers JSONB column to daily_check_ins for storing custom question responses
ALTER TABLE public.daily_check_ins
  ADD COLUMN IF NOT EXISTS custom_answers JSONB DEFAULT '{}'::jsonb;

-- Create table for user-defined check-in questions
CREATE TABLE public.check_in_custom_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.check_in_custom_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own custom questions"
  ON public.check_in_custom_questions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_check_in_custom_questions_user_id ON public.check_in_custom_questions(user_id);
