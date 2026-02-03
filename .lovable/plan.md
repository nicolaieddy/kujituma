
# Database & Query Optimization Plan (Non-Caching)

## Problem Summary

After analyzing the codebase, I found several areas with inefficient database access patterns:

1. **Partner Dashboard** makes 15+ queries when it could make 1
2. **`getPartners()` is called 4x** on the Partner Dashboard (once directly + 3x via verification in other methods)
3. **`supabase.auth.getUser()`** is called excessively - 395+ times across services
4. **Missing RPC consolidation** for accountability and partner data
5. **Missing database indexes** for frequently queried columns

---

## Priority 1: Partner Dashboard Consolidation (Biggest Impact)

### Problem
The PartnerDashboard page makes these calls:
```
getPartners() → 3 queries
getPartnerProfile() → 1 query
getPartnerGoals() → getPartners() + 1 query = 4 queries
getPartnerWeeklyObjectives() → getPartners() + 1 query = 4 queries  
getPartnershipDetails() → 1 query
getPartnerHabitStats() → getPartners() + 2 queries = 5 queries
```
**Total: ~18 database queries for one page load!**

### Solution: Create `get_partner_dashboard_data` RPC

This single RPC will:
- Verify partnership exists and viewer has permission (1 check)
- Return partner profile
- Return partner's visible goals
- Return weekly objectives for the requested week
- Return partnership details
- Return habit stats

**Database Migration:**
```sql
CREATE OR REPLACE FUNCTION get_partner_dashboard_data(
  p_partner_id uuid,
  p_week_start text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_partnership RECORD;
  v_can_view BOOLEAN;
BEGIN
  -- Single query to get partnership and verify permissions
  SELECT * INTO v_partnership
  FROM accountability_partnerships
  WHERE status = 'active'
    AND ((user1_id = v_user_id AND user2_id = p_partner_id)
      OR (user1_id = p_partner_id AND user2_id = v_user_id));
  
  IF v_partnership IS NULL THEN
    RETURN jsonb_build_object('error', 'Partnership not found');
  END IF;
  
  -- Build and return consolidated response
  RETURN jsonb_build_object(
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE id = p_partner_id),
    'goals', (SELECT jsonb_agg(...) FROM goals WHERE user_id = p_partner_id),
    'objectives', (SELECT jsonb_agg(...) FROM weekly_objectives WHERE ...),
    'partnership', row_to_json(v_partnership),
    'habit_stats', (...computed stats...)
  );
END;
$$;
```

**Files to modify:**
- New migration file for RPC
- New `usePartnerDashboardData.ts` hook
- Update `PartnerDashboard.tsx` to use single hook

**Result: 18 queries → 1 query**

---

## Priority 2: Accountability Partners Data Consolidation

### Problem
`useAccountabilityPartners` and `useDuePartnerCheckIns` both call `getPartners()` which makes 3 queries:
1. RPC call `get_accountability_partners`
2. Query for cadence settings
3. Query for check-in timestamps

The NotificationBell component uses both hooks, causing 6+ queries just to show the bell icon.

### Solution: Create `get_accountability_data` RPC

This RPC will return everything in one call:
- Partners list with cadence and check-in timestamps
- Pending requests (sent and received) with profiles
- Due/overdue check-in indicators (computed server-side)

**Database Migration:**
```sql
CREATE OR REPLACE FUNCTION get_accountability_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'partners', (SELECT jsonb_agg(...) WITH cadence and check-ins),
    'sent_requests', (SELECT jsonb_agg(...) WITH receiver profiles),
    'received_requests', (SELECT jsonb_agg(...) WITH sender profiles),
    'due_check_ins', (computed array of overdue partner IDs)
  );
END;
$$;
```

**Files to modify:**
- New migration file
- Update `accountabilityService.ts` 
- Update `useAccountabilityPartners.ts`
- Update `useDuePartnerCheckIns.ts`

**Result: 6+ queries → 1 query per component mount**

---

## Priority 3: Eliminate Redundant Partner Verification

### Problem
Every partner-related method in `accountabilityService.ts` calls `getPartners()` to verify the user is allowed to access that partner's data:
- `getPartnerGoals()` → calls `getPartners()`
- `getPartnerWeeklyObjectives()` → calls `getPartners()`
- `getPartnerHabitStats()` → calls `getPartners()`
- `getPartnerHabitCompletions()` → calls `getPartners()`

### Solution: Use RLS Policies Instead

Move authorization logic to Row Level Security policies so we don't need to verify in application code:

```sql
-- Policy: Users can view partner's goals if they have an active partnership with visibility enabled
CREATE POLICY "partner_can_view_goals" ON goals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM accountability_partnerships ap
    WHERE ap.status = 'active'
      AND ((ap.user1_id = auth.uid() AND ap.user2_id = goals.user_id AND ap.user1_can_view_user2_goals)
        OR (ap.user2_id = auth.uid() AND ap.user1_id = goals.user_id AND ap.user2_can_view_user1_goals))
  )
);
```

Then the methods can directly query without calling `getPartners()` first.

---

## Priority 4: Add Database Indexes

Add composite indexes for frequently queried patterns:

```sql
-- Weekly objectives lookup (used constantly)
CREATE INDEX IF NOT EXISTS idx_weekly_objectives_user_week 
ON weekly_objectives(user_id, week_start);

-- Goals by user and status (used on many pages)
CREATE INDEX IF NOT EXISTS idx_goals_user_status 
ON goals(user_id, status);

-- Partnership lookups
CREATE INDEX IF NOT EXISTS idx_partnerships_users 
ON accountability_partnerships(user1_id, user2_id, status);

-- Friend lookups  
CREATE INDEX IF NOT EXISTS idx_friends_user1 ON friends(user1_id);
CREATE INDEX IF NOT EXISTS idx_friends_user2 ON friends(user2_id);

-- Check-ins by partnership
CREATE INDEX IF NOT EXISTS idx_check_ins_partnership 
ON accountability_check_ins(partnership_id, created_at DESC);
```

---

## Files Summary

### New Files
1. `supabase/migrations/[timestamp]_partner_dashboard_rpc.sql` - Partner dashboard RPC
2. `supabase/migrations/[timestamp]_accountability_data_rpc.sql` - Accountability data RPC  
3. `supabase/migrations/[timestamp]_performance_indexes.sql` - Database indexes
4. `src/hooks/usePartnerDashboardData.ts` - New consolidated hook

### Modified Files
1. `src/pages/PartnerDashboard.tsx` - Use new consolidated hook
2. `src/services/accountabilityService.ts` - Update to use new RPCs, remove redundant verification
3. `src/hooks/useAccountabilityPartners.ts` - Simplified to use RPC
4. `src/hooks/useDuePartnerCheckIns.ts` - Get data from consolidated RPC

---

## Expected Performance Improvements

| Area | Before | After | Reduction |
|------|--------|-------|-----------|
| Partner Dashboard | ~18 queries | 1 query | 94% |
| Notification Bell | 6+ queries | 1 query | 83% |
| Accountability Tab | 4 queries | 1 query | 75% |

---

## Implementation Order

1. **Add database indexes** (quick win, no code changes)
2. **Create Partner Dashboard RPC** (biggest impact)
3. **Create Accountability Data RPC** (affects notification bell)
4. **Add RLS policies for partner data** (cleaner long-term)

---

## Testing Checklist

- Partner Dashboard loads correctly with all data
- Notification bell shows overdue check-ins
- Accountability partners tab works
- Partner requests can be sent/received
- Check-ins can be recorded
- Goals/objectives visibility respects permissions
