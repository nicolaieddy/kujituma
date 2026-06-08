## Refactor plan — surgical, balanced

After a sweep of the codebase, here are the 7 highest-impact, lowest-risk wins. Everything below preserves current behavior and visual design. Each item ships as its own focused change so you can stop after any step.

### What I found
- **Zero `useMemo` / `useCallback` / `React.memo`** anywhere in the codebase (0 files). This is the single biggest perf lever — but blanket-adding it is an anti-pattern. I'll only apply it to genuinely hot/heavy components.
- **A handful of giant files** dragging on readability: `ProfileEditForm` (1198 LOC), `network/ContactDetail` (1157), `DailyCheckInDialog` (1066), `CheckInsFeed` (991), `accountabilityService` (1035), `useAnalytics` (779).
- **Query keys are stringly-typed and scattered** — same logical key spelled differently across hooks (`"synced_activities"` vs `"synced-activities"`, `"training-plan"` invalidated from 6+ places). This causes silent cache-miss bugs and slows mutation invalidation.
- **`LandingPage` is eagerly imported** in `App.tsx` while every other route is lazy — adds ~30-50KB to the auth'd-user first paint they never see.
- **QueryClient defaults** are reasonable (`staleTime: 5min`) but a few hot lists pass no `staleTime`, causing re-fetch on every mount.

### The 7 changes

**1. Centralized `queryKeys` factory** *(cleanliness + correctness)*
   Create `src/lib/queryKeys.ts` exporting a typed factory (`qk.weeklyObjectives(userId, weekStart)`, `qk.training.plan()`, etc.). Migrate the ~15 most-invalidated keys. Catches typos at compile time, makes invalidation auditable. **No runtime change, just safer.**

**2. Lazy-load `LandingPage`** *(perf — first paint for logged-in users)*
   Move to `React.lazy`, drop it from the initial bundle. ~30-50KB saved for the 95% of sessions that aren't first-visit-marketing.

**3. Memoize 4 heavy list/feed components** *(perf — perceived snappiness)*
   Wrap the row components inside these hot lists in `React.memo` + stabilize their props with `useCallback`:
   - `CheckInsFeed` row item
   - `OrganizedGoalsView` goal card
   - `TrainingWorkoutCard` (rendered in a week grid)
   - `HabitCompletionTimeline` day cell
   These are the components currently re-rendering on every parent state tick.

**4. Split `ProfileEditForm` (1198 LOC) into sections** *(cleanliness)*
   Extract `ProfileBasicsSection`, `ProfileAvatarSection`, `ProfileSocialLinksSection`, `ProfilePreferencesSection`. Pure structural split — same form, same submit, same validation. Improves render isolation as a bonus.

**5. Split `DailyCheckInDialog` (1066 LOC)** *(cleanliness)*
   Extract `MoodEnergyStep`, `HabitsStep`, `JournalStep`, `ReviewStep`. Already step-based logically — just hasn't been physically split. Each step renders only when active.

**6. Slim `useAnalytics` (779 LOC)** *(cleanliness + perf)*
   Currently one hook computes every analytics panel. Split into `useLifeBalanceData`, `useMoodEnergyTrends`, `useGoalCompletionStats`, `useHabitStreakLeaderboard`. Panels become independently cached, panels that aren't visible stop blocking the rest, and TanStack can dedupe properly.

**7. Audit & normalize mutation invalidations** *(correctness + perf)*
   After step 1, sweep every `invalidateQueries` and ensure:
   - It uses the typed factory.
   - It invalidates the *minimum* matching prefix (currently several mutations invalidate broad `["training-plan"]` and a half-dozen siblings — kills cache more than needed).
   - Mutations across the Training domain stop double-invalidating overlapping keys.

### Explicitly NOT touching
- `src/integrations/supabase/types.ts` (auto-generated)
- `components/ui/*` (shadcn primitives)
- Any RLS, edge functions, or DB schema
- MCP server tools / public API surface
- Visual design tokens, fonts, layout

### Technical notes
- All steps are additive or pure refactors — no API contract changes.
- Each step is one commit-sized change; if something feels risky after step N, we stop.
- I'll verify each step against the build and the preview before moving to the next.

### Order of operations
Steps 1 → 2 → 7 first (lowest risk, immediate wins), then 3 (perf), then 4 → 5 → 6 (file splits).

Want me to proceed top-to-bottom, or cherry-pick a subset?
