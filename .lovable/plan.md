## The bug

The "Welcome to Kujituma / Accept Terms" modal pops up even though you've already accepted. The DB confirms it — your user has 3 separate `tos_acceptances` rows for version `1.0.0`, all created from this same bug re-firing on previous sessions.

## Root cause

`src/hooks/useTosAcceptance.ts` fails closed on errors:

```ts
if (error) {
  setHasAcceptedCurrentTos(false);   // ❌ treats network error as "not accepted"
  ...
}
} catch (error) {
  setHasAcceptedCurrentTos(false);   // ❌ same problem
}
```

When the `tos_acceptances` SELECT fails (flaky Wi-Fi, dropped request, expired token mid-refresh, Supabase 5xx, offline), the hook reports `hasAcceptedCurrentTos = false`. `TosGate` then renders the modal. If you accept again, it just writes another duplicate row — the underlying fetch is never retried.

Secondary issues:
- No retry on transient failures.
- No offline awareness — the gate happily shows the modal with no network.
- Every modal accept inserts a new row (no dedupe).

## Existing flow

```text
App mount
  └─ AuthContext: getSession() → user
       └─ TosGate
            └─ useTosAcceptance.checkTosAcceptance()
                 └─ SELECT tos_acceptances (latest)
                      ├─ success + version matches → render app
                      ├─ success + no row / old version → show modal
                      └─ ERROR / network fail ──► hasAccepted=false ──► SHOW MODAL  ❌
                                                                            │
                                                                            └─ Accept → INSERT duplicate row
```

## Proposed flow

```text
App mount
  └─ AuthContext: getSession() → user
       └─ TosGate (waits for auth + tos resolution)
            └─ useTosAcceptance.checkTosAcceptance()
                 ├─ navigator.onLine === false → status="unknown", DO NOT gate
                 └─ SELECT tos_acceptances (latest)
                      ├─ success + version matches → status="accepted" → render app
                      ├─ success + no row              → status="missing"  → show modal (new user only)
                      ├─ success + older version       → status="outdated" → show modal
                      └─ network/5xx error
                            └─ retry up to 3x w/ backoff
                                 ├─ eventually succeeds → handle as above
                                 └─ still failing       → status="unknown" → DO NOT gate ✅
                                                            (log + optionally toast)
       └─ Online again (window 'online' event) → refetch
```

Key rule: **never show the ToS modal unless we have a confirmed "no acceptance" or "outdated version" response from the server.** Errors and offline are not consent signals.

## Changes

1. **`src/hooks/useTosAcceptance.ts`**
   - Replace boolean `hasAcceptedCurrentTos: boolean | null` semantics with a three-state status: `'accepted' | 'needs_acceptance' | 'unknown'` (keep the existing boolean export for backwards compat, derived from status).
   - On Supabase error or thrown exception → set status `'unknown'` (NOT `needs_acceptance`).
   - Add retry-with-backoff (3 attempts, 500ms → 1s → 2s) for transient errors.
   - Skip the fetch when `navigator.onLine === false`; mark status `'unknown'`.
   - Add `window` `'online'` listener to auto-refetch when connectivity returns.
   - In `acceptTos`, do a "latest row" check before insert to avoid duplicate rows for the same version (defensive — main fix is not showing the modal in the first place).

2. **`src/components/auth/TosGate.tsx`**
   - Only render `<TosAcceptanceModal>` when status is explicitly `'needs_acceptance'`. For `'unknown'`, render `{children}` (app stays usable; user is not nagged).
   - Keep existing new-signup race-condition handling as-is.

3. **(Optional cleanup, not required)** A one-off SQL cleanup to dedupe historical `tos_acceptances` rows per `(user_id, tos_version)` — happy to do this in a follow-up if you want; not needed to fix the bug.

## Files touched

- `src/hooks/useTosAcceptance.ts` (logic rewrite)
- `src/components/auth/TosGate.tsx` (gate only on `needs_acceptance`)

No DB migration required for the fix itself.
