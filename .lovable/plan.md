

# Remove Inline Checkboxes from Collapsed Habit Goal Cards

## Problem
The collapsed view shows one checkbox per habit due today, but without labels they're just mysterious squares. For a goal with 2 habits, you see 2 unlabeled checkboxes -- no way to know which is which without hovering.

## Solution
Replace the inline checkboxes with a simple completion count badge (e.g., "1/2") on the collapsed row. When all are done, show a green check icon instead. Users expand the card to interact with the full labeled weekly grid.

## Technical Change

### File: `src/components/thisweek/HabitGoalCard.tsx`

**Lines 142-178** -- Replace the `{!isExpanded && ...}` block:

Remove the `todayHabits` checkbox loop entirely. Replace with:
- A text badge showing `{completedToday}/{totalDueToday}` when there are due habits
- A green `Check` icon when all due habits are completed
- Nothing if no habits are due today

This is a single-block replacement in one file. No other files change.

