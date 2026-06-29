## Goal

Lift the DnD wiring, optimistic state, and column layout that's currently duplicated across `GoalsKanban`, `ObjectivesKanbanBoard`, and `PipelineBoard` into one shared `<KanbanBoard>` component. Each board becomes a thin config: columns, items, card renderer, mutation callbacks.

`KanbanColumnShell` (already built) keeps owning the column chrome — `KanbanBoard` composes it.

## What's currently duplicated

All three boards re-implement:
- `DndContext` with `PointerSensor` (+ `KeyboardSensor` in two of them) and `closestCorners`
- An optimistic `local` copy of items synced from props via `useEffect`
- `findColumn(id)` resolving either a column drop id or an item id to a column
- `onDragStart` / `onDragOver` / `onDragEnd` with cross-column move + same-column `arrayMove` reorder
- `DragOverlay` with a board-specific preview card
- A `grid` wrapping `KanbanColumnShell` per column

The only real differences:
- **Goals** persists reorder by *single moved item's index* (`onReorder(id, newIdx)`).
- **Objectives** persists reorder by *full ordered id list* and additionally groups items by `goal_id` inside each column.
- **Social** intercepts moves into the `scheduled` column when `publish_at` is missing (parks the card and prompts inline) instead of persisting immediately. It also has no persistent reorder.

## Shared component: `src/components/kanban/KanbanBoard.tsx`

Generic over the item type:

```tsx
interface KanbanColumnDef<TStatus extends string> {
  id: TStatus;
  title: string;
  icon?: LucideIcon;
  accentDot?: string;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
}

interface KanbanBoardProps<TItem, TStatus extends string> {
  columns: KanbanColumnDef<TStatus>[];
  items: TItem[];
  getId: (item: TItem) => string;
  getStatus: (item: TItem) => TStatus;

  /** Render one card. The board wraps it in the SortableContext + sortable wrapper. */
  renderCard: (item: TItem, opts: { dragging: boolean }) => ReactNode;

  /** Optional: render the column body yourself (gets sortable items already wired).
   *  Used by Objectives to group by goal inside a column. Default = flat list. */
  renderColumnBody?: (args: {
    column: KanbanColumnDef<TStatus>;
    items: TItem[];
    renderCard: (item: TItem) => ReactNode;
  }) => ReactNode;

  /** Called when an item is dropped into a different column.
   *  Return false to cancel (Social uses this to intercept Scheduled without publish_at). */
  onMove?: (itemId: string, from: TStatus, to: TStatus, item: TItem) => boolean | void;

  /** Called when items in a column are reordered. Receives the new full ordered id list. */
  onReorder?: (columnId: TStatus, orderedIds: string[]) => void;

  /** Drag overlay preview. */
  renderDragOverlay?: (item: TItem) => ReactNode;

  /** Disable all interactions (PartnerGoals). */
  readOnly?: boolean;

  /** Grid classes — defaults to `grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4`. */
  className?: string;
}
```

Internally owns:
- `local` items + `useEffect` sync from `items` prop
- `activeId`
- Sensors (`Pointer` + `Keyboard`)
- `findColumn`, `onDragStart`, `onDragOver` (optimistic cross-column), `onDragEnd` (calls `onMove` then `onReorder`)
- A `<KanbanColumnShell>` per column, default body = `<SortableContext>` + sortable card wrappers using `renderCard`
- `<DragOverlay>` calling `renderDragOverlay`

`readOnly` short-circuits: renders the same grid of `KanbanColumnShell`s but skips `DndContext` and uses `renderCard` directly.

### Sortable card wrapper

