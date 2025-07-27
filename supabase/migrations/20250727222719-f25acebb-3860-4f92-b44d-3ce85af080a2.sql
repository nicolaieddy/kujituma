-- Fix legacy issue: Mark weeks as completed if they have been shared to community
UPDATE weekly_progress_posts 
SET 
  is_completed = true,
  completed_at = COALESCE(completed_at, now()),
  updated_at = now()
WHERE id IN (
  SELECT DISTINCT wpp.id
  FROM weekly_progress_posts wpp
  INNER JOIN posts p ON wpp.week_start = p.week_start AND wpp.user_id = p.user_id
  WHERE wpp.is_completed = false
  AND p.week_start IS NOT NULL
);