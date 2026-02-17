
## What's Missing

When you click a `comment_reaction` notification, you land on the weekly goals tab for the right week — but the comments sheet for the specific objective doesn't automatically open. You have to manually find the objective and click on the comment count yourself.

## Solution: Deep-link via URL Parameter

Add an `openComments` query parameter to the notification navigation URL. When `WeeklyObjectivesList` mounts (or the objectives load), it detects this parameter and automatically opens the comments sheet for the matching objective.

---

## Technical Changes

### 1. `NotificationItem.tsx` — Append `openComments` to the URL

Change the destination for `comment_reaction` (and `partner_objective_feedback`) to include the objective ID:

```
/goals?tab=weekly&week=2025-01-13&openComments=<objectiveId>
```

For `comment_reaction`, the `objectiveId` is fetched via the `related_comment_id` lookup (already in place). We just append it.

### 2. `WeeklyObjectivesList.tsx` — Read the param and auto-open

Add a `useEffect` that:
1. Reads `openComments` from `useSearchParams()`
2. Waits for `objectives` to be loaded
3. Finds the matching objective by ID
4. Calls `handleOpenComments(objective.id, objective.text)` to open the sheet
5. Removes the `openComments` param from the URL (so refreshing doesn't re-open it)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/notifications/NotificationItem.tsx` | Append `&openComments=<objectiveId>` to `comment_reaction` destination |
| `src/components/goals/WeeklyObjectivesList.tsx` | Add `useEffect` with `useSearchParams` to auto-open comments sheet |

---

## User Experience

Before: Click notification → land on the week page → have to find the objective manually → click comment icon.

After: Click notification → land on the week page → comments sheet opens automatically for the right objective.

The URL param is cleaned up after opening so it doesn't persist on refresh.