A small internal `<SortableItem id={...}>` using `useSortable` so each card gets `setNodeRef`, `transform`, `transition`, `attributes`, `listeners` without each board redoing it. `renderCard` receives the item and a `dragging` flag — boards opt-in to grab handles via the existing card components (Goals' `SortableGoalCard`, Objectives' `KanbanCardShell`, Social's `PostCard`).

Boards that already wrap their card in their own sortable (Goals uses `SortableGoalCard`, Objectives uses `SortableKanbanCard`) will switch to plain card components and let `KanbanBoard` provide the sortable wrapper. Net: delete `SortableGoalCard.tsx` and inline `SortableKanbanCard` once migrated.

## Per-board changes

### `src/components/goals/GoalsKanban.tsx`
- Replace ~190 lines with ~50: columns config + `<KanbanBoard>` usage.
- `onMove` → `onStatusChange(itemId, to)`.
- `onReorder(colId, orderedIds)` → derive moved item's new index, call existing `onReorder(goalId, newOrderIndex)`.
- `renderCard` → `<GoalCard goal={item} … />` (extract the visual from `SortableGoalCard` into a plain `GoalCard`; keep `SortableGoalCard` deleted or kept as a thin alias).
- `renderDragOverlay` → same `GoalCard`.

### `src/components/goals/ObjectivesKanbanBoard.tsx`
- Use `renderColumnBody` to keep the per-goal grouping inside each column. The grouped children call the provided `renderCard(item)` so sortable wiring stays centralized.
- `onMove` → `onChangeStatus(id, to)`.
- `onReorder(colId, orderedIds)` → reconstruct the full-list `{id, order_index}` payload from `local` and call existing `onReorderObjectives`.
- `renderCard` → existing `KanbanCardShell` (no longer wrapped in its own sortable).
- `renderDragOverlay` → existing `KanbanCardShell` with `dragging`.

### `src/components/social/PipelineBoard.tsx`
- `onMove` → if `to === 'scheduled'` and `!moved.publish_at`: set `pendingSchedule` state and `return false` to cancel the auto-persist. Otherwise call `upsert.mutate(...)`.
- No `onReorder` (Social doesn't persist order).
- `renderCard` → existing `PostCard` (drop its inline sortable wrapper).
- `renderColumnBody` → still custom because of the inline `PendingScheduleCard` swap; falls back to mapping items and replacing the matching one with `<PendingScheduleCard>`.
- Density toggle stays outside `KanbanBoard`.

### `src/components/accountability/PartnerGoalsKanban.tsx`
- Use `KanbanBoard` with `readOnly`.
- `renderCard` → existing `PartnerGoalCard`.

## Files touched

- **New:** `src/components/kanban/KanbanBoard.tsx`
- **New:** `src/components/goals/GoalCard.tsx` (extracted plain visual from `SortableGoalCard`)
- **Edit:** `src/components/goals/GoalsKanban.tsx`
- **Edit:** `src/components/goals/ObjectivesKanbanBoard.tsx` (delete inline `SortableKanbanCard`)
- **Edit:** `src/components/social/PipelineBoard.tsx` (delete inline `SortableCard`)
- **Edit:** `src/components/accountability/PartnerGoalsKanban.tsx`
- **Delete:** `src/components/goals/SortableGoalCard.tsx` (after consumers switched)

## What's NOT changing

- Status enums and column ordering per board — untouched.
- Card visuals — untouched (just re-wired through `renderCard`).
- Social's pending-schedule UX, density toggle, intercept logic — preserved via `onMove` returning false.
- `KanbanColumnShell` — unchanged, composed inside `KanbanBoard`.
- Business-logic callbacks (`onStatusChange`, `onChangeStatus`, `onReorderObjectives`, `upsert.mutate`) — unchanged signatures, just called from new wiring.

## Risks

- The Objectives full-list `order_index` payload is currently computed against `local` *after* the optimistic move. We need to make sure `KanbanBoard` exposes `orderedIds` for the affected column only, and Objectives reconstructs the global list from its own `items` snapshot — straightforward, but the math needs a test pass.
- Social's intercept-without-persist relies on `onMove` returning `false` and `KanbanBoard` *still* showing the card in the destination column optimistically (so the inline date picker appears there). The board must keep the optimistic move but skip the persist. The plan covers this — flagging it because it's the trickiest behavioral edge.

## Verification

- `tsgo` typecheck clean.
- Manual smoke per board: drag within column (reorder persists where applicable), drag across columns (status changes), Social → Scheduled without `publish_at` still shows the inline picker, PartnerGoals stays non-interactive.