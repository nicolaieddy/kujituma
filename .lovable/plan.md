
# SMS Notifications via Twilio

## Overview

This builds a full SMS notification pipeline on top of the existing `notification_preferences` table, adding:
- 4 SMS-enabled notification types (accountability check-in, partner request, partner accepted, friend request)
- A phone number verification flow so users must add and verify a phone before SMS is sent
- Per-notification SMS toggles in the existing Notifications settings tab
- A Supabase Edge Function that sends SMS via Twilio, triggered on new `notifications` rows
- A Postgres trigger to call the Edge Function automatically whenever a relevant notification is inserted

---

## Architecture Flow

When a notification is created in the database:
1. Postgres trigger fires on `notifications` INSERT
2. Trigger calls `pg_net` to invoke the `send-sms` Edge Function
3. Edge Function checks: is the notification type SMS-eligible? Does the user have an SMS preference enabled? Do they have a verified phone number?
4. If all checks pass → Twilio API call sends the SMS

---

## What Needs Twilio Credentials

You will need to provide 3 secrets from your Twilio account:
- `TWILIO_ACCOUNT_SID` — from your Twilio Console dashboard
- `TWILIO_AUTH_TOKEN` — from your Twilio Console dashboard
- `TWILIO_PHONE_NUMBER` — the Twilio phone number that will send SMS (e.g. `+12025551234`)

These get stored securely as Supabase secrets, only accessible to the Edge Function.

---

## Database Changes

### 1. Extend `notification_preferences` table
Add 4 new boolean SMS columns (all default `false` — users must opt in):

| New Column | Default |
|---|---|
| `sms_friend_request` | false |
| `sms_accountability_partner_request` | false |
| `sms_accountability_partner_accepted` | false |
| `sms_accountability_check_in` | false |

### 2. Extend `profiles` table
Add a `phone_verified` boolean column (default `false`). The existing `phone_number` column is already there on the `profiles` table.

### 3. Postgres trigger
A new `after insert` trigger on the `notifications` table that uses `pg_net` to call the `send-sms` edge function for eligible notification types. Uses `service_role` so it has access to the phone number.

---

## New Files

### `supabase/functions/send-sms/index.ts`
The edge function that:
1. Receives the notification ID, recipient user ID, and notification type
2. Fetches the recipient's `phone_number` and `phone_verified` from `profiles` (via service role)
3. Checks the `notification_preferences` row for the `sms_<type>` column
4. If all conditions pass, calls Twilio's REST API with a tailored message per notification type
5. Logs success/failure without throwing (so a Twilio failure doesn't affect the main app flow)

SMS message templates (concise, under 160 chars):
- **friend_request**: "👋 [Name] sent you a friend request on Kujituma. Open the app to respond."
- **accountability_partner_request**: "🤝 [Name] wants to be your accountability partner on Kujituma."
- **accountability_partner_accepted**: "✅ [Name] accepted your accountability partner request on Kujituma!"
- **accountability_check_in**: "💬 [Name] sent you a check-in on Kujituma. Open the app to reply."

---

## Modified Files

### `src/hooks/useNotificationPreferences.ts`
- Extend `NotificationChannel` type to include `"sms"` 
- Add 4 new `sms_*` boolean fields to the `NotificationPreferences` type and `DEFAULTS` object (all `false`)
- The existing `updatePreference(type, channel, value)` function already handles any channel generically — no logic changes needed, just the type extension

### `src/components/profile/NotificationPreferences.tsx`
Major UI update — the layout changes from a single-column switch list to a **multi-channel grid**:

```text
┌─────────────────────────────────────────────────────┐
│  Notification Preferences                           │
│  Control what you get notified about and how.       │
│                                                     │
│  Channels:  🔔 In-App  📱 SMS ✓   📧 Email (soon) │
│             (SMS requires verified phone number)    │
├──────────────────────────────────┬────────┬─────────┤
│                                  │ In-App │   SMS   │
├──────────────────────────────────┴────────┴─────────┤
│  Friends                                            │
│  Friend Requests         ●              ●           │
│  ─────────────────────────────────────────────────  │
│  (Request Accepted — in-app only)                   │
├─────────────────────────────────────────────────────┤
│  Accountability                                     │
│  Partner Request         ●              ●           │
│  Partner Accepted        ●              ●           │
│  Partner Check-In        ●              ●           │
│  (Objective Feedback — in-app only)                 │
├─────────────────────────────────────────────────────┤
│  Social (In-App Only)                               │
│  Post Likes              ●                          │
│  Comments                ●                          │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

- Groups that have SMS-eligible types show a 2-column header (In-App | SMS)
- SMS column is disabled (greyed out) if the user has no verified phone number, with a tooltip explaining why
- A banner at the top of the SMS-eligible groups links to Profile settings to add/verify a phone number
- Social and Goals & Community groups show "In-App Only" label since SMS won't be supported for those

### `src/components/profile/NotificationPreferences.tsx` — Phone Banner
If a user doesn't have `phone_verified = true`, a subtle amber info banner appears above the SMS-eligible sections:
> "📱 Add a verified phone number to your profile to enable SMS notifications."
With a link to the Profile tab.

---

## Phone Number in Profile
The `phone_number` field already exists in `profiles` and is already shown/editable in `ProfileEditForm.tsx` via the `SocialLinkPicker` component (it's listed as a social platform). The new `phone_verified` column defaults to `false`. For this implementation, we'll keep it simple: the phone number field in the profile form will save the number, and SMS will only send if `phone_verified = true`. A note in the UI will indicate this is for future verification flow (phase 2 could add OTP verification).

Actually — to make SMS useful immediately without a full OTP verification flow, the plan will treat "has a phone number stored" as sufficient to receive SMS, and we will set `phone_verified = true` automatically when a phone number is saved. Full OTP verification can be layered on later.

---

## Technical Summary

| Item | Action |
|---|---|
| `supabase/migrations/…_sms_notification_prefs.sql` | Add `sms_*` columns to `notification_preferences`, add `phone_verified` to `profiles`, add pg_net trigger on `notifications` |
| `supabase/functions/send-sms/index.ts` | New edge function — Twilio SMS sender |
| `supabase/config.toml` | Add `[functions.send-sms]` with `verify_jwt = false` |
| `src/hooks/useNotificationPreferences.ts` | Extend types for `sms` channel + 4 SMS columns |
| `src/components/profile/NotificationPreferences.tsx` | Multi-channel grid UI with SMS column, phone number banner |

---

## Secrets Required (from Twilio)

Before implementation, you'll need to add these 3 secrets to Supabase:
1. `TWILIO_ACCOUNT_SID`
2. `TWILIO_AUTH_TOKEN`
3. `TWILIO_PHONE_NUMBER`

These come from your [Twilio Console](https://console.twilio.com). If you don't have a Twilio account, signing up takes ~2 minutes and includes a free trial number.
