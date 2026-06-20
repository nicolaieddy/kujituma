## Goal

Stop asking the user to manually link the weekly Training Plan to a goal. Activities and weekly plans should auto-attach to a configurable **default training goal**, and a weekly objective is auto-created against that goal each week. No backfill — forward-only.

## 1. New settings (DB)

Extend `workout_preferences` with three nullable columns:

- `default_goal_id uuid` — the goal new activities + weekly plans attach to
- `auto_create_weekly_objective boolean default true`
- `auto_link_activities boolean default true`
- `weekly_objective_template text default 'plan_and_volume'` — for now just one value; future-proof for other modes

(Schema-only migration; no data backfill.)

## 2. New "Training defaults" settings UI

Add a section inside the existing Training settings (where workout units live) titled **"Training defaults"**:

- Default training goal — searchable dropdown of the user's active goals (with "None" option)
- Toggle: *Auto-link new activities to this goal*
- Toggle: *Auto-create a weekly objective for my training plan*
- Helper text explaining: only applies going forward; you can still override per workout.

Also expose this as one step in the onboarding wizard ("Pick a default training goal — we'll auto-link your activities and create a weekly objective for you").

## 3. Auto-link activities (forward-only)

When a new row lands in `synced_activities` (Strava sync, .FIT upload, Garmin) AND `auto_link_activities = true` AND `default_goal_id` is set:

- After a workout is matched/created from the activity (existing `training_workout_activities` flow), insert a `training_workout_goals(workout_id, goal_id = default_goal_id)` if no goal is linked yet.
- Done in the existing ingestion edge function / hook — no new infra.

Manual override remains: opening a workout still lets you change/add goals.

## 4. Auto-create the weekly objective

When the user opens the Training Plan for a week (or on the existing weekly-planning entry point) AND `auto_create_weekly_objective = true` AND `default_goal_id` is set AND no objective for `(default_goal_id, week_start)` exists:

- Create one `weekly_objectives` row tied to `default_goal_id` with a title like:
  `"Training week of {Mon DD} — {N} sessions / {total_km} km"`
- Re-compute and update its title/target whenever the plan changes that week (sessions added/removed/edited).
- Completion criterion: **both plan adherence + volume** (per the user's answer):
  - `completed_at` set when `sessions_completed / sessions_planned >= 1` **and** `actual_km >= planned_km * 0.9` (90% tolerance for volume).
  - Store the criterion on the objective so we can render a small "x/N sessions · y/z km" progress block on the objective card.

## 5. UI cleanup on Training Plan card

In `TrainingPlanCard.tsx`:

- Remove the "No goals linked yet" line.
- Remove the "Link to goal" button entirely.
- Keep the linked-goal Badge(s) display (now driven by the auto-linked default goal).
- Per-workout goal editing stays available inside the expanded workout row (existing).

If `default_goal_id` is not set, show a small inline nudge instead: *"Set a default training goal in Settings to auto-link activities."* (link → Training settings).

## 6. Technical notes

- Files touched:
  - Migration: `workout_preferences` add columns.
  - `src/hooks/useWorkoutPreferences.ts` — extend interface + defaults.
  - New `src/components/training/TrainingDefaultsSection.tsx` (settings UI) + wired into Training settings page and onboarding.
  - `src/hooks/useTrainingPlan.ts` — on plan create/update, upsert weekly objective; helper `ensureWeeklyTrainingObjective(weekStart)`.
  - Activity ingestion path (Strava/.FIT/Garmin handlers under `supabase/functions/...` and any client-side post-sync hook) — auto-insert `training_workout_goals`.
  - `src/components/thisweek/TrainingPlanCard.tsx` — remove link UI, add nudge fallback.
  - Objective completion recompute can live in a small client-side effect that runs when activities sync; no cron needed.
- Multi-goal support is preserved: `training_workout_goals` is many-to-many, so users can still attach a second goal per workout manually.

## Out of scope

- Retroactive linking of past weeks/activities.
- Per–activity-type routing rules (single default goal for now).
- Volume tolerance configurability (hard-coded 90% — easy to expose later).
