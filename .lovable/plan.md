

## Multi-Session Workouts + Fix Date Matching Bug

### Problem 1: Date matching bug (still broken)
Lines 428-430 in `parse-fit-file/index.ts` compute the workout date using `new Date(week_start)` + `.toISOString().split("T")[0]`, which is the exact UTC-sensitive pattern that causes day drift. The activity date is correctly computed as Monday, but the workout date comparison drifts to Tuesday, so the auto-match links to the wrong day.

### Problem 2: Multi-session workouts
Currently `training_plan_workouts.matched_activity_id` is a single UUID. When you split a workout into 2-3 recordings (e.g., a Fartlek saved as two back-to-back sessions), only one can be linked.

### Design

**Multi-activity linking via a junction table.** A new `training_workout_activities` table maps one workout to many activities. The existing `matched_activity_id` column is kept for backward compatibility but the UI and auto-match logic use the junction table as the source of truth.

**Auto-grouping logic:** When a FIT file is uploaded, the auto-match checks if a workout already has one linked activity. If the new activity is:
- Same sport type
- Same `activity_date`
- Start time within 2 hours of the previous session's end time

...it gets added as an additional session on the same workout rather than creating a new unplanned workout.

**UI changes:** When a workout has multiple linked activities, the card shows:
- Aggregated totals in the collapsed row (sum of duration, distance, elevation; weighted avg HR/pace)
- An expandable list of individual sessions inside the detail view, each with its own laps and charts
- A "Session 1 / Session 2" label on each sub-section

### Changes

**1. New junction table: `training_workout_activities`**
```sql
CREATE TABLE training_workout_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES training_plan_workouts(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES synced_activities(id) ON DELETE CASCADE,
  session_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workout_id, activity_id)
);
-- RLS: user can manage their own
-- Backfill from existing matched_activity_id
INSERT INTO training_workout_activities (workout_id, activity_id, session_order)
SELECT id, matched_activity_id, 0
FROM training_plan_workouts
WHERE matched_activity_id IS NOT NULL;
```

**2. Fix date matching in `parse-fit-file/index.ts`**
Replace lines 428-430:
```typescript
// Before (broken):
const workoutDate = new Date(workout.week_start);
workoutDate.setDate(workoutDate.getDate() + workout.day_of_week);
const workoutDateStr = workoutDate.toISOString().split("T")[0];

// After (safe):
const [wy, wm, wd] = workout.week_start.split("-").map(Number);
const d = new Date(wy, wm - 1, wd + workout.day_of_week);
const workoutDateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
```

**3. Update auto-match to support multi-session**
In `parse-fit-file/index.ts`, after finding a matching workout:
- Check if it already has a linked activity via the junction table
- If yes, check if the new activity qualifies as a continuation (same sport, same date, start time within 2h of previous end)
- If it qualifies, insert into junction table with `session_order = existing_count`
- If no match found with existing workouts, also check workouts that already have a match (not just `matched_activity_id IS NULL`)

**4. Update `useTrainingPlan.ts`**
- Fetch from `training_workout_activities` to get all linked activity IDs per workout
- Load all linked activities
- Provide `getMatchedActivities(workout)` returning an array instead of a single activity
- Aggregate stats for the collapsed row (total duration, total distance, avg HR weighted by duration)

**5. Update `TrainingWorkoutCard.tsx`**
- When multiple activities exist, show aggregated stats in the collapsed row
- In expanded view, show a "Session 1", "Session 2" breakdown with individual laps/charts per session
- Each session shows its own source badge (.FIT / Strava)
- Delete button works per-session (removes from junction table and optionally deletes the activity data)

**6. Update `TrainingPlanCard.tsx`**
- Pass array of matched activities instead of single activity
- Completion status: "done" if at least one activity is linked

### Files to change
- **Migration**: new `training_workout_activities` table + backfill
- `supabase/functions/parse-fit-file/index.ts` — fix date math + multi-session auto-match
- `src/hooks/useTrainingPlan.ts` — fetch junction table, return arrays, aggregate stats
- `src/components/thisweek/TrainingWorkoutCard.tsx` — multi-session UI
- `src/components/thisweek/TrainingPlanCard.tsx` — wire new data shape
- `src/components/thisweek/trainingPlanUtils.ts` — aggregation helpers

