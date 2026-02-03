
# Profile Page & App-Wide Database Optimization Plan

## Problem Summary
The Profile page currently makes **9-12 separate database calls**, causing slow load times. Other areas of the app have similar patterns of multiple sequential or N+1 queries that could be consolidated.

---

## Solution Overview

Create **consolidated RPC functions** that return all related data in single database calls, similar to the `get_weekly_dashboard_data` pattern we successfully implemented earlier.

---

## Part 1: Profile Page Optimization

### New Database Function: `get_profile_page_data`

This RPC will return all profile page data in one call:

**Input parameters:**
- `p_profile_user_id` (the profile being viewed)

**Returns a JSONB object containing:**
- `profile` - The profile record (filtered by viewer permissions)
- `stats` - Goals completed count, streak data, weeks shared count
- `friendship_status` - Whether viewer is a friend, pending request status
- `partnership_status` - Whether viewer is an accountability partner, can view goals
- `visible_goals` - Goals visible to the viewer (based on friendship/visibility)

### Files to Create/Modify

1. **New Migration**: `supabase/migrations/[timestamp]_get_profile_page_data.sql`
   - Creates `get_profile_page_data(p_profile_user_id uuid)` RPC function
   - Handles all permission logic server-side
   - Returns consolidated JSONB response

2. **New Hook**: `src/hooks/useProfilePageData.ts`
   - Single React Query hook that calls the RPC
   - Returns typed profile page data
   - Replaces multiple separate queries

3. **Modify**: `src/pages/Profile.tsx`
   - Replace the manual `fetchProfileData` useEffect with `useProfilePageData` hook
   - Remove friendship/partnership checking logic (handled by RPC)
   - Simplify component significantly

4. **Modify**: `src/hooks/useProfileStats.ts`
   - Either integrate into the new RPC or mark as unused
   - Stats will now come from consolidated query

5. **Modify**: `src/components/profile/ProfileGoals.tsx`
   - Accept goals as prop from parent instead of fetching
   - Or use goals from the consolidated data hook

---

## Part 2: Friends Service N+1 Query Fix

### Problem
`getFriendRequests()` fetches profiles one-by-one in a loop:
```typescript
const sentWithProfiles = await Promise.all(
  sentRequests.map(async (request) => {
    const { data: profile } = await supabase
      .from('profiles').select(...).eq('id', request.receiver_id)
```

### Solution
Batch the profile lookups:

1. **Modify**: `src/services/friendsService.ts`
   - Collect all profile IDs first
   - Make a single query with `.in('id', profileIds)`
   - Map profiles back to requests

**Before**: N+1 queries (N profiles fetched individually)
**After**: 3 queries total (sent requests, received requests, all profiles)

---

## Part 3: Accountability Partners Consolidation

### New Database Function: `get_accountability_data`

Consolidates the 3+ queries in `accountabilityService.getPartners()` into one RPC.

**Returns:**
- Partners list with cadence settings
- User's last check-in timestamps
- Pending partner requests (sent and received)

### Files to Modify

1. **New Migration**: Create `get_accountability_data()` RPC
2. **Modify**: `src/services/accountabilityService.ts` - Use new RPC
3. **Modify**: `src/hooks/useAccountabilityPartners.ts` - Simplified data fetching

---

## Part 4: Partner Dashboard Consolidation

### New Database Function: `get_partner_dashboard_data`

Consolidates the 5 parallel queries in PartnerDashboard.

**Input:** `p_partner_id uuid`, `p_week_start text`

**Returns:**
- Partner profile
- Partner's visible goals
- Partner's weekly objectives for the week
- Partnership details
- Partner's habit stats

### Files to Modify

1. **New Migration**: Create RPC function
2. **Modify**: `src/pages/PartnerDashboard.tsx` - Use single data hook

---

## Implementation Priority

| Priority | Optimization | Queries Saved | Impact |
|----------|-------------|---------------|--------|
| **1st** | Profile page RPC | 8-10 → 1 | High (frequent page) |
| **2nd** | Friends N+1 fix | N+2 → 3 | Medium |
| **3rd** | Accountability RPC | 4 → 1 | Medium |
| **4th** | Partner Dashboard RPC | 5 → 1 | Lower (less frequent) |

---

## Technical Details

### Profile Page RPC Structure

```sql
CREATE OR REPLACE FUNCTION get_profile_page_data(p_profile_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  v_user_id UUID := auth.uid();
  v_is_owner BOOLEAN;
  v_is_friend BOOLEAN;
  v_is_partner BOOLEAN;
BEGIN
  v_is_owner := (v_user_id = p_profile_user_id);
  
  -- Check friendship in one query
  SELECT EXISTS(
    SELECT 1 FROM friends 
    WHERE user1_id = LEAST(v_user_id, p_profile_user_id)
      AND user2_id = GREATEST(v_user_id, p_profile_user_id)
  ) INTO v_is_friend;
  
  -- Build consolidated response
  SELECT jsonb_build_object(
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE p.id = p_profile_user_id),
    'stats', jsonb_build_object(
      'goals_completed', (SELECT COUNT(*) FROM goals WHERE user_id = p_profile_user_id AND status = 'completed'),
      'current_streak', COALESCE((SELECT current_weekly_streak FROM user_streaks WHERE user_id = p_profile_user_id), 0),
      'weeks_shared', (SELECT COUNT(*) FROM posts WHERE user_id = p_profile_user_id AND hidden = false)
    ),
    'friendship', CASE 
      WHEN v_is_owner THEN jsonb_build_object('is_owner', true)
      WHEN v_is_friend THEN jsonb_build_object('is_friend', true)
      ELSE (SELECT ... FROM friend_requests ...)
    END,
    'partnership', (...),
    'visible_goals', (SELECT jsonb_agg(...) FROM goals WHERE ...)
  ) INTO result;
  
  RETURN result;
END;
$$;
```

---

## Expected Performance Improvement

| Page | Before | After | Improvement |
|------|--------|-------|-------------|
| Profile | 9-12 queries | 1 query | ~90% reduction |
| Friends list | N+2 queries | 3 queries | Variable (N dependent) |
| Partner Dashboard | 5 queries | 1 query | 80% reduction |

---

## Files Summary

### New Files
1. `supabase/migrations/[timestamp]_get_profile_page_data.sql`
2. `src/hooks/useProfilePageData.ts`

### Modified Files
1. `src/pages/Profile.tsx` - Use consolidated hook
2. `src/services/friendsService.ts` - Fix N+1 query
3. `src/components/profile/ProfileGoals.tsx` - Accept props instead of fetching
4. `src/components/profile/ProfileStats.tsx` - Use data from parent or hook
5. (Future) `src/services/accountabilityService.ts`
6. (Future) `src/pages/PartnerDashboard.tsx`

---

## Testing Checklist

- Profile page loads significantly faster
- Own profile shows all data correctly
- Friend's profile shows appropriate visibility
- Non-friend profile shows limited data
- Partnership status displays correctly
- Stats (goals, streaks, weeks shared) are accurate
- Goals visibility respects public/friends/private settings
