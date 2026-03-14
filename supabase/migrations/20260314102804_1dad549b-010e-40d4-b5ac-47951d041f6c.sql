ALTER TABLE weekly_planning_sessions
  ADD COLUMN IF NOT EXISTS relationship_investment text,
  ADD COLUMN IF NOT EXISTS honest_conversation text;