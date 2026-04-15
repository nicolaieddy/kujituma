
-- Delete laps and streams for activities being removed
DELETE FROM activity_laps WHERE activity_id IN ('a2759c62-5022-4219-9e06-c0f3027ef88c', '52ea7860-da35-4b83-80bb-670dff701514');
DELETE FROM activity_streams WHERE activity_id IN ('a2759c62-5022-4219-9e06-c0f3027ef88c', '52ea7860-da35-4b83-80bb-670dff701514');

-- Delete junction entries for workouts being removed (none exist but be safe)
DELETE FROM training_workout_activities WHERE workout_id IN (
  '429af13a-f9c2-47ef-ac0e-6603210c34cc',
  '6d581a53-9cc9-4c56-b0d6-490473f02107',
  '9fe5c6c8-994e-4645-8672-2f0530a67d49'
);

-- Delete ghost/unplanned workouts
DELETE FROM training_plan_workouts WHERE id IN (
  '429af13a-f9c2-47ef-ac0e-6603210c34cc',
  '6d581a53-9cc9-4c56-b0d6-490473f02107',
  '9fe5c6c8-994e-4645-8672-2f0530a67d49'
);

-- Delete orphaned/duplicate synced activities
DELETE FROM synced_activities WHERE id IN (
  'a2759c62-5022-4219-9e06-c0f3027ef88c',
  '52ea7860-da35-4b83-80bb-670dff701514'
);

-- Clear old junction entries for Fartlek workout
DELETE FROM training_workout_activities WHERE workout_id = '502d7b9b-38a6-42e8-b5de-74273e9e92b1';

-- Clear old matched_strava_activity_id on Fartlek workout
UPDATE training_plan_workouts 
SET matched_strava_activity_id = NULL 
WHERE id = '502d7b9b-38a6-42e8-b5de-74273e9e92b1';

-- Re-link Fartlek to both real sessions via junction table
INSERT INTO training_workout_activities (workout_id, activity_id, session_order)
VALUES 
  ('502d7b9b-38a6-42e8-b5de-74273e9e92b1', '0192a5d9-4760-4f17-a466-ac8abf17ce73', 0),
  ('502d7b9b-38a6-42e8-b5de-74273e9e92b1', 'b31447d9-89de-4130-ab57-d8134d070cf6', 1)
ON CONFLICT (workout_id, activity_id) DO NOTHING;

-- Fix activity_date on the two real Tuesday Strava activities
UPDATE synced_activities SET activity_date = '2026-04-14' WHERE id = '0192a5d9-4760-4f17-a466-ac8abf17ce73';
UPDATE synced_activities SET activity_date = '2026-04-14' WHERE id = 'b31447d9-89de-4130-ab57-d8134d070cf6';
