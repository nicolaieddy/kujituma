
## What the errors are (from your screenshot) and whether they should be fixed

### 1) `WebSocket connection to .../realtime/v1/websocket ... failed` + `[Realtime] Goals channel error: undefined`
- Meaning: Supabase Realtime (live updates) can’t keep a websocket connection open.
- Impact:
  - Live updates (goals realtime, reactions realtime, etc.) won’t work reliably.
  - The app may still “work” via normal HTTP fetches, but you’ll see stale data until refresh.
- Should it be fixed?
  - Partly yes (we can stop the app from making the problem worse).
  - If a user’s network blocks websockets (VPN/corp Wi‑Fi/adblock), we can’t fully “fix” that, but we can:
    1) reduce the number of realtime subscriptions,
    2) avoid resubscribe loops,
    3) fallback gracefully to polling without spamming requests or console.

### 2) `net::ERR_CONNECTION_CLOSED`, `net::ERR_QUIC_PROTOCOL_ERROR`, `net::ERR_ADDRESS_INVALID` on Supabase REST/RPC calls
- Meaning: the browser is failing HTTP requests (connection dropped, HTTP/3/QUIC problems, or malformed/unreachable request).
- The most common app-caused reason is request spam (too many rapid requests) caused by realtime handlers firing too often and calling “refetch” repeatedly.
- Should it be fixed?
  - Yes. Even if the root cause is intermittent network, we should not be generating bursts of requests that amplify failures.

### 3) `Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.`
- Meaning: this is almost always a browser extension / devtools messaging issue, not your app logic.
- Should it be fixed?
  - No (we can ignore it). It’s not coming from your React/Supabase code.

---

## Root cause I see in our codebase (the “dumb logic”)
### A) `CheckInsFeed.tsx` subscribes to **all** `check_in_reactions` changes (no filter) and refetches check-ins each time
Current code:
- subscribes to `check_in_reactions` with **no server-side filter**
- on *any reaction in the entire database*, it calls `fetchCheckIns()`

Why this is bad:
- If any user in the whole app reacts to anything, everyone with this page open refetches.
- This can create a flood of REST requests, making the app appear “broken/slow,” and triggering exactly the network errors you’re seeing.

### B) Other pages still have the older “dynamic dependency” subscription pattern
- `WeekCheckInsSection.tsx` and `CheckInHistory.tsx` still depend on `checkIns.map(c => c.id).join(',')` which can cause frequent unsubscribe/resubscribe churn.
- Even if it’s not an infinite loop every time, it increases websocket churn and makes realtime connection failures more likely.

### C) `getCheckInHistory()` does not fetch reactions at all
- `CheckInsFeed` UI expects `checkIn.reactions`, but `accountabilityService.getCheckInHistory()` currently selects only check-ins + profile, not reactions.
- So: we’re paying the cost of reaction subscriptions/refetches without actually returning reaction data for the UI.

---

## Implementation plan to fix the errors (and improve perceived speed)

### Phase 1 — Stop the bleeding (frontend-only, fastest win)
1) **CheckInsFeed: remove or severely narrow the reactions realtime subscription**
   - Immediately stop listening to the entire `check_in_reactions` table.
   - Short-term behavior:
     - Keep realtime for `accountability_check_ins` filtered by `partnership_id`.
     - For reactions, rely on:
       - optimistic UI for the user who clicked, and
       - a lightweight debounced refresh (or periodic refresh) instead of realtime.
   - This alone should drastically reduce request spam and network errors.

2) **Add debouncing to realtime-triggered refreshes**
   - Implement a small “scheduleRefresh” helper in `CheckInsFeed` that:
     - collapses multiple events into 1 refresh per ~300–800ms
     - prevents simultaneous overlapping fetches

3) **Avoid resubscribe churn caused by unstable callback dependencies**
   - In `CheckInsFeed`, `fetchCheckIns` currently depends on `optimisticIds`, which makes the callback change often; because the realtime `useEffect` depends on `fetchCheckIns`, this can cause extra subscribe/unsubscribe churn.
   - Fix by:
     - making `fetchCheckIns` depend only on `partnershipId` (and use refs for optimistic state merging), OR
     - keep the merging logic outside of the callback to avoid the callback identity changing.

