---
name: Garmin Unofficial Bridge
description: Garmin sync via email/password using garmin-connect npm; pulls activities (+ .fit files), sleep, weight/body composition, and daily wellness on 6h cadence
type: feature
---
**Auth**: email + password via `garmin-connect@1.6.1` npm. Credentials AES-GCM encrypted at rest in `garmin_connections` (`GARMIN_ENCRYPTION_KEY` env).

**Cadence**: pg_cron job `garmin-sync-every-6h` runs every 6 hours. On-demand "Sync now" from the Garmin card.

**What's pulled per run** (paced with 0.5–1.5s jitter between calls, 429-aware — aborts cleanly and resumes next run):
- **Activities** → `synced_activities` (summary)
- **.fit files** for every new activity → `fit-files` storage → `parse-fit-file` enriches with laps + streams. Skipped when the activity already has `has_streams=true` (avoids clobbering manual uploads). `parse-fit-file` accepts service-role calls with explicit `user_id`.
- **Sleep** → `sleep_entries` (per night, with score/quality/duration/HR/BB/respiration + raw payload)
- **Weight / body composition** → `body_measurements` (unified, source='garmin') + `garmin_body_composition` (raw mirror: BMI, muscle, water, bone, visceral fat, metabolic age)
- **Daily wellness** → `garmin_wellness_daily` (steps, calories, HR min/max/resting, HRV, stress, body battery, SpO2, respiration + raw payload)

**Backfill**: 30 days on first sync (controlled by `garmin_connections.backfill_completed` flag); 10–14 days incremental thereafter. Backfill flag only flips to true on a non-rate-limited run.

**Plan**: swap to official Garmin Health/Connect API later when granted; this is the unofficial bridge.
