
# Carry-Over Module Architecture Rebuild

## Problem Analysis

### The Bug
When user completes an objective like "Deal with incident CM" in week 2026-02-02, the carry-over modal still shows it because:

1. **Week 2026-02-02**: `is_completed = true` ✅
2. **Week 2026-01-26**: `is_completed = false` ❌ (still shown in carry-over)
3. **Week 2026-01-19**: `is_completed = false` ❌ (still shown in carry-over)  
4. **Week 2026-01-12**: `is_completed = false` ❌ (still shown in carry-over)

The current logic only checks if each individual row is incomplete, not whether the same objective (text + goal_id) was ever completed.

### Root Cause
The `get_carryover_data` RPC function and `getIncompleteObjectivesFromPreviousWeeks` service method use this flawed filter:
```sql
WHERE is_completed = false AND week_start < current_week
```

This ignores that completing the objective in ANY week means the task is done.

---

## Current Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                     UI Components                            │
├─────────────────────────────────────────────────────────────┤
│  CarryOverObjectivesModal.tsx                               │
│  CarryOverBanner.tsx                                        │
│  IncompleteObjectivesModal.tsx                              │
│  WeekTransitionCard.tsx                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Hooks                                 │
├─────────────────────────────────────────────────────────────┤
│  useCarryOverObjectives.ts     (uses service method)        │
│  useCarryOverDataOptimized.ts  (uses RPC directly)          │
│  useWeekTransition.ts          (uses service method)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
├─────────────────────────────────────────────────────────────┤
│  weeklyProgressService.ts:                                  │
│    - getIncompleteObjectivesFromPreviousWeeks()  ← BUG      │
│    - carryOverObjectives()                                  │
│    - carryOverObjectivesWithTargets()                       │
│                                                              │
│  RPC: get_carryover_data()  ← BUG                           │
└─────────────────────────────────────────────────────────────┘
```

### Issues with Current Design

1. **Two parallel implementations**: `useCarryOverDataOptimized` uses RPC while `useCarryOverObjectives` uses service methods - both have the same bug
2. **No concept of "ever completed"**: Neither implementation checks if an objective was completed in any week
3. **Deduplication doesn't consider completion**: The RPC deduplicates by text+goal_id for display, but doesn't filter out objectives that have been completed elsewhere
4. **Complex multi-table queries**: Filter sets are built client-side instead of in the database

---

## Solution: Rebuild with Clear Architecture

### Core Principle
**An objective should only appear in carry-over if NO version of that objective (same text + goal_id) has ever been completed.**

### New Database Logic

Update the `get_carryover_data` RPC to exclude objectives where any instance has been completed:

```sql
-- Add subquery to identify completed objective signatures
WITH completed_signatures AS (
  SELECT DISTINCT text, COALESCE(goal_id, '00000000-...')
  FROM weekly_objectives
  WHERE user_id = v_user_id
    AND is_completed = true
)
SELECT ... FROM weekly_objectives wo
WHERE wo.is_completed = false
  AND wo.week_start < p_current_week_start
  AND NOT EXISTS (
    SELECT 1 FROM completed_signatures cs
    WHERE cs.text = wo.text 
      AND cs.goal_id = COALESCE(wo.goal_id, '00000000-...')
  )
```

### Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/new_migration.sql` | Update `get_carryover_data` RPC to exclude completed objectives |
| `src/services/weeklyProgressService.ts` | Update `getIncompleteObjectivesFromPreviousWeeks()` to match new logic |
| `src/hooks/useCarryOverDataOptimized.ts` | No change needed (uses RPC) |
| `src/hooks/useCarryOverObjectives.ts` | No change needed (uses service) |

---

## Detailed Implementation

### 1. Database Migration (New SQL)

Create a new migration that updates the `get_carryover_data` function:

