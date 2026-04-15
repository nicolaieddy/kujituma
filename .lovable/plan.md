

## Strava Multi-Session Support

### Problem

The Strava sync's `autoMatchTrainingPlan` function (lines 127-239 in `strava-sync/index.ts`) only ever links **one** activity per workout via `matched_strava_activity_id`. When two back-to-back Strava activities happen for the same workout (e.g., a Fartlek saved as two recordings), the first gets matched and the second creates a **new unplanned workout entry** — resulting in two separate workout rows instead of one workout with two sessions.

The junction table (`training_workout_activities`) that was added for .FIT multi-session support is **never populated by the Strava sync**. The `autoMatchTrainingPlan` function doesn't know about it at all.

### Root cause (3 issues)

1. **Strava sync ignores junction table**: `autoMatchTrainingPlan` only sets `matched_strava_activity_id` on the workout row. It never inserts into `training_workout_activities`.
2. **One-to-one assumption**: The matching loop skips workouts that already have a `matched_strava_activity_id`, so a second activity for the same workout always falls through to the "create unplanned workout" path.
3. **Frontend `getMatchedActivities`**: Only looks up junction table entries by UUID (`activity_id`), but Strava activities are referenced by `strava_activity_id` (an integer). Even if junction entries existed, the Strava-linked activities wouldn't resolve properly unless the junction stores the `synced_activities.id` UUID.

### Changes

**1. Update `autoMatchTrainingPlan` in `strava-sync/index.ts`**
- After matching a workout via `matched_strava_activity_id`, also insert a row into `training_workout_activities` (mapping `workout.id` → `synced_activity.id` UUID).
- When a second activity matches the same workout (same sport, same day, within 2h of the previous session's end), **don't create a new unplanned workout**. Instead, add it to the junction table with an incremented `session_order`.
- To detect this: after step 1 matching, before step 2 (unplanned creation), check if an unmatched activity shares the same day + sport as an already-matched workout. If so, check temporal proximity and link it as an additional session.

**2. Apply the same logic to `strava-scheduled-sync/index.ts`**
- The scheduled sync function has its own `syncUserActivities` that also does one-to-one matching. Apply the same junction table + multi-session grouping.

**3. Apply to `strava-webhook/index.ts`**
- The webhook handler also does single-activity matching. Update it to check for existing workout matches and add to junction table.

**4. Update `parse-fit-file/index.ts` auto-match**
- The .FIT auto-match already inserts into the junction table, but verify it also handles the case where a Strava activity was already matched to the same workout (don't create duplicates).

**5. Ensure `getMatchedActivities` in `useTrainingPlan.ts` resolves Strava-linked activities**
- Currently, if no junction table entries exist, it falls back to `getMatchedActivity` which looks up by `matched_strava_activity_id`. With junction entries now being populated for Strava too, the primary path will work. But verify the fallback still handles legacy data.

### Files to change
- `supabase/functions/strava-sync/index.ts` — main fix: junction table + multi-session grouping in `autoMatchTrainingPlan`
- `supabase/functions/strava-scheduled-sync/index.ts` — same pattern for scheduled sync
- `supabase/functions/strava-webhook/index.ts` — same pattern for webhook
- `supabase/functions/parse-fit-file/index.ts` — verify no conflicts with Strava-linked workouts

### What stays the same
- Database schema (junction table already exists)
- Frontend UI (already handles multi-session display from junction table)
- Legacy `matched_strava_activity_id` column (kept for backward compat, but junction table becomes source of truth)

