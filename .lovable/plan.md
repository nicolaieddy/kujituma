

# Training Plan Module

## Concept

A **Training Plan** is a weekly workout schedule you log from your coach, stored alongside your existing weekly flow. When Strava syncs, each planned workout gets matched against actual activities, letting you (and Claude via MCP) see exactly how you executed vs. what was prescribed.

## How It Fits Into the App

- Training plans live as a **sub-section of the "This Week" view** and optionally link to an existing Goal (e.g., "Marathon Training"). This keeps the UI clean -- no new top-level nav item.
- Each week has a list of **planned workouts** (day, workout type, description, target distance/duration/pace/notes from your coach).
- Strava sync automatically matches actual activities to planned workouts by day + activity type, populating the "actual" side with full Strava data.
- Unmatched or missed workouts are clearly visible.

## Database

### New table: `training_plan_workouts`
| Column | Type | Description |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | Owner |
| week_start | date | Monday of the week |
| goal_id | uuid (nullable FK) | Optional link to a goal |
| day_of_week | int (0-6) | 0=Mon, 6=Sun |
| workout_type | text | Run, Ride, Swim, etc. |
| title | text | e.g. "Tempo Run" |
| description | text | Coach's instructions |
| target_distance_meters | real (nullable) | |
| target_duration_seconds | int (nullable) | |
| target_pace_per_km | real (nullable) | Seconds per km |
| notes | text | Any extra coach notes |
| order_index | int | For ordering within a day |
| matched_strava_activity_id | bigint (nullable) | FK to synced_activities.strava_activity_id |
| created_at / updated_at | timestamptz | |

RLS: owner-only CRUD (standard pattern).

### Enrich `synced_activities` with more Strava data
Currently the table only stores `duration_seconds` and `distance_meters`. The Strava API returns much more. Add columns:
- `average_speed` (real)
- `max_speed` (real)
- `average_heartrate` (real)
- `max_heartrate` (real)
- `total_elevation_gain` (real)
- `calories` (int)
- `suffer_score` (int, nullable)
- `average_cadence` (real, nullable)
- `elapsed_time_seconds` (int) -- total time including stops
- `sport_type` (text)
- `description` (text, nullable) -- Strava activity description
- `workout_type_id` (int, nullable) -- Strava's workout type enum (race, long run, etc.)

### Update `strava-sync` edge function
- Fetch the additional fields from Strava's activity list endpoint (most are already returned by `/athlete/activities`)
- For heart rate, cadence, and suffer_score: call `/activities/{id}` detail endpoint for matched activities only (rate-limit friendly)
- Store enriched data in `synced_activities`
- After sync, auto-match planned workouts: for each `training_plan_workout` in the synced week, find a `synced_activity` on the same day with the same `activity_type` and link it

## UI Changes

1. **This Week view**: Add a collapsible "Training Plan" card below objectives/habits. Shows the week's planned workouts with planned vs. actual columns. Each row shows: day, title, planned distance/time, actual distance/time/pace/HR (from matched Strava data), and a status indicator (completed/missed/partial).

2. **Training Plan editor**: Simple form to add/edit planned workouts for a week. Dropdown for day, activity type, plus target fields. Copy-from-previous-week button for recurring structures.

3. **Goal detail**: If a training plan is linked to a goal, show a "Training" tab on the goal detail modal with historical plan-vs-actual data.

## MCP Tools (read + write)

**Read tools:**
- `get_training_plan` -- Get planned workouts for a week with matched Strava actuals (all enriched fields)
- `get_training_history` -- Get plan-vs-actual data across multiple weeks for trend analysis
- `get_strava_activity_details` -- Get full enriched data for a specific synced activity

**Write tools:**
- `set_training_plan` -- Create/update planned workouts for a week
- `match_workout` -- Manually override a plan-to-activity match

This gives Claude full access to analyze your training: compare planned vs. actual pace/distance/HR, identify patterns in missed workouts, track volume progression, etc.

## Goal Linking (Optional but Recommended)

Yes, linking to a goal makes sense. You likely have a running goal already. The training plan's `goal_id` column makes it optional -- you can log plans without a goal, or tie them to one. When linked, the goal detail page shows training adherence as part of progress.

## Implementation Order

1. Migration: create `training_plan_workouts` table + enrich `synced_activities`
2. Update `strava-sync` to store enriched fields + auto-match planned workouts
3. Build training plan UI (editor + plan-vs-actual card in This Week)
4. Add MCP read/write tools
5. Add goal detail training tab

## What Won't Change

- Existing habit tracking, objectives, and Strava mapping all stay the same
- The training plan is additive -- it doesn't replace habit completions, it adds a parallel "plan vs. actual" layer specifically for structured training

