

# Deep-Link Objective Comment Notifications to the Correct Week

## Problem

When clicking a `partner_objective_feedback` notification, the app navigates to `/goals?tab=weekly` which always shows the current week. If the commented objective belongs to a previous week, the user lands on the wrong week and can't find it.

## Solution

Three changes are needed:

1. **Store the objective ID in the notification** so we know which objective was commented on
2. **Look up the objective's `week_start` at click time** and include it in the navigation URL
3. **Have `WeeklyProgressView` read a `week` query param** to initialize on the correct week

---

### 1. Database: Add `related_objective_id` column to `notifications`

Add a nullable `related_objective_id uuid` column to the `notifications` table. Update the `notify_objective_comment` trigger to populate it with `NEW.objective_id` when inserting the notification.

### 2. Update the trigger function

Modify `notify_objective_comment()` to include `related_objective_id` in both INSERT paths (partner-commented and owner-replied).

### 3. Update TypeScript types

Add `related_objective_id?: string | null` to the `Notification` interface in `src/types/notifications.ts` and `src/integrations/supabase/types.ts`.

### 4. NotificationItem: Look up week_start on click

In `NotificationItem.tsx`, for `partner_objective_feedback` notifications that have a `related_objective_id`:
- Query `weekly_objectives` for the objective's `week_start`
- Navigate to `/goals?tab=weekly&week={week_start}`

### 5. WeeklyProgressView: Read `week` query param

In `WeeklyProgressView.tsx`, read a `week` search param from the URL. If present, use it as the initial `currentWeekStart` instead of the current week. This ensures the view opens on the correct week.

### 6. Goals page: Pass through the `week` param

The Goals page already reads `tab` from search params. The `week` param will flow through to `WeeklyProgressView` via URL search params (read directly inside `WeeklyProgressView`).

---

## Files to Change

| File | Change |
|------|--------|
| New migration SQL | Add `related_objective_id` column; update trigger to populate it |
| `src/types/notifications.ts` | Add `related_objective_id` field |
| `src/integrations/supabase/types.ts` | Update generated types |
| `src/components/notifications/NotificationItem.tsx` | Fetch objective's `week_start` on click, navigate with `&week=` param |
| `src/components/goals/WeeklyProgressView.tsx` | Read `week` search param to set initial `currentWeekStart` |

