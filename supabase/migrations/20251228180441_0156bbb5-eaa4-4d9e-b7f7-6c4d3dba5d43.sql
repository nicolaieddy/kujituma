-- Add column to store the order of social links
ALTER TABLE public.profiles
ADD COLUMN social_links_order TEXT[] DEFAULT NULL;