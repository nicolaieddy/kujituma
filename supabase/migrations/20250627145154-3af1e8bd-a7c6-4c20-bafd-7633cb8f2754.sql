
-- Create an enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table to manage admin access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Add a hidden field to posts for admin management
ALTER TABLE public.posts ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- Update posts RLS policies to exclude hidden posts for regular users
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
CREATE POLICY "Users can view non-hidden posts"
  ON public.posts
  FOR SELECT
  USING (NOT hidden OR public.has_role(auth.uid(), 'admin'));

-- Allow admins to update posts (for hiding/showing)
CREATE POLICY "Admins can update posts"
  ON public.posts
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete posts
CREATE POLICY "Admins can delete posts"
  ON public.posts
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert your user as an admin (replace with your actual user ID)
-- You can find your user ID in the Supabase Auth dashboard
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('your-user-id-here', 'admin');
