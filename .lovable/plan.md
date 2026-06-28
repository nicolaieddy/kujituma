
# Media Module Plan

A new self-contained module under the existing Kujituma module registry. Owner-only canonical store, agent-fed candidates inbox, public press page, dashboard, and MCP tools. No changes to unrelated areas.

## 1. Module registration

- Add `media` to `src/modules/types.ts` (`ModuleId`) and a new entry in `src/modules/registry.ts` (category: `productivity`, status: `available`, lists `media_mentions` / `media_candidates` tables and `media_` MCP prefix).
- Route added in `src/App.tsx` behind `<ModuleGate module="media">` for `/media` (owner) and a public route `/press/:userId` (or `/press/:slug` — see Q1) outside the gate.

## 2. Database (single migration)

Enums:
- `media_type`: Article, Video, Article + Video, Podcast, Panel / Speaking, Press Conference, Interview, Quote, Social
- `media_url_status`: verified, verify, needs-url, no-url, dead
- `media_status`: Published, Upcoming, Draft
- `media_sentiment`: positive, neutral, negative
- `media_source`: manual, google-alert, mcp-agent, import
- `media_review_status`: pending, approved, rejected

Tables:
- `public.media_mentions` — columns per spec + `is_public bool default false`, `year int generated always as (extract(year from date)) stored`, timestamps, `updated_at` trigger.
- `public.media_candidates` — same columns + `raw_snippet`, `confidence numeric`, `review_status`, `approved_mention_id uuid references media_mentions(id) on delete set null`.
- Indexes: `(user_id, date desc)`, `(user_id, year)`, `(user_id, status)`, GIN on `tags`, unique partial `(user_id, lower(title), date, lower(outlet))` on `media_mentions` to enforce de-dupe.

Grants + RLS (per project rules):
- `media_mentions`: `GRANT SELECT ON ... TO anon` (needed for public press page), `SELECT/INSERT/UPDATE/DELETE TO authenticated`, `ALL TO service_role`.
  Policies: owner full access (`auth.uid() = user_id`); anonymous/public `SELECT` only when `is_public = true AND status = 'Published'`.
- `media_candidates`: no `anon` grant; owner full access; `service_role ALL` (used by edge functions and MCP agent writes through service role with explicit `user_id`).

## 3. Hooks & data layer

`src/hooks/media/`:
- `useMediaMentions(filters)` — list + filter (year/type/outlet/status/tag/url_status/search).
- `useMediaStats()` — counts by year/type/outlet, totals, featured count (single query, in-memory aggregates).
- `useMediaCandidates()` — pending inbox.
- `useMediaMutations()` — create/update/delete/approve/reject; invalidates `media`, `mediaStats`, `mediaCandidates` keys (per Core memory rule).

## 4. UI — `/media` page

Components under `src/components/media/`:
- `MediaPage` with three tabs: **Mentions**, **Inbox** (badge with pending count), **Public page settings**.
- `MediaDashboard` — top strip: total / featured / pending-review / needs-url counts; bar chart by year, by type, top-10 outlets, simple timeline (Recharts, matching existing analytics styling).
- `MediaTable` — sortable, filterable; `url_status` shown as colored chip (verified=green, verify=amber, needs-url=red, no-url=muted, dead=destructive). Filter pills + "Needs URL" quick filter. Row click opens drawer.
- `MediaEditorDrawer` — Radix sheet with all fields, tag chips input, public toggle, featured toggle, "Open archived snapshot" link.
- `MediaImportDialog` — CSV/XLSX upload (reuse pattern from `ImportDropzone`); parses with SheetJS, validates rows, shows preview with dup detection (matches existing `(title+date+outlet)` rows highlighted as skip), then bulk insert.
- `MediaCandidatesInbox` — card list for `review_status='pending'`; Approve / Reject / Edit-then-Approve. Approve calls edge function (handles archive + insert + mark candidate approved + link).

## 5. Public press page — `/press/:userId`

- Server-anon read of `media_mentions` filtered to `is_public=true AND status='Published'`, grouped by year desc, newest first.
- Standalone layout (no app chrome), share-friendly OG tags, copy-embed snippet button (iframe URL).
- Featured items pinned to top of their year with a small badge.

## 6. Edge functions

`supabase/functions/media-archive/index.ts`
- Input: `{ url }`. Tries to register snapshot at `https://web.archive.org/save/{url}` (Wayback "Save Page Now" public endpoint, no key), returns `archived_url` or null. Called from:
  - client `create` / `update` when URL changes
  - candidate `approve` flow
- Failures swallowed (returns `null`), never blocks the write.

`supabase/functions/media-approve-candidate/index.ts`
- JWT-verified. Copies candidate → `media_mentions` (respecting de-dupe), triggers archive, sets `review_status='approved'` + `approved_mention_id`.

## 7. MCP server extension

New file `supabase/functions/mcp-server/media-tools.ts`, registered in `mcp-server/index.ts` alongside existing modules. Prefix `media_`:

Read:
- `media_list` — filters: year, type, tag, status, limit.
- `media_search` — text query across title/outlet/summary/tags.
- `media_get_stats` — counts by year/type/outlet, totals, featured.

Write (all require the user's MCP token; user_id from token):
- `media_add_candidate` — any agent. Source forced to `mcp-agent`, lands in `media_candidates` pending. Returns candidate id.
- `media_add` — direct insert into `media_mentions` (owner intent), triggers archive.
- `media_update` — partial update by id, owner-scoped.

Update `src/components/profile/McpSection.tsx` tools list per Core memory rule.

## 8. CSV/XLSX import format

Column order matches spec exactly so the user's seed file imports directly:
`date, title, outlet, type, url, url_status, summary, tags, status, sentiment, featured, source, archived_url`
- `tags`: pipe- or comma-separated.
- `date`: ISO or Excel serial (parsed via existing date utilities).
- Missing `url_status` defaults to `needs-url` when `url` blank, else `verify`.

## 9. Out of scope

- No changes to other modules, no refactors of existing pages, no auth/role changes, no global feed (per Core: personal tracker).
- Google Alerts ingestion endpoint is not built now — `source='google-alert'` is just a tag for future use.

## Open questions before build

1. Public press page URL: `/press/:userId` (UUID, zero config) vs `/press/:slug` (requires a username/slug on `profiles` — heavier).
2. Wayback "Save Page Now" anonymous endpoint is rate-limited and sometimes blocks server IPs. OK to start with it and fall back to storing the raw URL only? Alternative is asking for an Archive.org S3-style key via `add_secret`.
3. Should the public page be enabled per-user via a single toggle (profile-level "press page on/off") in addition to per-item `is_public`, or is per-item enough?
