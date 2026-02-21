

# Notification Navigation Complete Rewrite

## Root Causes

There are two separate bugs causing notifications to do nothing when clicked:

1. **Unmount kills navigation**: `onMarkRead()` calls `setIsOpen(false)` on the Popover, unmounting the NotificationItem component. Even though `navigate()` is called before `onMarkRead()`, React batches both state changes into a single render, so the Popover closure and unmount cancel the pending navigation.

2. **Wrong destinations**: `partner_objective_feedback` and `comment_reaction` notifications currently route to `/goals?tab=weekly` (the user's own goals page). They should route to `/partner/{partnerId}` (the partner dashboard), which is where the objective comments sheet lives.

---

## Solution

### Part 1: Fix the unmount race condition (NotificationBell.tsx)

Change `onMarkRead` from immediately closing the popover to using `setTimeout(..., 0)`. This ensures `navigate()` commits to the router before the popover unmounts the component.

```
// Before
onMarkRead={() => setIsOpen(false)}

// After
onMarkRead={() => setTimeout(() => setIsOpen(false), 0)}
```

### Part 2: Fix notification routing (NotificationItem.tsx)

Rewrite the `handleClick` switch cases for accountability-related notifications:

| Notification Type | Current Destination | Correct Destination |
|---|---|---|
| `partner_objective_feedback` | `/goals?tab=weekly&week=...` | `/partner/{triggeredByUserId}?openComments={objectiveId}` |
| `comment_reaction` | `/goals?tab=weekly&week=...` | `/partner/{triggeredByUserId}?openComments={objectiveId}` |
| `accountability_partner_accepted` | `/profile/{userId}` | `/partner/{triggeredByUserId}` |

For `partner_objective_feedback`: No async DB query needed -- we already have `notification.related_objective_id` and `notification.triggered_by_user_id`. The destination becomes simply:

```
/partner/{triggered_by_user_id}?openComments={related_objective_id}
```

For `comment_reaction`: We still need one async query to get the `objective_id` from the comment, but no longer need `week_start`. Destination:

```
/partner/{triggered_by_user_id}?openComments={objective_id}
```

This eliminates most async DB lookups, making clicks near-instant.

### Part 3: PartnerDashboard reads URL params (PartnerDashboard.tsx)

Add a `useEffect` that reads the `openComments` search param on mount and auto-opens the `ObjectiveCommentsSheet`:

```
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const openCommentsId = params.get('openComments');
  if (openCommentsId && weeklyObjectives.length > 0) {
    const obj = weeklyObjectives.find(o => o.id === openCommentsId);
    if (obj) {
      setCommentsObjectiveId(obj.id);
      setCommentsObjectiveText(obj.text);
    }
    // Clean up the URL param
    params.delete('openComments');
    window.history.replaceState({}, '', 
      params.toString() ? `?${params.toString()}` : window.location.pathname
    );
  }
}, [weeklyObjectives]);
```

Also navigate to the correct week if the objective belongs to a different week (fetch `week_start` from the objective data already loaded).

---

## Files Changed

1. **src/components/notifications/NotificationBell.tsx** -- `setTimeout` wrapper on `setIsOpen(false)`
2. **src/components/notifications/NotificationItem.tsx** -- Rewrite routing for `partner_objective_feedback`, `comment_reaction`, and `accountability_partner_accepted`
3. **src/pages/PartnerDashboard.tsx** -- Add `useEffect` to read `openComments` URL param and auto-open the comments sheet

No database changes. No new dependencies. No new files.

