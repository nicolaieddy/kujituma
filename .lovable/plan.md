
# Social Module

A new **Social** module to plan, draft, schedule, track and reflect on posts across LinkedIn, X, Instagram, and TikTok — with per-platform follower targets, per-platform editable pillars, LinkedIn .xlsx analytics import, and full MCP coverage.

## Scope

In:
- Content pipeline across LinkedIn / X / Instagram / TikTok (one post can target multiple).
- Per-platform follower target + deadline, with pace bars.
- Per-platform editable pillars.
- Per-post metrics snapshots (impressions, reactions, comments, reposts, reach, profile views, followers gained, saves, sends, link clicks).
- Account-level follower growth log per platform.
- LinkedIn single-post `.xlsx` import (the format you uploaded), matched to a post by URL.
- Manual entry for X / IG / TikTok metrics (no parsers day one).
- Goal + values alignment: optional link to the existing "Grow credibility on LinkedIn" goal and to user values, reusing existing patterns.
- Full MCP tool surface so the AI assistant can read/write the pipeline.

Out (per your brief):
- Auto-posting / scheduling to platforms.
- X reply-finding agent.
- Scraping.

## UX

New left-nav item **Social** (lucide `Megaphone`). Tabs inside:

1. **Pipeline** — kanban-style columns by status: `idea → drafting → in_review → ready → scheduled → published`. Cards show title, platform chips, pillar chips, publish date, latest engagement rate. Drag to change status. Click → editor drawer.
2. **Calendar** — monthly view keyed off `publish_date`, color by platform.
3. **Analytics** — follower growth chart per platform with target pace line; top posts by ER; engagement by pillar / platform / format; latest snapshot per post.
4. **Setup** — per-platform settings: targets, deadlines, pillars (editable list per platform), enable/disable platforms.

