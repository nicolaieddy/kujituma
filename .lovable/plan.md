# Sleep Module

A new optional module that turns the existing `sleep_entries` data (Garmin CSV ingestion, already in place) into a first-class feature with its own page, trends, and a bedtime-consistency streak.

## Scope

- Register `sleep` as a new module in `src/modules/registry.ts`.
- New page `/sleep` (route + nav entry), gated by `RequireModule`.
- Modules store card so users can install/uninstall it.
- Auto-install for existing users who already have rows in `sleep_entries`.
- Gate the sleep summary row inside the Training Plan card so it only shows when the Sleep module is installed (Training Plan no longer "owns" sleep).

Note: ingestion stays where it is today (Garmin CSV upload via the multi-format dialog). No changes to ingestion or schema.

## Sleep page contents

Single `/sleep` page, mobile-first, three stacked sections:

1. **Header stats (last 7 / 30 days toggle)**
   - Avg sleep score
   - Avg duration (h m)
   - Avg bedtime / wake time
   - Bedtime consistency streak (see definition below)

2. **Sleep score trend**
   - Line chart of nightly `score` over the selected range (recharts, semantic tokens).
   - Reference band for "good" (>= 80) using muted token.
   - Empty state when no rows in range.

3. **Bedtime consistency**
   - Bar/dot chart of nightly `bedtime` over the range, with a target band (default 22:30 ± 30 min, user-adjustable later — v1 hardcoded with a TODO).
   - "Current streak" and "Best streak" of consecutive nights where bedtime fell inside the band.
   - List of the last 14 nights with bedtime, duration, score, and a green/red dot for in-band.

## Streak definition (v1)

- A night "counts" toward the streak when `bedtime` is within ±30 min of 22:30 local.
- Streak resets on any night with `bedtime` outside the band OR a missing entry for that date (no row at all).
- Computed client-side from the same `sleep_entries` query that powers the page — no new DB work.

## Module registry entry

```ts
{
  id: "sleep",
  name: "Sleep",
  tagline: "Track sleep score trends and build a bedtime consistency streak.",
  coverEmoji: "😴",
  category: "health",
  tier: "free",
  status: "available",
  surfaces: {
    pages: ["/sleep"],
    navItems: ["Sleep"],
    profileSections: ["Sleep import (Garmin CSV)"],
    mcpToolPrefixes: ["sleep_"],
  },
  dataTables: ["sleep_entries"],
}
```

Also remove `sleep_entries` from the `training_plan` module's `dataTables` list so the two modules don't overlap.

## Files

- New: `src/pages/Sleep.tsx`, `src/components/sleep/SleepScoreTrend.tsx`, `src/components/sleep/BedtimeConsistency.tsx`, `src/hooks/useSleepEntriesRange.ts` (parameterised by start/end date, returns rows + computed streak).
- Edit: `src/modules/registry.ts` (add Sleep, trim Training Plan), `src/App.tsx` (route under `RequireModule id="sleep"`), `src/components/layout/NavigationMenu.tsx` (nav entry inside a `ModuleGate`), `src/components/thisweek/TrainingPlanCard.tsx` (wrap `SleepSummaryRow` in `ModuleGate id="sleep"`).

## Backfill

One migration that inserts a `user_modules` row with `module_id='sleep'` for every distinct `user_id` already present in `sleep_entries`, so existing Garmin users see it pre-installed. New users start without it.

## Out of scope (future)

- Editable target bedtime window in profile.
- Correlation views (sleep vs energy/mood/workout) — belongs in Analytics later.
- Apple Health / Oura ingestion.