4) **Only create realtime channels when it makes sense**
   - Add guards:
     - don’t subscribe if `!navigator.onLine`
     - optionally pause realtime when `document.visibilityState !== 'visible'`
   - Reduce console noise:
     - log CHANNEL_ERROR once per session or once per X seconds (rate limit logs).

### Phase 2 — Make reactions realtime correctly (small DB improvement + frontend updates)
Goal: allow server-side filtering for reaction events by partnership, without dynamic ID lists.

5) **DB migration: add `partnership_id` to `check_in_reactions`**
   - Schema change:
     - `ALTER TABLE public.check_in_reactions ADD COLUMN partnership_id uuid;`
   - Backfill existing rows:
     - set `partnership_id` by joining `accountability_check_ins` on `check_in_id`
   - Add a `BEFORE INSERT` trigger:
     - automatically sets `NEW.partnership_id` from the referenced check-in’s `partnership_id`
     - prevents clients from lying about partnership_id
   - After backfill + trigger:
     - set `partnership_id` to `NOT NULL`
   - Add index:
     - `create index on check_in_reactions(partnership_id, created_at desc);`
   - RLS:
     - existing policies reference `check_in_id` joins; they should continue to work unchanged.
     - we’ll verify inserts still pass with the trigger setting the new column.

6) **Frontend: update reaction subscriptions to use server-side filter**
   - Update `CheckInsFeed`, `CheckInHistory`, `WeekCheckInsSection`:
     - subscribe to `check_in_reactions` with `filter: partnership_id=eq.${partnershipId}`
     - keep dependency array stable: `[partnershipId]` only (plus stable refresh scheduler)
     - keep debounced refresh (don’t refetch 10 times if 10 reactions happen rapidly)

### Phase 3 — Ensure check-in history returns correct data (fix “it’s slow and still wrong”)
7) **Update `accountabilityService.getCheckInHistory()` to include reactions**
   Options:
   - Minimal change (2-query approach):
     1) fetch check-ins (parents + replies)
     2) fetch reactions with `.in('check_in_id', allIds)`
     3) attach reactions to each record
   - Better change (fast + clean): **single RPC**
     - Create `get_check_in_history(partnership_id)` RPC that returns:
       - check-ins + nested replies + reactions in one JSON payload.
     - This reduces round trips and makes UI feel instant, especially on mobile.

Given your performance focus, I recommend the RPC route, but we can start with the minimal approach and upgrade if needed.

---

## Verification checklist (what we’ll confirm after implementation)
1) Open a partner page and watch the Network tab:
   - check-ins should load with a small number of requests (not continuous)
   - reactions should not trigger a storm of refetches
2) Console should stop spamming:
   - no repeated `[Realtime] Goals channel error` loops caused by our own resubscribe churn
3) Reaction counts render correctly in CheckInsFeed (since history will now include reactions)
4) End-to-end test:
   - record check-in, add reaction, edit/delete, reply
   - test on mobile + desktop
   - test with two browsers open to verify realtime updates work (or gracefully degrade)

---

## Files we’ll touch (so you know the scope)
- Frontend:
  - `src/components/accountability/CheckInsFeed.tsx`
  - `src/components/accountability/WeekCheckInsSection.tsx`
  - `src/pages/CheckInHistory.tsx`
  - `src/services/accountabilityService.ts`
  - (optional) `src/hooks/useRealtimeGoals.ts` (rate-limit log spam / connection health)
- Database migration:
  - Add `partnership_id` to `check_in_reactions` + trigger + backfill + indexes
  - (optional) new RPC `get_check_in_history_with_reactions`

---

## Why this will fix what you’re seeing
- Right now, reaction changes anywhere can trigger refetches everywhere because of the unfiltered subscription.
- That creates request floods and makes both HTTP and websocket connections unstable.
- Filtering reaction events by `partnership_id` + debouncing refreshes eliminates the flood and makes the UI “instant” again.

