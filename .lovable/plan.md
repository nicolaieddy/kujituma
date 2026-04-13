

## Current State

The training plan **already supports goal linking** — the "Add workout" and edit workout dialogs both have a multi-goal selector. Goal names appear as small tags on workout cards when linked. However, this is not discoverable because:

1. There's no indication on the Training Plan card header which goal(s) it's tied to
2. Users must open the edit dialog on each individual workout to see or set the link
3. There's no bulk "link all workouts to a goal" option

## Proposed Changes

### 1. Add goal association to the Training Plan card header
Show which goal(s) the training plan is linked to right in the card header, next to "Training Plan". Display as clickable badge(s) with the goal title. If no goals are linked, show a subtle "+ Link to Goal" button.

### 2. Add a "default goal" for the training plan
When creating new workouts via the dialog, pre-select the most common goal already used by other workouts in that week's plan. This way, if you link the first workout to "Marathon Training", subsequent workouts auto-inherit that association.

### 3. Bulk link option
Add a dropdown action in the card header to "Link all workouts to goal..." which applies a goal to every workout in the plan at once.

## Technical Details

**Files to modify:**
- `src/components/thisweek/TrainingPlanCard.tsx` — Add goal badges to header, compute dominant goal from workouts, add bulk-link action
- `src/components/thisweek/TrainingWorkoutDialog.tsx` — Accept and use a `defaultGoalIds` prop to pre-select goals for new workouts

**Implementation:**
- Compute `dominantGoalIds` from the most frequently used goal_ids across workouts in the current week
- Pass `defaultGoalIds={dominantGoalIds}` to `TrainingWorkoutDialog` for new workout creation
- Add a "Link to Goal" button in the header that opens a simple goal picker popover, then bulk-updates all workouts
- Show linked goal name(s) as Badge components next to the "Training Plan" title

