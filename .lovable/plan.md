

## Problem

The MCP server has two gaps that caused Claude to report "all workouts unmatched":

1. **`get_training_plan` and `get_training_history` only look up `matched_strava_activity_id`** — they completely ignore `matched_activity_id` (the UUID field used by .fit file uploads). So any workout matched via .fit upload appears as "pending/missed" to Claude even though the data is there.

2. **No "list activities" tool** — Claude has `get_activity_details` and `get_activity_laps` but both require knowing the activity ID upfront. There's no way to browse or search activities by date/type, so Claude can't discover .fit-uploaded activities that weren't auto-matched to a workout.

## Changes

### 1. Fix `get_training_plan` to resolve both match types
**File: `supabase/functions/mcp-server/training-tools.ts`**

In the handler (lines 103-116), collect both `matched_strava_activity_id` values AND `matched_activity_id` UUIDs. Fetch activities using two queries (or a combined approach): one `in("strava_activity_id", ...)` and one `in("id", ...)`. Build two maps and resolve the `actual` data from either. Update the result mapping (line 120) to check both maps. Include `activity_id` (the DB UUID) in the response so Claude can call `get_activity_laps` directly.

### 2. Fix `get_training_history` the same way
Same pattern — lines 194-207 have the identical Strava-only bug. Apply the same dual-lookup fix.

### 3. Add `list_activities` tool
A new tool that lists activities by date range, type, or source. Schema:
- `week_start` (optional, defaults to current week)
- `activity_type` (optional filter)
- `source` (optional: "strava", ".fit_upload")
- `limit` (default 20)

Returns activity summaries with IDs so Claude can drill into any of them with `get_activity_details` or `get_activity_laps`.

### 4. Update description strings
Change "matched Strava actual data" references to "matched actual data (Strava or .fit upload)" so Claude's prompts don't mislead about data availability.

## Technical detail

The dual-lookup pattern:

```text
// Collect both ID types
stravaIds = workouts.filter(w => w.matched_strava_activity_id).map(...)
directIds = workouts.filter(w => w.matched_activity_id).map(...)

// Fetch both sets
activities from strava_activity_id IN (stravaIds)
activities from id IN (directIds)

// Build lookup maps
stravaMap: strava_activity_id → activity
directMap: id → activity

// Resolve per workout
actual = directMap.get(w.matched_activity_id)
       || stravaMap.get(w.matched_strava_activity_id)
       || null
```

All changes are in a single file: `supabase/functions/mcp-server/training-tools.ts`.

