
## Notification Preferences — Settings Page

### What's Being Built

A new "Notifications" tab on the user's own Profile page where they can toggle which notification types they receive (in-app), with the architecture designed to accommodate email and SMS channels in the future via additional columns.

---

### Database

A new `notification_preferences` table stores one row per user. Each notification type gets its own `in_app` boolean column (defaulting to `true` — opted-in by default). Future channels simply add `email_*` and `sms_*` columns to the same table without schema breakage.

The 15 existing notification types from `src/types/notifications.ts` map 1:1 to columns:

| Notification Type | Column |
|---|---|
| post_like | in_app_post_like |
| comment_added | in_app_comment_added |
| comment_like | in_app_comment_like |
| mention | in_app_mention |
| friend_request | in_app_friend_request |
| friend_request_accepted | in_app_friend_request_accepted |
| accountability_partner_request | in_app_accountability_partner_request |
| accountability_partner_accepted | in_app_accountability_partner_accepted |
| accountability_check_in | in_app_accountability_check_in |
| goal_update_cheer | in_app_goal_update_cheer |
| goal_milestone | in_app_goal_milestone |
| goal_help_request | in_app_goal_help_request |
| goal_update_comment | in_app_goal_update_comment |
| partner_objective_feedback | in_app_partner_objective_feedback |
| comment_reaction | in_app_comment_reaction |

RLS: users can only read and write their own row.

---

### New Files

**`src/components/profile/NotificationPreferences.tsx`**
The UI component. Renders notification toggles grouped into logical categories using `Switch` components:

- **Social** — post likes, comment added, comment likes, mentions, comment reactions
- **Friends** — friend requests, friend request accepted
- **Accountability** — partner request, partner accepted, partner check-in, partner objective feedback
- **Goals & Community** — goal update cheer, goal milestone, goal help request, goal update comment

Each group is a `Card` with a header and rows of `Switch` + label + description. Above the groups, a channel header shows "In-App" (active, with a future "Email" and "SMS" columns shown as "Coming soon" badges to communicate the roadmap).

**`src/hooks/useNotificationPreferences.ts`**
Loads the user's preferences row (creating it with all defaults if it doesn't exist via upsert), exposes a `updatePreference(type, channel, value)` function that does an optimistic update + debounced Supabase upsert, so toggling feels instant.

---

### Modified Files

**`src/pages/Profile.tsx`**
Add a third tab `"notifications"` to the own-profile tab bar alongside "Profile" and "Integrations". Import and render `<NotificationPreferences />` when that tab is active.

---

### User Experience

The tab bar on your own profile page gains a Bell icon tab labelled "Notifications". Inside, you see a clean settings panel:

```text
┌─────────────────────────────────────────────┐
│  Notification Preferences                   │
│  Control what you're notified about         │
│                                             │
│  Channel:  In-App ✓   Email (coming soon)   │
├─────────────────────────────────────────────┤
│  Social                                     │
│  Post Likes          Someone liked your...  │ ●
│  Comments            Someone commented...   │ ●
│  Comment Likes       Someone liked your...  │ ●
│  Mentions            Someone mentioned...   │ ●
│  Comment Reactions   Emoji reactions on...  │ ●
├─────────────────────────────────────────────┤
│  Friends                                    │
│  Friend Requests     New connection req...  │ ●
│  Request Accepted    Your friend request... │ ●
├─────────────────────────────────────────────┤
│  Accountability                             │
│  Partner Request     New partnership req... │ ●
│  Partner Accepted    Request accepted       │ ●
│  Partner Check-In    Partner sent check-in  │ ●
│  Objective Feedback  Partner reacted to...  │ ●
├─────────────────────────────────────────────┤
│  Goals & Community                          │
│  Goal Cheers         Someone cheered...     │ ●
│  Goal Milestone      You hit a milestone    │ ●
│  Help Requests       Someone asked for...   │ ●
│  Goal Comments       New comment on an...   │ ●
└─────────────────────────────────────────────┘
```

Toggles update instantly (optimistic) with a silent background save. Saved state persists across sessions.

---

### Technical Summary

| File | Action |
|---|---|
| `supabase/migrations/…_notification_preferences.sql` | New migration — table + RLS |
| `src/hooks/useNotificationPreferences.ts` | New hook — load/save preferences |
| `src/components/profile/NotificationPreferences.tsx` | New component — preferences UI |
| `src/pages/Profile.tsx` | Add "Notifications" tab, render component |
