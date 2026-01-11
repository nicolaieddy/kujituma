-- Fix existing check-ins with incorrect week_start (Jan 4 should be Jan 6)
-- January 6, 2026 is Monday, so check-ins from that week should have week_start = 2026-01-06
UPDATE accountability_check_ins 
SET week_start = '2026-01-06' 
WHERE week_start = '2026-01-04';