```sql
CREATE OR REPLACE FUNCTION public.get_carryover_data(p_current_week_start text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jsonb_build_object(
    'incomplete_objectives', (
      -- Deduplicate by text+goal_id, keep most recent week, count occurrences
      -- EXCLUDE any objective signature that has been completed in ANY week
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', agg.id,
          'user_id', agg.user_id,
          'goal_id', agg.goal_id,
          'text', agg.text,
          'is_completed', agg.is_completed,
          'week_start', agg.most_recent_week,
          'created_at', agg.created_at,
          'updated_at', agg.updated_at,
          'carry_over_count', agg.carry_over_count,
          'oldest_week', agg.oldest_week
        ) ORDER BY agg.most_recent_week DESC
      ), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (wo.text, COALESCE(wo.goal_id, '00000000-0000-0000-0000-000000000000'::uuid))
          wo.id,
          wo.user_id,
          wo.goal_id,
          wo.text,
          wo.is_completed,
          wo.created_at,
          wo.updated_at,
          -- Subqueries for aggregation
          (SELECT MAX(inner_wo.week_start) 
           FROM weekly_objectives inner_wo 
           WHERE inner_wo.user_id = v_user_id 
             AND inner_wo.is_completed = false
             AND inner_wo.week_start < p_current_week_start::date
             AND inner_wo.text = wo.text 
             AND COALESCE(inner_wo.goal_id, '00000000-...'::uuid) = COALESCE(wo.goal_id, '00000000-...'::uuid)
          ) as most_recent_week,
          -- ... other aggregations ...
          (SELECT COUNT(*) ... ) as carry_over_count
        FROM weekly_objectives wo
        WHERE wo.user_id = v_user_id
          AND wo.is_completed = false
          AND wo.week_start < p_current_week_start::date
          -- KEY FIX: Exclude objectives that have been completed in ANY week
          AND NOT EXISTS (
            SELECT 1 FROM weekly_objectives completed_wo
            WHERE completed_wo.user_id = v_user_id
              AND completed_wo.is_completed = true
              AND completed_wo.text = wo.text
              AND COALESCE(completed_wo.goal_id, '00000000-...'::uuid) = COALESCE(wo.goal_id, '00000000-...'::uuid)
          )
        ORDER BY wo.text, COALESCE(wo.goal_id, '00000000-...'::uuid), wo.week_start DESC
      ) agg
    ),
    'current_future_objectives', (
      -- No change needed
      SELECT COALESCE(jsonb_agg(...), '[]'::jsonb)
      FROM weekly_objectives wo
      WHERE wo.user_id = v_user_id
        AND wo.week_start >= p_current_week_start::date
    ),
    'dismissed_objectives', (
      -- No change needed
      SELECT COALESCE(jsonb_agg(...), '[]'::jsonb)
      FROM dismissed_carryover_objectives d
      WHERE d.user_id = v_user_id
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;
```

### 2. Service Method Update

Update `getIncompleteObjectivesFromPreviousWeeks()` in `weeklyProgressService.ts`:

```typescript
static async getIncompleteObjectivesFromPreviousWeeks(currentWeekStart: string): Promise<WeeklyObjective[]> {
  const userId = authStore.requireUserId();
  
  // Step 1: Get all completed objective signatures (text + goal_id)
  const { data: completedObjectives, error: completedError } = await supabase
    .from('weekly_objectives')
    .select('text, goal_id')
    .eq('user_id', userId)
    .eq('is_completed', true);

  if (completedError) throw completedError;

  // Build set of completed signatures
  const completedSet = new Set<string>();
  (completedObjectives || []).forEach(obj => {
    const key = `${obj.text}|${obj.goal_id || ''}`;
    completedSet.add(key);
  });

  // Step 2: Get all incomplete objectives from previous weeks
  const { data: incompleteObjectives, error: incompleteError } = await supabase
    .from('weekly_objectives')
    .select('*')
    .eq('user_id', userId)
    .eq('is_completed', false)
    .lt('week_start', currentWeekStart)
    .order('week_start', { ascending: false });

  if (incompleteError) throw incompleteError;
  
  // Step 3: Get current/future objectives and dismissed objectives
  // (existing code for carriedOverSet and dismissedSet)
  
  // Step 4: Filter out:
  // - Already carried over to current/future weeks
  // - Dismissed objectives  
  // - NEWLY: Objectives where ANY version has been completed
  const filteredObjectives = (incompleteObjectives || []).filter(obj => {
    const key = `${obj.text}|${obj.goal_id || ''}`;
    return !carriedOverSet.has(key) 
        && !dismissedSet.has(key)
        && !completedSet.has(key);  // NEW: Exclude completed signatures
  });

  return filteredObjectives as WeeklyObjective[];
}
```

---

## Testing Checklist

After implementation:

1. **Verify "Deal with incident CM" disappears**: The completed objective should no longer appear in carry-over
2. **Test partial completion**: If objective A is completed in week 5 but has incomplete versions in weeks 1-4, it should not appear
3. **Test never-completed objectives**: Objectives that have never been completed should still appear
4. **Test carry-over action**: Carrying over an objective should still work correctly
5. **Test dismiss action**: Dismissing should still work and persist
6. **Test week navigation**: Carry-over should update when navigating between weeks

---

## Summary

This is a **data layer bug fix** that requires:

1. **One database migration**: Update the `get_carryover_data` RPC function
2. **One service method update**: Add completion check to `getIncompleteObjectivesFromPreviousWeeks()`

No UI changes are needed - the existing components will automatically show correct data once the underlying queries are fixed.
