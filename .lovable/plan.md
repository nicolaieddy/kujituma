## Recommendation

Yes, fold it in. Kujituma already has a clean module system (`src/modules/registry.ts`) that gates Training, Sleep, and Health Metrics behind a per-user toggle, with their own routes, nav tabs, profile sections, MCP tool prefixes, and data tables. NetworkOS slots into the same shape as a `network` module — one auth, one Supabase, one subscription, one MCP server, and your network data starts feeding the same weekly planning and check-in rituals.

Risks are low and known:
- Schema collisions (e.g. `profiles`, `user_roles`) — handled by namespacing NetworkOS tables.
- Auth user IDs differ between the two Supabase projects — handled by a one-time export/import keyed to your single user.
- Edge function names, secrets, and any OAuth redirect URIs need to move to Kujituma's Supabase project.

## Blocker before I can finalise the plan

NetworkOS is not in this Lovable workspace yet — I checked all 23 accessible projects. Once you add it, I can read the schema, routes, edge functions, and integrations directly and replace the placeholders below with concrete steps.

How to add it: open the NetworkOS project → Settings → Workspace → move it into the same workspace as Kujituma. Then ping me and I'll do the read-only assessment.

## What I'll inspect once I have access

1. `supabase/migrations/*` — every table, RLS policy, trigger, function. Catalogue collisions with Kujituma's schema.
2. `supabase/functions/*` — list edge functions, secrets they read, external APIs they call.
3. `src/App.tsx` + `src/pages/*` — top-level routes to merge under a single `/network` parent.
4. `src/integrations/*` and `package.json` — third-party SDKs that need installing here.
5. Any OAuth flow (Google contacts, LinkedIn, etc.) — redirect URI changes required.

## Proposed integration shape

Module registry entry (mirrors Training/Sleep):

```ts
{
  id: "network",
  name: "Network",
  tagline: "Track relationships, touchpoints, and follow-ups.",
  category: "relationships",
  tier: "free",
  status: "available",
  surfaces: {
    pages: ["Dedicated Network page (/network)"],
    thisWeekCards: ["Relationships card already in weekly planning"],
    profileSections: ["Network preferences"],
    mcpToolPrefixes: ["network_", "contact_", "touchpoint_"],
  },
  dataTables: [/* filled after schema review */],
}
```

Layout:

```text
Kujituma
├── Core (Goals, Habits, Daily Check-in, Weekly Planning, Analytics)
├── Modules
│   ├── Training Plan       /training
│   ├── Sleep               /sleep
│   ├── Health Metrics      /health
│   └── Network (new)       /network   ← gated by module toggle
└── Profile
    └── Modules tab — Network appears here for opt-in
```

## High-level migration steps (sequenced)

1. **Schema port.** New migration in Kujituma's Supabase that recreates NetworkOS tables prefixed/namespaced where they collide (e.g. `network_contacts`, `network_touchpoints`). Includes GRANTs + RLS scoped to `auth.uid()`.
2. **Data export/import.** Export your rows from NetworkOS (CSV per table), remap `user_id` to your Kujituma `auth.uid()`, import into the new tables.
3. **Edge functions.** Copy each NetworkOS function into `supabase/functions/`, swap secret names if any clash, re-add secrets in Kujituma's Supabase project.
4. **Frontend port.** Copy pages → `src/pages/network/`, components → `src/components/network/`, hooks → `src/hooks/network/`. Mount one parent route `/network` gated by `useModule("network")`.
5. **Nav + registry.** Add the `network` module to `MODULE_REGISTRY` and the nav tab logic in `NavigationMenu.tsx` (same pattern as Training/Sleep).
6. **MCP tools.** Expose network entities to the MCP server (`network_list_contacts`, `network_recent_touchpoints`, etc.) and update `src/components/profile/McpSection.tsx` per project rules.
7. **Weekly planning hook-up.** Surface "people to follow up with this week" inside the existing Relationships section of Weekly Planning — this is the integration payoff.
8. **Domain decision.** Three options later:
   - Retire networkos.xyz, 301 → `kujituma.com/network`.
   - Keep networkos.xyz as a marketing page linking to the same app.
   - Run both as separate Lovable deploys off the same repo (more ops; skip unless needed).

## What I need from you next

- Add NetworkOS to this workspace.
- Confirm the module id (`network` vs `networkos` vs `relationships`) and the user-visible name.
- Confirm you're OK with a brief migration window where NetworkOS data is read-only during export → import (minutes, single user).
