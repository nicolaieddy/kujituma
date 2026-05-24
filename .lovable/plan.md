
# Garmin Health API Auto-Sync

Stream Garmin activities, sleep, and wellness data directly into Kujituma — no more manual `.fit` / CSV uploads. Uses Garmin's official Health API with OAuth 2.0 (PKCE) and Ping webhooks.

## Prerequisite (you, not me)

Before any of this is useful, you need to **apply to the Garmin Connect Developer Program → Health API** at https://developer.garmin.com/gc-developer-program/health-api/. Approval typically takes 1–4 weeks. Garmin will provide:

- **Consumer Key** (Client ID)
- **Consumer Secret** (Client Secret)
- A confirmation that webhooks (Ping/Push notifications) are enabled

We can build everything while you wait — the integration just won't activate until you paste those credentials in and configure the webhook URLs in Garmin's developer portal.

## What you'll get when it's live

- A **Connect Garmin** button in Profile → Integrations (next to Strava). One-time OAuth.
- New activities appear in Training within ~1–5 minutes of finishing a workout, with full Garmin-native metrics (HRV, stride length, ground contact, body battery, etc. — richer than Strava).
- New sleep sessions auto-populate each morning — no more Garmin Connect CSV downloads.
- Optional: daily wellness (resting HR, body battery, stress) for future analytics.
- Manual `.fit` / sleep CSV upload stays as a fallback.

## Architecture

```text
   Garmin watch
       │ (sync)
       ▼
   Garmin Connect
       │ Ping webhook
       ▼
 ┌────────────────────────────┐
 │ garmin-webhook (edge fn)   │  ◄── public, signature-verified
 │  • receives Ping summaries │
 │  • fetches detail via API  │
 │  • normalizes + inserts    │
 └────────┬───────────────────┘
          │
          ▼
   synced_activities / sleep_entries / wellness_entries
          ▲
          │ OAuth tokens
 ┌────────────────────────────┐
 │ garmin-auth (edge fn)      │  ◄── OAuth start / callback / refresh
 └────────────────────────────┘
          ▲
          │
   Frontend Connect button
```

## Build steps

### 1. Database
New tables / columns via migration:
- `garmin_connections` — `user_id`, `garmin_user_id`, `access_token`, `refresh_token`, `token_expires_at`, `scopes`, `connected_at`, `last_sync_at`. Tokens encrypted at rest, RLS so only owner reads.
- `garmin_webhook_events` — raw Ping payload audit log (`event_type`, `payload`, `processed_at`, `error`) for debugging and replay.
- `sleep_entries` — add `source` column (`'garmin_csv' | 'garmin_api'`) and `garmin_summary_id` (unique with user_id) for dedup.
- `synced_activities` — add `garmin_activity_id` (unique with user_id) and extend `source` enum to include `'garmin_api'`. Reuse all existing display logic.
- Optional `wellness_entries` table for daily resting HR / body battery / stress (gated behind a flag — we can ship without).

### 2. Secrets
Add via secrets tool once you have Garmin credentials:
- `GARMIN_CLIENT_ID`
- `GARMIN_CLIENT_SECRET`
- `GARMIN_WEBHOOK_SECRET` (we generate; paste into Garmin portal)

### 3. Edge functions
- **`garmin-auth`** — three sub-routes:
  - `GET /start` → returns Garmin authorize URL with PKCE challenge.
  - `GET /callback` → exchanges code for tokens, stores in `garmin_connections`, triggers initial 30-day backfill.
  - `POST /refresh` → internal, called by webhook handler when access token expired.
  - `POST /disconnect` → revoke + delete row.
- **`garmin-webhook`** — `verify_jwt = false`, public. Verifies Garmin's HMAC signature, writes raw event to `garmin_webhook_events`, then for each summary:
  - **Activity ping** → fetch activity detail + FIT, normalize, upsert into `synced_activities` (dedup on `garmin_activity_id`, merge with same-session Strava per existing memory).
  - **Sleep ping** → fetch sleep summary, upsert into `sleep_entries`.
  - **Wellness ping** (optional) → upsert daily snapshot.
  - Invalidates relevant TanStack keys via a small notification table the client polls, OR relies on existing realtime subscriptions if present.
- **`garmin-backfill`** — one-off, called after first connect; pulls last 30 days of activities + sleep using the `/backfill` endpoint per Garmin spec.

### 4. Frontend
- New `useGarminConnection` hook mirroring `useStravaConnection`.
- New `GarminConnectionCard` component in `src/components/garmin/` matching Strava card styling — shown in `IntegrationsSection.tsx`.
- Callback page `src/pages/GarminCallback.tsx` (parallel to `StravaCallback.tsx`).
- Update `FitFileUploadCard` copy: "Manual upload (optional fallback — Garmin auto-syncs in the background)".
- Update `McpSection.tsx` tool list per memory rule (new `getGarminConnectionStatus` tool if we expose one).

### 5. Garmin developer portal config (you, after approval)
I'll provide exact URLs to paste:
- OAuth redirect URI: `https://yyidkpmrqvgvzbjvtnjy.supabase.co/functions/v1/garmin-auth/callback`
- Activity Ping URL: `https://yyidkpmrqvgvzbjvtnjy.supabase.co/functions/v1/garmin-webhook?type=activity`
- Sleep Ping URL: `https://yyidkpmrqvgvzbjvtnjy.supabase.co/functions/v1/garmin-webhook?type=sleep`

### 6. Testing
- Garmin provides a sandbox + test-data endpoint we'll use in `supabase--curl_edge_functions` to validate the webhook handler before real watch data flows.

## Phasing

I'd suggest shipping in two passes:

1. **Pass 1 (build now, dormant until creds arrive)**: schema, edge functions, connect UI, sleep + activity ingestion, backfill. Verified with Garmin's sandbox endpoint.
2. **Pass 2 (after first week of real data)**: wellness/HRV/body-battery dashboard widgets — easier to design once we see real payloads.

## Open question for you

Do you want **wellness data** (resting HR, body battery, stress, daily HRV) ingested in Pass 1, or activities + sleep only? Wellness adds one more table and webhook handler but unlocks richer analytics later. Tell me before I start building and I'll scope accordingly.
