

# .FIT File Upload & Parse Feature

## Architecture

```text
User uploads .fit file in Kujituma UI
        ↓
Supabase Storage bucket (fit-files)
        ↓
Edge Function: parse-fit-file
  - Reads binary .fit from storage
  - Parses with fit-file-parser library
  - Extracts: sessions, laps, records (HR, pace, cadence, power, GPS)
        ↓
Stores structured data in DB:
  - synced_activities (enriched session-level)
  - activity_laps (new table: per-lap splits)
  - activity_streams (new table: second-by-second data for charts)
        ↓
Auto-matches to training_plan_workouts (same logic as Strava sync)
        ↓
Claude reads via existing MCP tools (get_training_plan, get_strava_activity_details)
```

## Database Changes

1. **New table: `activity_laps`** — stores per-lap data (distance, duration, avg HR, avg pace, avg cadence, avg power) linked to synced_activities
2. **New table: `activity_streams`** — stores time-series records (timestamp, HR, pace, cadence, power, lat/lng, altitude) for detailed charts. Optional — can defer if too much data volume.
3. **Enrich `synced_activities`** with additional fields from .fit: avg power, normalized power, TSS, training effect, max cadence, source (strava | fit_upload | manual)
4. **Storage bucket: `fit-files`** — private bucket for raw .fit uploads

## Edge Function: `parse-fit-file`

- Receives: `{ file_path, user_id, workout_id? }`
- Uses `fit-file-parser` (npm) to decode the binary
- Extracts session summary → upserts into `synced_activities`
- Extracts lap data → inserts into `activity_laps`
- Optionally extracts record stream → inserts into `activity_streams`
- Auto-matches to any unmatched `training_plan_workouts` for that day
- Returns parsed summary

## UI Changes

1. **Upload button** on TrainingWorkoutCard — "Upload .fit file" for unmatched workouts
2. **Upload section** on Profile/Integrations page — bulk upload historical .fit files
3. **Lap splits table** in the "Show full breakdown" section of TrainingWorkoutCard
4. Optional: HR/pace chart from stream data in workout detail

## MCP Enhancement

- Update `get_strava_activity_details` → rename to `get_activity_details`, support both Strava-synced and .fit-uploaded activities
- Add `get_activity_laps` tool for lap-level data
- Claude can then do deep analysis: "Your lap 3 pace dropped 15s/km while HR spiked — you went out too fast"

## Implementation Order

1. Create storage bucket + database tables (migration)
2. Build `parse-fit-file` edge function with fit-file-parser
3. Add upload UI on TrainingWorkoutCard + auto-match logic
4. Add lap splits display in workout card breakdown
5. Update MCP read tools for lap/stream data

## Technical Notes

- `fit-file-parser` is available on npm and works in Deno via `npm:` specifier
- .fit files are typically 50KB-2MB, well within edge function limits
- The source field on synced_activities distinguishes Strava vs manual upload data
- GPS stream data could enable future map visualization of routes

