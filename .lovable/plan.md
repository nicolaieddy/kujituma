

# Mobile Feature Parity Plan

## Problem

Five interactive controls are completely hidden on mobile instead of being adapted for smaller screens. This means mobile users can't schedule objectives, link goals, or see their active habits count.

## Changes

### 1. Objective "Link goal" button (ObjectiveItem.tsx)

Currently `hidden sm:flex`. Change to always visible but with a compact icon-only style on mobile (no "Link goal" text, just the Target icon).

### 2. Objective "Schedule" time blocker (ObjectiveItem.tsx)

Currently `hidden sm:block`. Show on all screens. The `ObjectiveTimeBlocker` component itself likely needs no changes -- it already renders as a small button/popover. Just remove the `hidden sm:block` wrapper.

### 3. Goal edit pencil icon (ObjectiveItem.tsx)

Currently `hidden sm:flex`. Change to always visible. It's already a tiny 12px icon -- no reason to hide it on mobile.

### 4. Goal name Target icon (ObjectiveItem.tsx)

Currently `hidden sm:block`. A minor decorative element. Change to always visible since it's only 12px.

### 5. Active habits count in HabitStreaksSummary (HabitStreaksSummary.tsx)

Currently `hidden sm:flex`. Show on all screens. The divider before it (`hidden sm:block`) should also be made visible.

## Technical Details

All changes are in two files:

**src/components/goals/ObjectiveItem.tsx** (4 changes)
- Line 246: `hidden sm:block` on Target icon -> remove `hidden sm:block`
- Line 254: `hidden sm:flex` on pencil button -> remove `hidden sm:flex`, keep other classes
- Line 279: `hidden sm:flex` on "Link goal" button -> show icon-only on mobile: always visible, hide text below `sm` breakpoint
- Line 287: `hidden sm:block` wrapper on ObjectiveTimeBlocker -> remove `hidden sm:block`

**src/components/thisweek/HabitStreaksSummary.tsx** (2 changes)
- Line 92: divider `hidden sm:block` -> remove hidden class
- Line 95: active habits `hidden sm:flex` -> remove hidden class

No database changes. No new files. No new dependencies.
