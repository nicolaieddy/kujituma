

# Fix: Timezone Bug in Habit Completions Week Calculation

## Root Cause
`ThisWeekView.tsx` line 353 passes `new Date(currentWeekStart)` where `currentWeekStart` is a `"YYYY-MM-DD"` string. `new Date("2026-04-07")` is parsed as UTC midnight, which for users west of UTC becomes the previous day in local time. This causes `useHabitCompletions` to calculate the wrong week start (e.g., March 30 instead of April 7).

## Fix
Replace unsafe `new Date(string)` parsing with timezone-safe local date construction everywhere a `"YYYY-MM-DD"` week start string is converted to a `Date`. The pattern is:

```typescript
// BEFORE (broken):
new Date(currentWeekStart)

// AFTER (safe):
const [y, m, d] = currentWeekStart.split('-').map(Number);
new Date(y, m - 1, d)
```

## Files to Change

1. **`src/components/thisweek/ThisWeekView.tsx`** (line 353) -- the primary bug location. Parse `currentWeekStart` string safely before passing to `HabitsDueThisWeek`.

2. **Audit all other `new Date(weekStartString)` calls** across the codebase to prevent the same bug elsewhere. Common locations include components and hooks that receive week start strings and convert to Date objects. I'll search for and fix all instances of this pattern.

3. **Consider adding a utility function** like `parseLocalDate(dateStr: string): Date` in `src/utils/dateUtils.ts` to centralize the safe parsing pattern and prevent future regressions.

## Impact
This fix will make the habits page show the correct week's completions, matching what the daily check-in already shows. No database changes needed -- the data is already correct.

