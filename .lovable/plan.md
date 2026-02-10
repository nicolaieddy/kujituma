
# Improve Partner Dashboard: Weekly Performance Review Experience

## Problem

When viewing an accountability partner's page, it's hard to see how their past week went and hard to provide feedback. The check-in history dominates the screen, the actual performance data (objectives, habits) is buried below the fold, and there's no consolidated "weekly scorecard" view.

## Proposed Changes

### 1. Reorder the Page Layout (High Impact, Low Effort)

Move the weekly performance content above the check-in history so you immediately see what matters:

```
Current order:              New order:
1. Partner Header           1. Partner Header
2. Check-in History  <--    2. Weekly Performance Card (merged)
3. Week Navigator           3. Habits Review (week-aware)
4. Weekly Focus             4. Check-in History (collapsed)
5. Habits Review            5. Goals Kanban
6. Goals Kanban             6. Visibility Timeline
```

### 2. Merge Week Navigator + Objectives into a Single "Weekly Performance Card"

Combine the currently separate "week header" card and "Weekly Focus" card into one unified card with:

- Week navigation arrows and date range at the top
- A **progress summary row** showing: completion rate (e.g., "5/8 done -- 63%"), a small progress bar, and the number of habits completed that week
- The objectives list below the summary
- Feedback buttons remain on each objective

This gives an instant at-a-glance view of how the week went before diving into details.

### 3. Make Habits Follow Week Navigation

Currently `PartnerHabitsCard` always shows the current week. Pass the `selectedWeekStart` state to it so that when you navigate to a past week, you see that week's habit completions -- not today's.

### 4. Collapse Check-in History by Default

Since the check-in history is now below the performance content, keep it collapsed by default (showing just the header with count), and expand on click. This keeps the page focused on performance review.

### 5. Add a "Weekly Note" Quick Action

Add a small text input at the bottom of the Weekly Performance Card that lets you quickly leave a general note about the whole week (e.g., "Great progress this week!" or "Let's discuss the missed habits"). This sends a check-in message tagged with the viewed week context, so it shows up in the check-in history with the correct week label.

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/PartnerDashboard.tsx` | Reorder sections, merge week nav + objectives into one card, add progress summary row, add quick note input, pass `selectedWeekStart` to PartnerHabitsCard |
| `src/components/accountability/PartnerHabitsCard.tsx` | Already accepts `weekStart` prop -- just needs the parent to pass the selected week instead of defaulting to current |

### No New Files or Database Changes

This is purely a UI restructuring and prop-wiring change. All the data is already being fetched -- it just needs to be presented differently.

### Progress Summary Row (New UI Element)

Inside the merged card, add a row like:

```text
[==========------]  5/8 objectives  |  3/4 habits  |  63% complete
```

Built from existing data:
- `completedObjectives / totalObjectives` (already calculated)
- `habitStats` completion counts (already available)

### Quick Note Input

A simple inline form at the bottom of the performance card:

```text
[Leave a note about this week...        ] [Send]
```

On submit, calls `handleRecordCheckIn(message)` with the note text. The check-in is automatically tagged with the viewed week.
