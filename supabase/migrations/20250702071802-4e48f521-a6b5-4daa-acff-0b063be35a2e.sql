-- Enable real-time functionality for posts table
ALTER TABLE public.posts REPLICA IDENTITY FULL;

-- Add posts table to the supabase_realtime publication to enable real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- Enable real-time functionality for comments table
ALTER TABLE public.comments REPLICA IDENTITY FULL;

-- Add comments table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;