

# Fix Objective Reordering

## Problem

Dragging objectives to reorder them doesn't persist. The list snaps back to its original order after a refetch because:

1. `handleReorderObjective` only updates the **single dragged item's** `order_index`, leaving all other objectives at their original values (mostly `0`)
2. The database query sorts by `order_index ASC, created_at ASC`, so objectives sharing the same `order_index` fall back to creation-time order
3. Carried-over objectives all get `order_index: 0`, making the problem worse

## Solution

Update **all objectives' order indices** after a drag-and-drop reorder, not just the moved one.

## Technical Changes

### 1. `WeeklyObjectivesList.tsx` - Pass full reordered list

Change `handleDragEnd` to pass the complete reordered ID list (instead of a single ID + index):

```
onReorderObjectives(newObjectives.map((obj, i) => ({ id: obj.id, order_index: i })));
```

### 2. `useObjectiveHandlers.ts` - Batch update all indices

Replace `handleReorderObjective(objectiveId, newIndex)` with `handleReorderObjectives(updates: {id, order_index}[])` that updates every objective's `order_index` in one go via the existing `updateObjective` call (or a new batch service method).

### 3. `WeeklyProgressService.ts` - Add batch reorder method

Add `reorderObjectives(updates: {id: string, order_index: number}[])` that performs a single batched update to set all order indices at once, avoiding N individual update calls.

### 4. `useObjectiveMutations.ts` - Add reorder mutation

Add a dedicated `reorderMutation` with optimistic update support so the UI stays in sync immediately and doesn't snap back.

### 5. `useWeeklyObjectives.ts` - Expose reorder function

Wire up the new batch reorder through the hook's return value.

### 6. `ThisWeekView.tsx` - Update handler reference

Switch from `handleReorderObjective` to the new `handleReorderObjectives` and update the prop passed to `WeeklyObjectivesList`.

### Files Modified

| File | Change |
|------|--------|
| `src/services/weeklyProgressService.ts` | Add `reorderObjectives()` batch method |
| `src/hooks/useObjectiveMutations.ts` | Add `reorderMutation` with optimistic updates |
| `src/hooks/useWeeklyObjectives.ts` | Expose `reorderObjectives` |
| `src/hooks/useObjectiveHandlers.ts` | Replace single-item reorder with batch reorder |
| `src/components/goals/WeeklyObjectivesList.tsx` | Update `handleDragEnd` to pass full reordered list |
| `src/components/thisweek/ThisWeekView.tsx` | Wire up new handler |