**Post editor drawer**:
- Title (hook), body (markdown), media URLs.
- Platforms multi-select (only enabled platforms).
- Pillars multi-select (1, max 2; choices come from the first selected platform's pillar list, plus a "shared" view).
- Publish date, status, hold toggle, trust check.
- Reviewer, review notes, retro (markdown).
- Goal link (defaults to your LinkedIn goal but editable — never hardcoded).
- Values alignment (reuses existing `goal_value_links`-style pattern via a new `social_post_values`).
- Metrics tab inside the drawer: snapshot history table + "Add snapshot" + "Import LinkedIn .xlsx" button.

**Targets card on Analytics tab**: one row per enabled platform — current followers, net new (7/30d), pace to target, days to deadline, status pill (on-track / behind / ahead).

## Data model

Enums:
- `social_status`: `idea | drafting | in_review | ready | scheduled | published`
- `social_platform`: `linkedin | x | instagram | tiktok`
- `social_trust_check`: `passes | needs_work | not_checked`

Tables (all with `user_id`, RLS scoped to `auth.uid()`, standard `GRANT`s to `authenticated` + `service_role`):

- `social_platform_settings` — `(user_id, platform)` unique. `enabled bool`, `follower_target int`, `target_deadline date`, `current_followers_cached int` (denormalized for fast UI), `pillars text[]` (editable per platform), `notes text`. Seeded with sensible defaults the first time the page opens; **no hardcoded target values**.
- `social_posts` — title, body, status, `platforms social_platform[]`, `pillars text[]` (free-text refs to the per-platform list), `publish_date date`, `live_url`, `media text[]`, `trust_check`, `hold bool`, `reviewer_id uuid`, `review_notes`, `retro`, `goal_id uuid` (nullable FK to `goals`), timestamps.
- `social_post_metrics` — `post_id`, `platform`, `metrics_as_of date NOT NULL`, all integer counters, `engagement_rate numeric GENERATED ALWAYS AS ((reactions+comments+reposts)::numeric / NULLIF(impressions,0)) STORED`. Unique on `(post_id, metrics_as_of, platform)` so re-imports upsert.
- `social_follower_growth` — `platform`, `date`, `total_followers`, `net_new` (computed on insert via trigger using last entry per platform), `note`.
- `social_post_values` — `(post_id, value_id)` unique, `weight smallint 1-5`, mirroring `goal_value_links`.
- View `social_post_latest_metrics` — `DISTINCT ON (post_id, platform)` latest snapshot.
- Trigger on `social_post_metrics` insert/update: if `live_url` is set on the post and status < `published`, flip post to `published` and set `publish_date` to `metrics_as_of` when null.

## LinkedIn .xlsx import

New edge function `import-linkedin-post-analytics`:
- Accepts a storage path to an uploaded `.xlsx` (re-use existing `fit-files` bucket pattern or a new `social-uploads` bucket).
- Parses with `xlsx` (SheetJS) in Deno (`npm:xlsx@0.18`).
- Reads `Post URL`, `Post Date`, `Impressions`, `Members reached` → `reach`, `Profile viewers from this post` → `profile_views`, `Followers gained from this post` → `followers_gained`, `Reactions`, `Comments`, `Reposts`, `Saves`, `Sends on LinkedIn` → `sends`, `Link engagements` → `link_clicks`.
- Matches the post by `live_url == Post URL`. If no match: returns the row so the UI can prompt "Create new post from this URL?".
- Upserts a snapshot for `(post_id, today, linkedin)`; UI lets the user override `metrics_as_of`.

Upload UI:
- "Import LinkedIn analytics" button in Analytics tab and in post editor.
- Drag/drop `.xlsx`, shows parsed preview, then commits.

## MCP tools (added to existing `mcp-server` edge function)

New file `supabase/functions/mcp-server/social-tools.ts`, wired in `index.ts`:

- `list_social_posts` — filters: status, platform, pillar, date range, goal_id.
- `get_social_post` — one post + full metrics history + latest snapshot.
- `create_social_post` / `update_social_post` / `delete_social_post`.
- `log_social_metrics` — upsert snapshot on `(post_id, metrics_as_of, platform)`; auto-publish behavior.
- `log_follower_count` — upsert `(platform, date)`; computes `net_new`.
- `get_follower_growth` — series + pace vs the per-platform target read from `social_platform_settings`.
- `get_social_analytics` — engagement by pillar / platform / format, top posts.
- `get_social_platform_settings` / `update_social_platform_settings` — exposes targets/pillars/enabled per platform.

`McpSection.tsx` updated with the new tools (per Core memory).

## Frontend structure

```text
src/pages/Social.tsx                  — tab shell (Pipeline / Calendar / Analytics / Setup)
src/components/social/
  PipelineBoard.tsx                   — kanban
  PostEditorDrawer.tsx                — full post editor with metrics + values
  PostCard.tsx
  SocialCalendar.tsx
  SocialAnalytics.tsx
  PlatformTargetsCard.tsx
  FollowerGrowthChart.tsx
  PillarEngagementChart.tsx
  PlatformSettingsPanel.tsx           — per-platform target/deadline/pillars/enable
  LinkedInImportDialog.tsx
  MetricsSnapshotForm.tsx
src/hooks/
  useSocialPosts.ts
  useSocialMetrics.ts
  useFollowerGrowth.ts
  useSocialPlatformSettings.ts
src/lib/social.ts                     — enums, platform meta, formatters
supabase/functions/import-linkedin-post-analytics/index.ts
supabase/functions/mcp-server/social-tools.ts
```

Module registered in `src/modules/registry.ts` so it can be toggled per user like other modules.

## Targets — per platform, never hardcoded

`social_platform_settings` rows are created lazily and start blank. The Setup tab shows one card per platform with:
- Enable toggle.
- Follower target (integer input).
- Deadline (date picker).
- Editable pillar chips (`text[]`).

Pace math (used by Targets card + MCP):
```
needed_per_day = (target - current) / max(days_to_deadline, 1)
actual_per_day = (current - followers_30d_ago) / 30
status = on_track if actual_per_day >= needed_per_day * 0.9 else behind
```

## Notion migration (later)

Provide a one-shot importer that accepts CSV exports of `Social Content Pipeline`, `Post Metrics`, `Follower Growth` and upserts into the three new tables. Field mapping per your brief. Shipped as a hidden `/social/import` route guarded by your admin role.

## Build phases

1. Migration + RLS + GRANTs for all five tables, enum, view, trigger.
2. Hooks + Setup panel (so targets/pillars exist before posts).
3. Pipeline board + Post editor drawer (no metrics yet).
4. Metrics snapshot form + LinkedIn .xlsx importer edge function.
5. Analytics tab + follower growth chart + pace math.
6. Calendar view.
7. MCP tools + `McpSection.tsx` update.
8. Notion CSV importer (deferred, behind a flag).

## Open assumptions to confirm during build

- TikTok and IG pillar lists start empty — you'll fill them via Setup.
- `goal_id` defaults to the LinkedIn goal you mentioned **only when LinkedIn is the only platform on the post**; otherwise blank and editable.
- Reviewer FK points to `profiles.id`, not `auth.users`.

