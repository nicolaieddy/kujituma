

# Carry-Over Objectives Deduplication UX Improvement

## Problem Statement
The carry-over modal currently displays the same objective multiple times when it has been carried over through several weeks. For example:
- "Deal with incident NL" appears in Week Jan 26-Feb 1 AND Week Jan 19-Jan 25
- "2025 Year in Review" appears in 3 different weeks
- "BMW 1250GSA Insurance" appears in 4 different weeks

This creates a cluttered, confusing experience and makes the list unnecessarily long.

## Solution: Show Only the Most Recent Instance

Instead of grouping by week and showing duplicates, we will:

1. **Deduplicate by objective text + goal_id** - Only show each unique objective once
2. **Show the most recent week as context** - Display when the objective was "last scheduled"
3. **Show carry-over count badge** - Indicate how many times it's been carried over (e.g., "Carried over 3x")
4. **Remove week grouping entirely** - Present a flat list sorted by recency

### New UX Design

```text
+----------------------------------------------------------+
|  [Checkbox] Deal with incident NL                        |
|  Goal: Build a...  |  Last: Jan 26  |  Carried 3x       |
|  > Move to: [Week 6 (Feb 2 - Feb 8) v]                   |
+----------------------------------------------------------+

+----------------------------------------------------------+
|  [Checkbox] BMW 1250GSA Insurance                        |
|  No goal  |  Last: Jan 26  |  Carried 4x                |
|  > Move to: [Week 6 (Feb 2 - Feb 8) v]                   |
+----------------------------------------------------------+
```

Benefits:
- Much shorter list (4 items instead of 12+ in the example)
- Clear indication of how "stale" an objective is
- Less overwhelming for users
- Easier decision-making

---

## Technical Implementation

### 1. Modify Database RPC Function

Update `get_carryover_data` to deduplicate and include carry-over count:

```sql
-- In incomplete_objectives, group by text+goal_id and return:
-- - The most recent week_start
-- - Count of how many weeks it appeared in
-- - The original objective id from the most recent week
```

### 2. Update Types

Add new fields to the carry-over objective type:
- `carry_over_count: number` - How many times this has been scheduled
- `original_week: string` - The oldest week it appeared (optional)

### 3. Update CarryOverObjectivesModal.tsx

Key changes:
- Remove week-based grouping (`objectivesByWeek` logic)
- Display flat list of deduplicated objectives
- Show "Carried Nx" badge when count > 1
- Show "Last scheduled: [date]" instead of week group headers
- Sort by most recent week_start (newest first)

### 4. Update Service Layer

Modify `getIncompleteObjectivesFromPreviousWeeks` to:
- Return deduplicated objectives with aggregated metadata
- Or rely on the updated RPC function

---

## Files to Modify

1. **`supabase/migrations/[new]_carryover_deduplication.sql`**
   - Update `get_carryover_data` RPC to deduplicate and add carry-over count

2. **`src/components/goals/CarryOverObjectivesModal.tsx`**
   - Remove week grouping display logic
   - Add carry-over count badge display
   - Show "Last scheduled: X" context
   - Flatten the list display

3. **`src/hooks/useCarryOverDataOptimized.ts`**
   - Update to handle new RPC response format with aggregated data

4. **`src/services/weeklyProgressService.ts`**
   - Update `getIncompleteObjectivesFromPreviousWeeks` to deduplicate results
   - Add carry-over count calculation

5. **`src/types/weeklyProgress.ts`** (optional)
   - Add `CarryOverObjective` type with additional metadata fields

---

## Example Query Logic

```sql
-- Deduplicated incomplete objectives with carry-over count
SELECT DISTINCT ON (text, COALESCE(goal_id, '00000000-0000-0000-0000-000000000000'))
  id,
  text,
  goal_id,
  MAX(week_start) as most_recent_week,
  COUNT(*) as carry_over_count
FROM weekly_objectives
WHERE user_id = auth.uid()
  AND is_completed = false
  AND week_start < current_week_start
GROUP BY text, goal_id
ORDER BY most_recent_week DESC
```

---

## Visual Mockup

**Before (confusing):**
```
From: Jan 26 - Feb 1
  [x] Deal with incident NL
  [x] 2025 Year in Review
  [x] Deal with incident CM
  [x] BMW 1250GSA Insurance

From: Jan 19 - Jan 25
  [ ] Deal with incident NL    <-- duplicate
  [ ] 2025 Year in Review      <-- duplicate
  [ ] Deal with incident CM    <-- duplicate
```

**After (clean):**
```
Select objectives to carry over:

  [x] Deal with incident NL
      Goal: Build a...  ·  Last: Jan 26  ·  [3x badge]
      > Move to: Week 6 (Feb 2 - Feb 8)

  [x] 2025 Year in Review  
      No goal  ·  Last: Jan 26  ·  [3x badge]
      > Move to: Week 6 (Feb 2 - Feb 8)

  [x] BMW 1250GSA Insurance
      No goal  ·  Last: Jan 26  ·  [4x badge]
      > Move to: Week 6 (Feb 2 - Feb 8)
```

---

## Testing Checklist

- Objectives appearing in multiple weeks show only once
- Carry-over count badge displays correctly
- "Last scheduled" date shows the most recent week
- Selecting and carrying over still works correctly
- Dismiss functionality still works (dismisses all instances)
- Performance is maintained or improved (fewer items to render)

