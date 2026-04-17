

## Sleep Data Ingestion (CSV) + Daily Display + MCP Exposure

Add support for uploading Garmin-style sleep CSVs alongside existing `.fit`/`.zip` uploads, store one row per night, surface it on the matching day in the Training Plan, and expose it via MCP.

### 1. Database — new `sleep_entries` table

Migration adds:
```
sleep_entries (
  id uuid pk, user_id uuid, sleep_date date,           -- one per user per date
  score int, quality text,                              -- e.g. 91, 'Excellent'
  duration_seconds int, sleep_need_seconds int,
  bedtime time, wake_time time,
  resting_heart_rate int, body_battery int,
  pulse_ox numeric, respiration numeric,
  skin_temp_change numeric, hrv_status text,
  sleep_alignment text, source text default 'garmin_csv',
  raw_row jsonb,
  created_at, updated_at
  unique (user_id, sleep_date)
)
```
RLS: standard user-scoped CRUD policies.

### 2. Edge function — new `parse-sleep-csv`

Accepts `{ file_path, timezone }`, downloads from `fit-files` bucket (reuse), parses CSV:
- Skips Garmin BOM + header row
- Parses each data row, ignoring rows where Score is `--`
- Converts `7h 21min` → seconds, `1:22 AM` → time, `--` → null
- Upserts on `(user_id, sleep_date)` (overwrite latest)
- Returns `{ summary: { entries_imported, dates: [...] } }`

No duplicate confirmation flow needed — sleep upserts are non-destructive (new data wins, since it represents the latest reading from the device for that night).

### 3. Hook — extend `useFitFileUpload` → rename or keep, add CSV branch

Inside `uploadAndParse`:
- Detect extension: `.fit`/`.zip` → `parse-fit-file` (existing); `.csv` → `parse-sleep-csv` (new)
- `FileUploadStatus` gains a `kind: "activity" | "sleep"` field for display
- Result summary differs by kind (sleep shows `N nights imported`)

### 4. UI — single multi-type upload entry point

`BulkFitUploadDialog`:
- File input `accept=".fit,.zip,.csv"`, multiple
- Header label updated to "Bulk Upload Activities & Sleep"
- Per-row result rendering: activity rows show type/laps; sleep rows show `N nights · score range`
- Title/help text mentions both formats

The button in `TrainingPlanCard` stays the same — just opens the now-multi-format dialog.

### 5. Daily display — `SleepSummaryRow` on each day

In `TrainingPlanCard`'s per-day section header, query sleep entries for the visible week range (one new hook `useWeekSleepEntries(weekStart)`).

For each day, render a compact row above the workouts list when sleep data exists for that date:
```text
[moon icon] 7h 21m • Score 91 (Excellent) • RHR 41 • Body Battery 36 • 1:22 AM → 8:52 AM
```
- Subtle styling: muted bg, small text, single line on desktop, wraps on mobile
- Empty days show nothing (no placeholder noise)

### 6. MCP tools — expose full sleep data per day

In `read-tools.ts`, add:
- `get_sleep_entry({ date })` — returns full row for that date (or null)
- `get_sleep_entries({ start_date, end_date })` — range query (capped at 90 days)

Both return all columns including `raw_row` so the agent has complete fidelity. Update `mem://architecture/mcp-server-v2` reference list.

### 7. Memory

- New: `mem://features/training/sleep-ingestion` — describes CSV parser, upsert semantics, daily UI placement, and MCP exposure
- Update `mem://index.md` references list

### Files

**New**:
- `supabase/migrations/<new>.sql`
- `supabase/functions/parse-sleep-csv/index.ts`
- `src/hooks/useWeekSleepEntries.ts`
- `src/components/thisweek/SleepSummaryRow.tsx`
- `mem://features/training/sleep-ingestion`

**Edited**:
- `src/hooks/useFitFileUpload.ts` (add CSV branch + kind field)
- `src/components/training/BulkFitUploadDialog.tsx` (accept .csv, label updates, sleep result rendering)
- `src/components/thisweek/TrainingPlanCard.tsx` (render `SleepSummaryRow` per day)
- `supabase/functions/mcp-server/read-tools.ts` (sleep tools)
- `mem://index.md`

### Notes
- Sleep is stored independent of activities (no FK) — sleep is a separate signal
- Date attribution: `sleep_date` as written in CSV (already local-day on Garmin export)
- Garmin CSV has UTF-8 BOM — strip it before parsing
- No timezone-shift risk because sleep_date is a `date`, not a timestamp

