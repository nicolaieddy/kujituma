-- Delete all weekly objectives for the current authenticated user
DELETE FROM weekly_objectives 
WHERE user_id = auth.uid();