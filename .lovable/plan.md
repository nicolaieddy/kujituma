
# Weekly Transition Logic Bug Fix

## Problem Summary

The Week Transition card keeps appearing even after the user has completed it. The user filled out the transition (reviewing last week, setting intention), but the card still shows on subsequent page loads.

## Root Cause

In `useWeekTransition.ts`, there's a variable aliasing bug where the wrong planning session is being checked:

| What the code does | What it should do |
|-------------------|------------------|
| Checks **last week's** planning session completion | Should check **current week's** planning session completion |

The destructuring on line 22 aliases `lastWeekPlanning` as `planningSession`:
```javascript
lastWeekPlanning: planningSession,  // Renames wrong variable
```

But `planningSession` (current week's data) already exists in the dashboard hook and is not being used.

## Solution

### 1. Fix the hook destructuring

Update `src/hooks/useWeekTransition.ts` to properly get both planning sessions:

```javascript
// Before (broken):
const { 
  lastWeekObjectives, 
  lastWeekPost: lastWeekProgressPost, 
  lastWeekPlanning: planningSession,  // WRONG: This is LAST week's planning
  lastWeekStart,
  isLoading: dashboardLoading 
} = useWeeklyDashboardData(currentWeekStart);

// After (fixed):
const { 
  lastWeekObjectives, 
  lastWeekPost: lastWeekProgressPost, 
  planningSession,         // CURRENT week's planning (for checking if done)
  lastWeekPlanning,        // LAST week's planning (for reference if needed)
  lastWeekStart,
  isLoading: dashboardLoading 
} = useWeeklyDashboardData(currentWeekStart);
```

### 2. The Logic Already Works

The `shouldShowTransition` logic on lines 28-61 is **already correct** - it just needs the right data:

```javascript
// Don't show if last week was already marked complete
if (lastWeekProgressPost?.is_completed) return false;

// Don't show if planning for CURRENT week is already complete  
if (planningSession?.is_completed) return false;  // Now checks correct session
```

### 3. Update the return statement

The hook currently returns `planningSession` but it's actually `lastWeekPlanning`. After the fix, update if any consumers expect last week's planning:

```javascript
return {
  // Data
  lastWeekStart,
  lastWeekObjectives,
  incompleteObjectives,
  lastWeekReflections,
  planningSession,        // Now correctly refers to CURRENT week
  // Or if you need both:
  // lastWeekPlanning,     // Add if needed
```

## Why This Fix Works

After the transition is completed:
1. `handleCompleteTransition()` calls `saveIntentionMutation.mutate()` 
2. This creates/updates the planning session for the **current week** and marks it complete
3. The fix ensures `planningSession?.is_completed` checks the **current week's** session
4. Since it's complete, `shouldShowTransition` returns `false`

---

## Technical Details

**File to modify:** `src/hooks/useWeekTransition.ts`

**Change summary:**
- Line 22: Fix destructuring to get `planningSession` (current week) instead of aliasing `lastWeekPlanning`
- Optionally keep `lastWeekPlanning` if needed elsewhere

**No database changes required** - this is purely a client-side variable naming issue.

## Testing Checklist

After the fix:
1. Complete the week transition flow
2. Navigate away from the page
3. Return to the page - transition card should NOT appear
4. Refresh the browser - transition card should still NOT appear
5. Test "Review Last Week" button still works when manually reopened
