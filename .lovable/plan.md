
## Fix: "Weekly Note" UX on Partner Dashboard

### The Problem

The "Leave a note about this week..." input is a **check-in message sender** — when submitted, the message appears in the Check-in History feed below. But right now it's:

1. **Placed inside the Weekly Performance card** (objectives list) — making it look like a personal note about the week's data, not a message to your partner
2. **Has no label or context** — the placeholder text alone is ambiguous; there's no indication that this sends a message
3. **Disconnected from the Check-in History** — the actual destination (Check-in History feed) is a collapsed card further below the page

### The Fix

**Move the quick-reply field out of the Weekly Performance card and into the Check-in History card.** This is where it logically belongs — right above (or below) the feed of messages.

**Before:**
```
┌─ Weekly Performance Card ──────────────────┐
│  [week nav]  This Week                      │
│  [progress bar]  0%                         │
│  [0 active habits]                          │
│  No objectives set for this week.           │
│                                             │
│  ┌──────────────────────────────────┐ [→]  │  ← CONFUSING: send button here
│  │ Leave a note about this week...  │      │
│  └──────────────────────────────────┘      │
└────────────────────────────────────────────┘

┌─ Check-in History (collapsed) ─────────────┐
│  [New Check-in]                  [chevron] │
└────────────────────────────────────────────┘
```

**After:**
```
┌─ Weekly Performance Card ──────────────────┐
│  [week nav]  This Week                      │
│  [progress bar]  0%                         │
│  [0 active habits]                          │
│  No objectives set for this week.           │
└────────────────────────────────────────────┘

┌─ Check-in History ─────────────────────────┐
│  💬 Check-in History      [New Check-in]   │
│  ─────────────────────────────────────────  │
│  [Quick Reply to {PartnerName}...]   [→]   │  ← CLEAR: inside check-in card
│  ─────────────────────────────────────────  │
│  [message feed, collapsed by default]       │
└────────────────────────────────────────────┘
```

### Additional UX Improvements

1. **Better placeholder text**: Change from `"Leave a note about this week..."` → `"Send {partnerName} a quick message..."`  
2. **Label above the input**: Add a small `"Quick message"` label so the purpose is immediately clear
3. **Expand the feed on send**: When a note is sent via the quick field, auto-open the collapsible Check-in History so the user sees the message they just sent appear in the feed
4. **Remove the border-t separator** that currently makes the note field look visually attached to the objectives list

### Files Changed

| File | Change |
|---|---|
| `src/pages/PartnerDashboard.tsx` | Remove the weekly note section from inside the Weekly Performance `CardContent`; add it to the Check-in History card, above the `CollapsibleContent` feed, always visible (not inside the collapsible) |

No new components, hooks, database changes, or dependencies needed.
