-- Add a policy to allow public goals to be visible by everyone
CREATE POLICY "Public goals are viewable by everyone" 
ON public.goals 
FOR SELECT 
USING (is_public = true);