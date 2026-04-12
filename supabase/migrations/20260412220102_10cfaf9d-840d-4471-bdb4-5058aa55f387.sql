-- Add a UUID column to directly reference synced_activities for FIT uploads
ALTER TABLE public.training_plan_workouts
ADD COLUMN matched_activity_id UUID REFERENCES public.synced_activities(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_training_plan_workouts_matched_activity_id 
ON public.training_plan_workouts(matched_activity_id) 
WHERE matched_activity_id IS NOT NULL;