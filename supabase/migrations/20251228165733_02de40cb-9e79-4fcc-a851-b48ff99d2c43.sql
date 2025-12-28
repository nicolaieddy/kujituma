-- Add cover photo position column for repositioning
ALTER TABLE public.profiles 
ADD COLUMN cover_photo_position integer DEFAULT 50;