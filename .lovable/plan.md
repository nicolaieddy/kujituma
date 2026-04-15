

## Fix Data Issues + Prevent Recurrence

### Problem Summary

Three issues visible in the database:

1. **Strava duplicate of Monday's run**: Strava activity 18105040374 ("Evening Run", 5.3km) is the same physical run as the Monday .FIT upload. The Strava sync used the old UTC-based `activity_date` logic and placed it on Tuesday. This created a ghost unplanned workout on Tuesday.

2. **Orphaned FIT upload**: Activity `a2759c62` is a leftover from a previous upload — no workout link, duplicate data.

3. **Fartlek mis-matching**: The real Fartlek was two sessions (9.2km "Afternoon Run" + 2.0km "Evening Run", 42 min apart). Instead of being grouped under the Fartlek workout, each got its own unplanned workout. The Fartlek workout matched only the small 2.0km piece.

### Changes

**1. Data cleanup migration**

- Delete orphaned activity `a2759c62` and its ghost workout `9fe5c6c8` ("Run (FIT Upload)" on Tuesday)
- Delete the Strava duplicate activity `52ea7860` ("Evening Run" 5.3km on Tuesday) and its ghost workout `429af13a`
- Re-link the Fartlek workout (`502d7b9b`) to both real Tuesday sessions via the junction table:
  - Session 0: "Afternoon Run" `0192a5d9` (9.2km, the main session)
  - Session 1: "Evening Run" `b31447d9` (2.0km, the continuation)
- Delete the unplanned "Afternoon Run" workout `6d581a53` (its activity stays, just re-linked to Fartlek)
- Update `activity_date` on the two real Tuesday Strava activities to `2026-04-14`

**2. Fix Strava sync duplicate detection (`strava-sync/index.ts`)**

The Strava sync currently does not check if a Strava activity duplicates an existing .FIT-uploaded activity with the same timestamp/distance. Add a check: before inserting a new synced_activity, look for an existing activity with the same `start_date` and similar `distance_meters` (within 1%). If found, skip the Strava activity (the FIT upload has higher fidelity data).

**3. Fix `activity_date` computation in Strava sync**

The `activity_date` for Strava activities is still computed using the old UTC-sensitive approach for some code paths. The `getLocalDate` function in `strava-sync` should be used consistently. Verify that ALL new synced_activities get `activity_date` set using the timezone-aware `getLocalDate` function.

**4. Fix Fartlek multi-session grouping in `autoMatchTrainingPlan`**

The current multi-session logic (Step 2 in `autoMatchTrainingPlan`) only checks activities against workouts that already have junction table entries. But the Fartlek's first match goes through Step 1 (which sets `matched_strava_activity_id` but the junction insert may not be queryable yet in the same loop). Fix: after Step 1 matching completes, rebuild the `usedActivityIds` set and re-check remaining activities against ALL matched workouts (including ones just matched in Step 1).

### Files to change

- New migration: data cleanup (delete duplicates, re-link Fartlek sessions)
- `supabase/functions/strava-sync/index.ts`: duplicate detection vs FIT uploads + ensure `activity_date` is always set + fix multi-session grouping order

