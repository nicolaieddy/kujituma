

## Problem

The `activity_date` for .fit uploads is still wrong despite the timezone fix. Database confirms: your Monday evening run (`start_date: 2026-04-14 00:28:10+00`) has `activity_date: 2026-04-14` instead of `2026-04-13`. Your profile timezone is correctly stored as `America/Detroit`.

The likely cause: the Deno runtime's `toLocaleDateString("en-CA", { timeZone })` may not behave reliably, OR the edge function was deployed before the timezone fix was applied. Either way, the approach of relying on the server to do timezone conversion has a fragile dependency.

## Your Request (3 parts)

1. **Send the browser timezone with the upload request** so the edge function doesn't depend on a potentially stale/unsynced profile value
2. **Historical activities stay untouched** — changing your timezone should never retroactively update old `activity_date` values
3. **Show timezone in profile settings** with a manual override option

## Changes

### 1. Send timezone from the browser with the upload
**File: `src/hooks/useFitFileUpload.ts`**

In `uploadAndParse()`, add `timezone: Intl.DateTimeFormat().resolvedOptions().timeZone` to the request body sent to `parse-fit-file`. This ensures the edge function always has the correct timezone at upload time, regardless of profile sync state.

### 2. Fix the edge function date derivation
**File: `supabase/functions/parse-fit-file/index.ts`**

- Accept `timezone` from the request body, fall back to profile timezone, then UTC
- Replace `toLocaleDateString("en-CA", ...)` with a more reliable manual offset calculation using `Intl.DateTimeFormat` parts extraction (which is more reliable across runtimes)
- The computed `activity_date` is baked into the row at insert time and **never updated retroactively**

### 3. Apply the same fix to Strava sync
**File: `supabase/functions/strava-sync/index.ts`**

Same timezone-aware date derivation for Strava-sourced activities.

### 4. Show timezone in profile + manual update
**File: `src/components/profile/ProfileEditForm.tsx`**

- Add a read-only "Timezone" field in the profile settings showing the current stored value (e.g., "America/Detroit")
- Add a small "Update to current" button that detects the browser timezone and updates the profile if different
- This is display + manual override only — it does NOT retroactively change any existing activity dates

### 5. Ensure historical immutability
- Remove the `syncTimezone` auto-update from `AuthContext.tsx` that silently overwrites timezone on every session. Instead, only set it if the profile has no timezone yet (first-time setup)
- The `activity_date` column is write-once at ingestion time — no triggers or cascading updates

## Technical detail

Reliable timezone date extraction in Deno:
```typescript
function getLocalDate(utcIso: string, tz: string): string {
  const d = new Date(utcIso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const dd = parts.find(p => p.type === "day")!.value;
  return `${y}-${m}-${dd}`;
}
```

## Files to change

- `src/hooks/useFitFileUpload.ts` — send timezone in request body
- `supabase/functions/parse-fit-file/index.ts` — accept request timezone, use reliable date derivation
- `supabase/functions/strava-sync/index.ts` — same date derivation fix
- `src/components/profile/ProfileEditForm.tsx` — show timezone + manual update button
- `src/contexts/AuthContext.tsx` — only set timezone if not already stored (preserve historical)

## What stays the same

- Existing `activity_date` values in the database are **not touched**
- The `timezone` column on `profiles` remains — it's just not auto-overwritten on every login anymore

