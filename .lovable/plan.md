

# Habits This Week - UX Redesign

## Current Issues

- Collapsed goal cards show minimal info ("3 habits", "2 habits") -- no at-a-glance progress
- No visual indication of today's completion status without expanding
- Streak indicators are tiny and easy to miss
- All cards look the same regardless of completion state
- The expand/collapse chevron is generic and uninviting
- No progress bars or visual momentum cues

## Proposed Redesign

### 1. Progress Bar on Each Collapsed Goal Card

Add a slim progress bar below the goal title showing today's completion ratio (e.g., 2/3 habits done). This gives instant feedback without expanding.

### 2. Inline Habit Previews on Collapsed Cards

Show small completion dots or mini checkmarks for each habit item directly on the collapsed card row, so users can see which habits are done/pending without expanding.

### 3. Visual State Differentiation

- **All done today**: Card gets a subtle green left border and background tint
- **Partially done**: Default style with progress bar showing how far along
- **Nothing done yet**: Subtle amber/warm accent to draw attention

### 4. Streak Badges Redesigned

Replace the small inline "6d" text with a more prominent pill badge on the card (e.g., a flame icon with "6 day streak" in a rounded badge). Make at-risk streaks visually urgent with a warm amber background.

### 5. Auto-Expand Today's Priority

Goals with habits due today that are not yet completed will be expanded by default, reducing the number of clicks needed. Already-completed goals collapse automatically.

### 6. Improved Expanded View

- Add a subtle habit name + checkbox inline row (less indentation, cleaner spacing)
- Show the day grid (M T W T F S S) more prominently with larger touch targets on mobile
- Add a "Complete All" quick action when multiple habits are pending

---

## Technical Details

### Files to Modify

**`src/components/thisweek/HabitsDueThisWeek.tsx`** (main changes)

1. **Auto-expand logic**: Initialize `expandedGoals` state with goals that have incomplete habits due today
2. **Collapsed card redesign**:
   - Add a thin `Progress` bar component below the title showing `completedToday / totalDueToday`
   - Render mini completion indicators (small colored dots) for each habit item
   - Apply conditional left-border and bg colors based on completion state
3. **Streak badge upgrade**: Replace `<Flame>` + text with a styled pill `<Badge>` containing the streak count and status
4. **"Complete All" button**: When expanded and multiple habits are pending, show a bulk-complete button that iterates through `handleDayToggle` for each unchecked daily habit
5. **Larger day checkboxes on mobile**: Increase checkbox size from `h-6 w-6` to `h-8 w-8` on small screens using responsive classes

### New Sub-Components (extracted for clarity)

- **`HabitGoalCard`**: Extracted collapsed/expanded goal card (keeps the main file cleaner)
- **`HabitProgressDots`**: Row of small colored dots showing per-habit completion at a glance

### No new dependencies required. Uses existing `Progress`, `Badge`, `Checkbox`, and `cn()` utilities.

