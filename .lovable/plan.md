

## Auto-Detect Timezone

Instead of a manual timezone picker, Kujituma will automatically capture `Intl.DateTimeFormat().resolvedOptions().timeZone` from the browser on each login/session and persist it to the user's profile. The edge functions then use this stored timezone for date calculations.

### Changes

**1. Migration: add `timezone` to `profiles`, `activity_date` to `synced_activities`**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE synced_activities ADD COLUMN IF NOT EXISTS activity_date date;
```

**2. Auto-detect on session start (`src/contexts/AuthContext.tsx`)**
- After successful auth, call a small upsert:
```typescript
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
await supabase.from('profiles').update({ timezone: tz }).eq('id', user.id);
```
- This runs silently on every login/page load, so if the user travels, the timezone updates automatically.
- Debounce or guard so it only fires once per session (e.g., compare against a ref).

**3. Fix `parse-fit-file/index.ts`**
- After authenticating the user, fetch their timezone:
```typescript
const { data: profile } = await adminClient
  .from('profiles').select('timezone').eq('id', user.id).single();
const tz = profile?.timezone || 'UTC';
```
- Derive local activity date:
```typescript
const activityDate = new Date(startDate)
  .toLocaleDateString('en-CA', { timeZone: tz }); // "2026-04-13"
```
- Use `activityDate` for duplicate detection and workout auto-matching instead of `startDate.split("T")[0]`.
- Store it in the new `activity_date` column.

**4. Fix `strava-sync/index.ts`**
- Same pattern: fetch user timezone, derive `activity_date` from the UTC timestamp.

**5. Backfill existing activities**
- Migration to recompute `activity_date` for existing rows using a default timezone (UTC), which can be corrected on next login when the real timezone is stored.

### Why This Is Better
- Zero user effort — no settings page, no picker
- Automatically adapts when traveling
- Browser API is reliable and gives IANA timezone strings (e.g., `America/Chicago`)
- Edge functions get the timezone from the DB, so server-side date logic is always correct

