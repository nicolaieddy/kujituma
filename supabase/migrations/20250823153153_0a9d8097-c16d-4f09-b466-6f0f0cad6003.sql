-- Change default for show_email to false (hidden by default)
ALTER TABLE public.profiles 
ALTER COLUMN show_email SET DEFAULT false;