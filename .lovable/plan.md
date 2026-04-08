

# Plan: Integrate Olympic Feedback Principles into Check-ins (Revised)

## The Six Principles (mapped to features)

| Principle | Where | Implementation |
|-----------|-------|----------------|
| **1. Build a circle of advisors** | Weekly Planning | "Who is in your trusted feedback circle this week?" |
| **2. Separate feedback from opinions** | Daily Check-in | Preset: "Did I receive feedback today? Was it guidance or opinion?" |
| **3. Manage your emotional response** | Daily Check-in | Preset: "What triggered a strong reaction? What was signal vs. noise?" |
| **4. Separate identity from performance** | **Weekly Planning** | "Where did I tie my self-worth to an outcome this week?" |
| **5. Commit to applying feedback** | Weekly Planning | "What feedback am I committing to act on this week?" |
| **6. Use feedback for growth** | Weekly Planning | Covered by feedback commitment field |

## Changes

### 1. Daily check-in presets (`InlineCheckInSettings.tsx`)
Add **3** new suggestion chips (not 4 — #4 moves to weekly):
- "Did I receive feedback today — was it guidance or opinion?"
- "What triggered a strong reaction? What was signal vs. noise?"
- "What feedback am I sitting on instead of acting on?"

### 2. Weekly Planning dialog (`WeeklyPlanningDialog.tsx`)
Add a "Feedback & Growth" section with **3** fields:
- `feedback_commitment` — "What feedback will you commit to acting on this week?"
- `trusted_advisors` — "Who is in your trusted feedback circle?"
- `identity_reflection` — "Where did I tie my self-worth to an outcome this week?"

### 3. Database migration
Add three nullable text columns to `weekly_planning_sessions`:
- `feedback_commitment`
- `trusted_advisors`
- `identity_reflection`

### 4. Types (`src/types/habits.ts` + `src/integrations/supabase/types.ts`)
Add all three fields to `WeeklyPlanningSession` and `CreateWeeklyPlanningSession`.

### 5. History views
- `WeeklySessionDetailModal.tsx` — display new fields with Brain/Users/Shield icons
- `WeeklyPlanningTab.tsx` — show snippets in list and current-week cards

## Files changed
- `src/components/habits/InlineCheckInSettings.tsx` — 3 preset suggestions
- `src/components/habits/WeeklyPlanningDialog.tsx` — Feedback & Growth section (3 fields)
- `src/components/rituals/WeeklySessionDetailModal.tsx` — display new fields
- `src/components/rituals/WeeklyPlanningTab.tsx` — display new fields
- `src/types/habits.ts` — interface updates
- `src/integrations/supabase/types.ts` — DB types
- New migration SQL

