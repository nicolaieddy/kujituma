## Goal

Turn the app from "everything for everyone" into a **core + modules** product. Today, every user sees Training Plan on This Week and Strava/Garmin/FIT plumbing in Profile whether they want it or not. After this change, only **Goals, Habits, Daily Check-in, Weekly Planning** are core; everything else (starting with **Training Plan**) is an installable module browsed from a dedicated Modules page.

## What changes for the user

### Core (always on)
- Goals, Habits, Daily Check-in, Weekly Planning, Analytics (basic), Profile.

### Modules (opt-in, off by default for new users)
- **Training Plan** — workouts, Strava/Garmin/.FIT, sleep ingestion, Training Plan card on This Week, training MCP tools.
- The framework is built so future modules (e.g. Accountability, Values, Duolingo) can be added without re-architecting.

### Modules page (`/modules`)
- New nav entry. App-store style grid of cards: cover image, name, one-line pitch, "Free / Pro / Coming soon" badge, **Install / Uninstall** button.
- Module detail drawer: longer description, screenshots, "What it adds" (nav items, This Week cards, integrations), "What data it stores".
- Uninstall flow: confirms data is **kept** (so a re-install restores everything) but hidden until re-enabled. Optional "Also delete my data" checkbox for a clean wipe.

### Existing users
- A one-time migration auto-enables Training Plan for anyone who already has rows in `synced_activities`, `training_plan_workouts`, `strava_connections`, `garmin_connections`, or `sleep_entries`. Zero disruption.
- New signups land with core-only and discover Training Plan via Modules.

## Architecture

### Module registry (frontend, single source of truth)
A new `src/modules/registry.ts` exports an array of `ModuleDefinition` objects. Each describes everything the app needs to mount the module conditionally:

```text
ModuleDefinition {
  id: "training_plan"
  name, tagline, description, coverImage, screenshots
  category: "fitness" | "productivity" | ...
  tier: "free" | "pro"           // pricing surface, all "free" today
  status: "available" | "beta" | "coming_soon"
  navItems:   [{ path, label, icon }]
  thisWeekSlots: [<lazy component refs>]
  profileSections: [<lazy component refs>]
  mcpTools: ["training.*"]       // server-side gating
  dataTables: ["synced_activities", ...]   // shown in detail + used by uninstall
  requiredIntegrations?: ["strava" | "garmin"]
}
```

Adding a new module = adding one entry + writing its components. No more scattering `if (hasTraining)` checks.

### Entitlement / state
- New table `public.user_modules(user_id, module_id, status, installed_at, settings jsonb)` with RLS scoped to `auth.uid()`. `status` = `installed | uninstalled`.
- `useInstalledModules()` hook (TanStack Query) returns the set of installed module IDs for the current user; cached and invalidated on install/uninstall.
- A `<ModuleGate moduleId="training_plan">` wrapper renders children only when installed (used for nav items, This Week card slot, profile sections, route guards).
- Server-side gate: the MCP server, `strava-sync`, `garmin-sync`, `parse-fit-file`, etc. check `user_modules` and short-circuit if the module is not installed (prevents background jobs from running for uninstalled users).

### Routing
- Routes for module pages (e.g. nothing today, but a future `/training` page) get wrapped in `<RequireModule id="...">` that redirects to `/modules` with a CTA if not installed.

### This Week composition
- `ThisWeekView` stops importing `TrainingPlanCard` directly. Instead it iterates `installedModules` and renders each module's `thisWeekSlots`. Order driven by a `sortOrder` field on the module def (later: drag-to-reorder in Modules settings).

### Profile composition
- Same pattern: Profile renders module-contributed sections (e.g. Strava connection, Garmin, Workout Preferences) only when Training Plan is installed.

### Server-side enforcement
- `has_module(_user_id uuid, _module text)` security-definer SQL function — analogous to `has_role` — used by RLS policies and edge functions.
- Edge functions (`strava-sync`, `garmin-sync`, `parse-fit-file`, MCP training tools) call `has_module(user.id, 'training_plan')` first and return early with a clear error if false.

### Pricing-ready schema (no monetization today)
- `user_modules.status` includes `trialing` and `expired` for future use; `tier`, `price_cents`, `interval` live on the (static) module registry — easy to migrate to a DB-backed catalog when a paid tier ships.

## Migration plan

1. **Schema**: create `user_modules`, `has_module()`, grants, RLS.
2. **Backfill**: insert `(user_id, 'training_plan', 'installed')` for any user with rows in the training tables above.
3. **Registry & gating**: introduce `src/modules/registry.ts`, `useInstalledModules`, `<ModuleGate>`, `<RequireModule>`.
4. **Refactor mounts**: move `TrainingPlanCard` mount in `ThisWeekView` and Strava/Garmin/.FIT/Workout-prefs sections in Profile behind the gate.
5. **Modules page**: new `/modules` route, registry-driven grid, install/uninstall mutations.
6. **Nav**: add "Modules" entry; hide module-specific nav items for uninstalled users.
7. **Server gating**: `has_module` checks in Training-related edge functions + MCP training tools.
8. **Onboarding nudge**: after the existing wizard, show a one-screen "Explore modules" prompt linking to `/modules` (skippable).
9. **Memory update**: add a new `mem://architecture/modules-system` entry documenting the registry + gating contract so future modules follow the same pattern.

## Out of scope (call out for follow-up)

- Actual billing wiring (Stripe/Paddle) for Pro modules — schema is ready, UI shows a "Coming soon — free for now" badge.
- Per-module notification preferences split — current notifications stay global; can be moved into module settings later.
- Drag-to-reorder This Week cards — start with a fixed `sortOrder` field.
- Carving Accountability, Values, Duolingo, Analytics-advanced into modules — the framework supports it, but only Training Plan is migrated in this pass to keep the diff reviewable.

## Risks / open questions

- The Training Plan card currently lives inside `ThisWeekView` with hardcoded props; moving it to a slot system needs a small adapter so it still receives the week context. Low risk, mostly mechanical.
- MCP server tool list shown in `McpSection.tsx` must filter by installed modules so users don't see training tools they can't use. Already in scope of step 7.
- Uninstall semantics: defaulting to "keep data" is safer but means users won't reclaim storage until they explicitly opt to wipe. Worth confirming the copy in the uninstall dialog before shipping.
