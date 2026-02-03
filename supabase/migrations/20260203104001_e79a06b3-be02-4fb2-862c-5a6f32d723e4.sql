-- Performance indexes for frequently queried patterns

-- Weekly objectives lookup (used constantly on This Week page and partner views)
CREATE INDEX IF NOT EXISTS idx_weekly_objectives_user_week 
ON weekly_objectives(user_id, week_start);

-- Goals by user and status (used on many pages)
CREATE INDEX IF NOT EXISTS idx_goals_user_status 
ON goals(user_id, status);

-- Goals by user for partner views
CREATE INDEX IF NOT EXISTS idx_goals_user_id 
ON goals(user_id);

-- Partnership lookups (used in partner dashboard and accountability)
CREATE INDEX IF NOT EXISTS idx_partnerships_user1_status 
ON accountability_partnerships(user1_id, status);

CREATE INDEX IF NOT EXISTS idx_partnerships_user2_status 
ON accountability_partnerships(user2_id, status);

-- Friend lookups for friendship checks
CREATE INDEX IF NOT EXISTS idx_friends_user1 ON friends(user1_id);
CREATE INDEX IF NOT EXISTS idx_friends_user2 ON friends(user2_id);

-- Check-ins by partnership with timestamp for history
CREATE INDEX IF NOT EXISTS idx_check_ins_partnership_created 
ON accountability_check_ins(partnership_id, created_at DESC);

-- Check-ins by initiator for "my last check-in" queries
CREATE INDEX IF NOT EXISTS idx_check_ins_initiated_by
ON accountability_check_ins(initiated_by, partnership_id, created_at DESC);

-- Partner requests for notification bell
CREATE INDEX IF NOT EXISTS idx_partner_requests_receiver_status 
ON accountability_partner_requests(receiver_id, status);

CREATE INDEX IF NOT EXISTS idx_partner_requests_sender_status 
ON accountability_partner_requests(sender_id, status);

-- Habit completions for streak calculations
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_habit_date
ON habit_completions(user_id, habit_item_id, completion_date DESC);

-- Posts by user for profile stats
CREATE INDEX IF NOT EXISTS idx_posts_user_hidden
ON posts(user_id, hidden);

-- User streaks lookup
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id
ON user_streaks(user_id);