-- Cleanup duplicate auto-created "Morning Run" workouts on 2026-06-08.
-- Move the Strava activity links onto the coach plan workout (3x10min with recovery)
-- then delete the two auto-created duplicates.

-- Move both Strava activity links onto the coach plan workout.
UPDATE public.training_workout_activities
SET workout_id = '68bc69f7-9ad3-489f-a5ba-392487f325fb',
    session_order = CASE WHEN activity_id = '19673450-dff5-4e6d-ac6d-bb5b1a3916ba' THEN 0 ELSE 1 END
WHERE workout_id IN ('ab2437b3-eab0-4317-a6ce-7f80b6cd5a29','60834e8d-4f0e-4963-92d0-6e4407f80aca');

-- Point the coach plan workout's primary matched activity to the longer run.
UPDATE public.training_plan_workouts
SET matched_strava_activity_id = 18833318576
WHERE id = '68bc69f7-9ad3-489f-a5ba-392487f325fb';

-- Delete the two auto-created duplicate workouts.
DELETE FROM public.training_plan_workouts
WHERE id IN ('ab2437b3-eab0-4317-a6ce-7f80b6cd5a29','60834e8d-4f0e-4963-92d0-6e4407f80aca');
