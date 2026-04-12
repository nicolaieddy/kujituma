-- Link the FIT-uploaded activity for Mon Apr 6 to its workout
UPDATE public.training_plan_workouts 
SET matched_activity_id = 'dfd9364c-8b93-446b-8e19-adf5e3be5492'
WHERE id = '54df13ca-1c99-4707-9f73-7ed1c5a42185';

-- Link the FIT-uploaded activity for Thu Apr 9 to its workout
UPDATE public.training_plan_workouts 
SET matched_activity_id = '13de04fb-3bc4-43c6-bbb6-434421837e7e'
WHERE id = 'bb1637dc-8a9a-4335-80c3-3e49e663adbb';