-- Add reflection field to posts table
ALTER TABLE public.posts 
ADD COLUMN reflection text DEFAULT '';