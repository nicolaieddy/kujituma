-- Create check-in reactions table
CREATE TABLE public.check_in_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_in_id UUID NOT NULL REFERENCES public.accountability_check_ins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_check_in_reaction UNIQUE (check_in_id, user_id, reaction)
);

-- Enable Row Level Security
ALTER TABLE public.check_in_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reactions on check-ins in their partnerships
CREATE POLICY "Users can view reactions on their partnership check-ins"
ON public.check_in_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.accountability_check_ins ci
    JOIN public.accountability_partnerships ap ON ci.partnership_id = ap.id
    WHERE ci.id = check_in_id
    AND (ap.user1_id = auth.uid() OR ap.user2_id = auth.uid())
    AND ap.status = 'active'
  )
);

-- Policy: Users can add reactions to check-ins in their partnerships
CREATE POLICY "Users can add reactions to their partnership check-ins"
ON public.check_in_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.accountability_check_ins ci
    JOIN public.accountability_partnerships ap ON ci.partnership_id = ap.id
    WHERE ci.id = check_in_id
    AND (ap.user1_id = auth.uid() OR ap.user2_id = auth.uid())
    AND ap.status = 'active'
  )
);

-- Policy: Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
ON public.check_in_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_check_in_reactions_check_in_id ON public.check_in_reactions(check_in_id);