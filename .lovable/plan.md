## Goal

Three boards (Goals, Objectives, Social Pipeline) currently render column headers, count badges, and empty states in three different ways. Unify the **presentation shell** so every board looks and behaves the same, without changing DnD logic, status vocabulary, or board-specific cards.

## Current divergence

| Board | Header | Badge | Empty state |
|---|---|---|---|
| Goals | icon + heading, no border | colored `Badge` (varies per status) | dashed bordered card with icon + "No {x} goals yet" |
| Objectives | colored dot + label, bottom border | secondary `Badge`, h-5 | small centered text per status ("Drop or add…", "Nothing in progress", "Nothing done yet") |
| Social Pipeline | small dot + uppercase label, bottom border | plain `<span>` number, no badge | "Drop here" muted text |

Column container styling differs too: Goals has no wrapper, Objectives/Social wrap in `bg-muted/30` rounded card.

## Proposed approach

Create one shared primitive that owns the **column chrome only** (wrapper, header, count badge, empty state, drop highlight). Each board keeps its own DnD wiring, sorting, and card rendering — they just pass children into the shell.

### New file: `src/components/kanban/KanbanColumnShell.tsx`

```tsx
interface KanbanColumnShellProps {
  // Identity (passed to useDroppable by the parent — shell does NOT call useDroppable)
  droppableRef: (el: HTMLElement | null) => void;
  isOver: boolean;

  // Header
  title: string;
  icon?: LucideIcon;          // optional accent icon
  accentDot?: string;         // tailwind class for colored dot (e.g. "bg-emerald-500")
  count: number;

  // Empty state
  emptyMessage: string;       // board supplies its own copy
  emptyIcon?: LucideIcon;

  // Body
  children: React.ReactNode;  // SortableContext + cards from parent
  className?: string;
}
```

Visual contract (one consistent look, mobile-aware):
- Wrapper: `flex flex-col rounded-lg border border-border bg-muted/30 min-h-[200px] md:min-h-[300px]`
- Header: `flex items-center justify-between px-3 py-2 border-b border-border`
  - Left: optional dot + optional icon + `<h3 className="text-sm font-semibold">`
  - Right: `<Badge variant="secondary" className="text-[10px] h-5 px-2 tabular-nums">{count}</Badge>`
- Drop area: `flex-1 p-2 transition-colors` + `bg-primary/5 ring-1 ring-primary/30` when `isOver`
- Empty state: centered `text-xs text-muted-foreground py-6` with optional icon above

### Wiring per board

1. **`GoalsKanban.tsx`** — replace inline column markup with `<KanbanColumnShell>`. Drop the dashed-card empty state in favor of the standard one. Keep `useDroppable`, `SortableContext`, and `SortableGoalCard` in the parent.
2. **`ObjectivesKanbanBoard.tsx`** — replace the inline `<div className="flex flex-col rounded-lg…">` + header with `<KanbanColumnShell>`. Keep the per-goal grouping logic inside the children. Collapse the three per-status empty messages to one ("No objectives in this column" — or keep per-status via a small map passed in).
3. **`PipelineBoard.tsx` Column** — replace its custom header/badge/empty with `<KanbanColumnShell>`. Density toggle, pending-schedule card, and DnD stay untouched.
4. **`PartnerGoalsKanban.tsx`** — same swap (read-only board).

### What is NOT changing

- DnD logic, sensors, collision detection, optimistic state — untouched.
- Status enums and column ordering — untouched (Goals stays `not_started|in_progress|completed`, Objectives stays `…|done`, Social stays `idea|drafting|scheduled|published`).
- Card components (`SortableGoalCard`, `KanbanCardShell`, `PostCard`) — untouched.
- Social's density toggle and pending-schedule inline editor — untouched.

## Files touched

- **New:** `src/components/kanban/KanbanColumnShell.tsx`
- **Edit:** `src/components/goals/GoalsKanban.tsx`
- **Edit:** `src/components/goals/ObjectivesKanbanBoard.tsx`
- **Edit:** `src/components/social/PipelineBoard.tsx`
- **Edit:** `src/components/accountability/PartnerGoalsKanban.tsx`

## Verification

- `tsgo` typecheck clean.
- Visual smoke test of all 4 boards: header, badge, empty column, drop highlight all identical.
- Drag a card across columns in each board — behavior unchanged.

## Open question

Empty-state copy: one generic string ("Nothing here yet") or per-status copy passed in by each board? Recommendation: per-board copy, so Goals can say "No completed goals yet" and Social can say "Drop here" — the shell just renders whatever string it's given.