-- Enable RLS on post_likes table if not already enabled
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view all post likes
CREATE POLICY "Post likes are viewable by everyone" 
ON public.post_likes 
FOR SELECT 
USING (true);

-- Create policy to allow authenticated users to insert their own likes
CREATE POLICY "Users can create their own post likes" 
ON public.post_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own likes
CREATE POLICY "Users can delete their own post likes" 
ON public.post_likes 
FOR DELETE 
USING (auth.uid() = user_id);