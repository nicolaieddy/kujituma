

# Habits Section: Reduce Prominence

## Problem
The habits section currently takes up too much vertical space and visual weight. As a user, you want to quickly check off today's habits and then focus on your objectives -- the primary content of the weekly view.

## Proposed Redesign: Compact Habit Strip

Replace the current full card with a slim, lightweight section that prioritizes speed of interaction over information density.

### Key Changes

1. **Remove the outer Card wrapper** -- no CardHeader/CardTitle chrome. Replace with a simple section that blends into the page rather than demanding attention.

2. **Single-line collapsed view per goal** -- each goal shows: title, today's checkboxes inline (not hidden behind expand), and a small progress indicator. No progress bar, no dots row -- just the checkboxes themselves.

3. **Today-first layout** -- show only today's habit checkboxes directly on the collapsed row. The full M-T-W-T-F-S-S grid only appears when expanded (for reviewing the week). This cuts vertical space dramatically.

4. **Smaller section header** -- replace the current bold card title with a subtle label like "Habits" with a small completion count, styled as a muted sub-heading rather than a card title.

5. **Move streak badges to expanded view only** -- streaks are motivating but not needed at first glance. Show them only when a goal is expanded.

6. **Remove the Duolingo integration card from this section** -- it adds visual bulk. Move it to a collapsible area or only show it in expanded view.

### Visual Comparison

**Before (current):**
```text
+------------------------------------------+
| [icon] Habits This Week    [streaks] [3/5]|
|------------------------------------------|
| > Goal A          [streak] [2/3]         |
|   [====progress bar====] [o o .]         |
|                                          |
| v Goal B          [streak] [1/2]         |
|   [Complete All]                         |
|   Habit 1   M T W T F S S               |
|   Habit 2   M T W T F S S               |
+------------------------------------------+
```

**After (proposed):**
```text
Habits                              2/5 today
--------------------------------------------
Goal A    [x] Habit1  [x] Habit2  [ ] Habit3  >
Goal B    [x] Habit1  [ ] Habit2              >
```

Each row is a single line. Clicking the chevron or row expands to show the full week grid. The section takes roughly 30-40% of the current vertical space.

## Technical Details

### Files to Modify

**`src/components/thisweek/HabitsDueThisWeek.tsx`**
- Remove the outer `Card`, `CardHeader`, `CardTitle` wrapper
- Replace with a simple `div` with a muted heading ("Habits") and inline completion count
- Remove the Duolingo section from the top level (move inside expanded goal or remove entirely)
- Remove the active-streaks badge from the header

**`src/components/thisweek/HabitGoalCard.tsx`**
- Redesign collapsed view: show today's habit names with inline checkboxes on one line (no progress bar, no dots component)
- Move streak badges to only appear in expanded view
- Keep the expanded view mostly as-is (full week grid) since it's opt-in
- Remove the left-border color states (green/amber) to reduce visual noise -- use a subtle check icon instead when all done
- Reduce padding from `p-2 sm:p-3` to `py-1.5 px-2` for compactness

**`src/components/thisweek/HabitProgressDots.tsx`**
- No longer used in collapsed view (still available if needed elsewhere)

### No new dependencies or files needed.

