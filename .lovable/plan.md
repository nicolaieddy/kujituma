# Social Goals — proper saved goals with on-track projection

## What you'll get

- **Per platform**: one active **Followers** goal and one active **Posts published** goal at a time. Past goals stay in a small history list ("Previous goals") so you can see what you committed to before.
- **Setup tab**: the current "Follower target / Target deadline" inputs are replaced by a **Goals** card per platform with an "Add goal" / "Edit goal" button. The dialog walks you through:
  1. Pick metric (Followers / Posts published).
  2. Pick **start date** — the modal shows your recorded follower count for that date and asks you to **confirm or override** the starting value before continuing.
  3. Enter target value + target date.
  4. Optional toggle: "Also create this as a goal in my main Goals module" (creates a linked row in `goals`).
- **Active goal card** shows: start → target, expected today vs. actual today, % to target, days remaining, daily/weekly pace required, and a status pill — **On track**, **Behind**, **Ahead**, or **Achieved**.
- **Growth chart**: dashed projection line from `start_date, start_value` → `target_date, target_value` overlaid on the actual line, with a chart-level toggle "Show goal line" (defaults on; remembered per session).
- **Analytics tab**: a "Goals" section at the top with a card per active goal (followers + posts) showing the same on-track math, plus the same toggle.
- **Top of Social page**: compact summary strip — e.g. *"2 of 3 goals on track · 1 behind"* — clickable to scroll to Setup.
- **Main Goals module link**: when the "also create in Goals module" toggle is on, a corresponding `goals` row is created (category: "Social"), and updating the social goal keeps target/target_date in sync. Deleting in either place unlinks but doesn't cascade.

## How "on track" is computed

```text
expected_today = start_value + (target_value − start_value) × (days_elapsed / total_days)
delta = actual_today − expected_today
status =
  delta ≥ 0           → On track / Ahead (≥ +5% of remaining)
  delta within −5%    → On track
  delta < −5%         → Behind
actual_today ≥ target → Achieved
```

For **Posts published**, `actual_today` = count of `social_posts` with `published_at` between `start_date` and today on that platform.

## Technical details

**Schema** — new table `social_goals`:

```text
id uuid pk
user_id uuid (RLS: auth.uid())
platform text (linkedin/x/instagram/tiktok)
metric text ('followers' | 'posts_published')
start_date date            -- user-confirmed
start_value numeric        -- user-confirmed snapshot
target_value numeric
target_date date
status text ('active'|'archived'|'achieved')  -- only one 'active' per (user, platform, metric)
linked_goal_id uuid null   -- FK to public.goals when mirrored
notes text null
created_at, updated_at timestamptz
```

Partial unique index on `(user_id, platform, metric) WHERE status = 'active'` to enforce single-active rule. GRANTs + RLS per project conventions. Activating a new goal archives the previous active one in the same insert RPC.

Deprecate (keep columns for back-compat, stop reading) `social_platform_settings.follower_target` and `target_deadline`. Migration does not drop them.

**Hooks**:
- `useSocialGoals(platform?)` — list active + recent archived.
- `useUpsertSocialGoal` — handles archive-previous + optional mirror to `goals`.
- `useGoalProgress(goal)` — derives expected/actual/status from existing follower-growth and posts data already in cache.

**Components**:
- `social/GoalsCard.tsx` — replaces target inputs inside `PlatformSettingsPanel`.
- `social/GoalDialog.tsx` — create/edit flow with start-date snapshot confirm step.
- `social/GoalProjectionLine.tsx` — Recharts `<Line>` rendered conditionally in `CumulativeGrowthChart`.
- `social/GoalProgressStrip.tsx` — top-of-page summary.
- `social/AnalyticsGoalsSection.tsx` — cards on Analytics tab.

**Chart toggle**: small "Show goal line" switch in the chart header on both Growth and Analytics; state stored in `localStorage` (`social.showGoalLine`) so it persists across sessions.

**Migration to existing data**: on first load after deploy, if a platform has `follower_target` + `target_deadline` set but no `social_goals` row, show a one-time banner: *"Convert your existing target into a tracked goal?"* — one click creates the `social_goals` row using today's follower count as start_value.

## Out of scope (flag for later)
- Multi-goal stacking (you chose single active).
- Engagement-based goals.
- Email/notification alerts when a goal slips off-track.
