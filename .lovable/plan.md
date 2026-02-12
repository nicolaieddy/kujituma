

# Historical Week Summary Card

## Overview

When viewing a past week (not the current week), a new "Week in Review" summary card appears at the top of the weekly plan view. It consolidates key metrics and reflections from that week into a compact, read-only dashboard. This replaces the need to scroll through the full weekly layout to understand how the week went.

## What It Shows

The summary card has four sections, each shown only when data exists:

### 1. Objectives Performance (from `weekly_objectives`)
- Completion rate as a progress bar (e.g., "5/8 completed - 63%")
- Count of completed vs incomplete objectives
- Visual indicator: green for high completion, amber for moderate, red for low

### 2. Habit Completions (from `habit_completions`)
- Total habit completions for the 7 days of that week
- Completion rate across all habits (e.g., "22/35 completed - 63%")
- Mini day-by-day indicator (7 dots, colored by how many habits were completed that day)

### 3. Daily Check-ins (from `daily_check_ins`)
- How many days the user checked in that week (e.g., "5/7 days")
- Average mood and energy ratings with small emoji/icon indicators
- Quick wins or blockers mentioned (collapsed, expandable)

### 4. Weekly Reflection (from `weekly_progress_posts.notes`)
- Shows the user's written weekly reflection if one exists
- Read-only preview, truncated with "show more" if long
- Includes incomplete objective reflections if recorded

## Implementation

### New Component: `HistoricalWeekSummary.tsx`
- Located in `src/components/thisweek/`
- Accepts `weekStart: string` prop
- Only renders when the viewed week is not the current week
- Uses existing hooks to fetch data:
  - `useWeeklyProgress(weekStart)` for objectives and reflection notes
  - `useHabitCompletions(weekStartDate)` for habit data
  - Direct Supabase query for daily check-ins in the date range (Mon-Sun)
  - `useWeeklyPlanning(weekStart)` for planning session data (intention)

### New Hook: `useHistoricalWeekData.ts`
- Fetches daily check-ins for a specific week date range
- Fetches habit completions count for the week
- Combines with already-available objectives data
- Computes summary metrics (averages, counts, rates)

### Integration Point: `ThisWeekView.tsx`
- Add `<HistoricalWeekSummary weekStart={currentWeekStart} />` right after the `WeekHeader`
- Only shown when `!isCurrentWeek`
- Collapsible via a chevron toggle, defaults to expanded

## Technical Details

### Data Queries (in `useHistoricalWeekData`)

**Daily check-ins for the week:**
```sql
SELECT * FROM daily_check_ins
WHERE user_id = auth.uid()
  AND check_in_date >= weekStart
  AND check_in_date <= weekEnd
ORDER BY check_in_date ASC
```

**Habit completions for the week:**
```sql
SELECT * FROM habit_completions
WHERE user_id = auth.uid()
  AND completion_date >= weekStart
  AND completion_date <= weekEnd
```

**Goals with habits (for total count):** reuse existing `useHabitStats` data or query goals with `is_recurring = true`.

### No database changes needed
All data already exists in existing tables. This is purely a frontend feature that queries existing data in a week-scoped way.

### Files to Create
| File | Purpose |
|------|---------|
| `src/hooks/useHistoricalWeekData.ts` | Fetches and computes check-ins + habit stats for a specific week |
| `src/components/thisweek/HistoricalWeekSummary.tsx` | The summary card component |

### Files to Modify
| File | Change |
|------|--------|
| `src/components/thisweek/ThisWeekView.tsx` | Add `HistoricalWeekSummary` after `WeekHeader` when `!isCurrentWeek` |

### UI Design
- Card with `border-primary/20 bg-primary/5` styling (consistent with existing cards)
- Collapsible with header "Week in Review"
- 2x2 grid layout on desktop, stacked on mobile
- Each section is a mini-card with an icon, title, and metric
- Muted color palette since it's historical/read-only data
- Uses existing UI components (Card, Progress, Badge, Collapsible)

