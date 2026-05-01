# Fix: Missing Strava badge on workouts that have both Strava + .FIT data

## What's actually wrong

Both the Fartlek (Mon 28 Apr) and Easy Aerobic (Wed 30 Apr) sessions have a Strava activity AND a .FIT upload in `synced_activities`. But the badges only render correctly for Easy Aerobic.

Confirmed via DB query:

| Workout | Strava row | .FIT row | Linked in `training_workout_activities` |
|---|---|---|---|
| Easy Aerobic 60-80min | yes | yes | **both** linked → shows Strava + .FIT |
| Fartlek 10×2min | yes | yes | **only .FIT** linked → shows .FIT only |

`TrainingWorkoutCard` derives badges from rows in `training_workout_activities`. If only one of the two duplicate rows is linked, only that one's badge shows — even though `mergeActivitiesIntoSessions` was specifically built to merge them.

## Root cause

Two related issues in `supabase/functions/strava-sync/index.ts` → `autoMatchTrainingPlan`:

1. The function only links *one* activity per planned workout in step 1 (the first match wins, then `usedActivityIds.add(...)`). Subsequent same-day, same-type, same-time activities (the duplicate from the other source) are evaluated as multi-session candidates in step 2.
2. The multi-session check requires the *previously linked* activity to exist in the junction table and uses end-time + 2h proximity. If the order in which activities are evaluated puts the .FIT row first, the Strava row should still link (gap ≈ 0), but if the workout was originally matched via the legacy `matched_strava_activity_id` field before the junction table existed, the junction-table link for the Strava row was never backfilled.

The Easy Aerobic session worked because both rows ended up in the junction table; the Fartlek didn't.

## Fix — two parts

### 1. Make the UI resilient (display-time merge)

In `src/components/thisweek/TrainingWorkoutCard.tsx`, before computing badges, merge the linked `activities` with their duplicate counterparts from `synced_activities` for the same physical session.

Concretely: pass the full week's `syncedActivities` list (already loaded by `useSyncedActivities`) into the card, and for each linked activity, look up any same-date / same-`start_date` / similar-distance row from the other source and treat it as part of the session. Reuse `isSamePhysicalSession` from `trainingPlanUtils.ts`.

This guarantees the badges always reflect reality even if the junction table is incomplete.

### 2. Backfill the junction table in `strava-sync`

In `autoMatchTrainingPlan`, after step 1 (planned-workout matching), add a pass that:

- For every workout that now has a linked activity, look for *other* `synced_activities` rows on the same date with the same/near-identical `start_date` (±5 min) and similar distance/duration, and upsert them into `training_workout_activities` with the next `session_order`.
- This catches the Strava+.FIT duplicate pairing regardless of which one was matched first.

Also run this once as a one-off backfill (either via a temporary migration or by triggering a manual sync) to repair existing rows like the Fartlek.

## Files to change

- `src/components/thisweek/TrainingWorkoutCard.tsx` — merge duplicate same-session activities before deriving `sources`.
- `src/components/thisweek/trainingPlanUtils.ts` — export a helper `findDuplicateSessionActivities(linked, allSynced)` reusing `isSamePhysicalSession`.
- `supabase/functions/strava-sync/index.ts` — add post-match pass to link duplicate-source activities into `training_workout_activities`.

## Verification

After deploy + a manual Strava sync:

- Re-query: `SELECT activity_id, source FROM training_workout_activities twa JOIN synced_activities sa ON sa.id=twa.activity_id WHERE workout_id='26c01264-d902-49fe-aeee-dbb283709b89'` should return **two** rows (strava + fit_upload).
- The Fartlek card on This Week should show both Strava and .FIT badges.
- Easy Aerobic should remain unchanged (already correct).
