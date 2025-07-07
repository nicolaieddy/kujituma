-- Create user tours table to track onboarding progress
CREATE TABLE public.user_tours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tour_type TEXT NOT NULL DEFAULT 'onboarding',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  current_step INTEGER NOT NULL DEFAULT 0,
  dismissed_at TIMESTAMP WITH TIME ZONE NULL,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tour_type)
);

-- Enable Row Level Security
ALTER TABLE public.user_tours ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own tours" 
ON public.user_tours 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tours" 
ON public.user_tours 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tours" 
ON public.user_tours 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all tours" 
ON public.user_tours 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all tours" 
ON public.user_tours 
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_user_tours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_tours_updated_at
BEFORE UPDATE ON public.user_tours
FOR EACH ROW
EXECUTE FUNCTION public.update_user_tours_updated_at();