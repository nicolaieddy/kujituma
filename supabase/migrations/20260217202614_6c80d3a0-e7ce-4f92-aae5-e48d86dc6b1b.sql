
CREATE TABLE public.objective_comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.objective_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, emoji)
);

ALTER TABLE public.objective_comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all comment reactions"
  ON public.objective_comment_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own reactions"
  ON public.objective_comment_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
  ON public.objective_comment_reactions FOR DELETE
  USING (auth.uid() = user_id);
