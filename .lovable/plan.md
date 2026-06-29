
# Standardize status keys across boards

Unify on `'done'` as the canonical "finished" status across both `goals` and `weekly_objectives`, and remove the redundant `is_completed` boolean. Social Pipeline keeps its domain-specific stages and is out of scope.

## End state

| Surface | Status enum |
|---|---|
| `goals.status` | `not_started` \| `in_progress` \| `done` |
| `weekly_objectives.status` | `not_started` \| `in_progress` \| `done` |
| `weekly_objectives.is_completed` | **removed** |
| Shared TS type | `BoardStatus = 'not_started' \| 'in_progress' \| 'done'` |
| Social Pipeline | unchanged (own column ids) |

## Phase 1 — Database migration

Single migration, transactional:

1. `ALTER TYPE goal_status RENAME VALUE 'completed' TO 'done'` (Postgres supports this in-place; no row rewrite).
2. Update goal-side SQL: any function/trigger filtering on `'completed'` (status auto-promotion trigger, `goal_status_history` logic, RLS predicates if any).
3. Replace every read of `weekly_objectives.is_completed` with `status = 'done'` inside SQL functions, then `ALTER TABLE weekly_objectives DROP COLUMN is_completed`.
4. Drop the sync trigger that maintained `is_completed`.
5. Re-grant nothing (no new tables).

## Phase 2 — Code sweep

Single source of truth in `src/lib/objectiveStatus.ts` (already exists): export `BoardStatus`, status→column map, and `isDone(status)` helper. Re-export from `src/types/goals.ts` so goals use the same union.

Replace, in this order:

**A. Goals: `'completed'` → `'done'`** (~15 files)
- `src/types/goals.ts`, `src/hooks/useGoals.ts`, `src/services/weeklyProgressService.ts`
- `src/components/goals/{GoalsKanban,GoalCard,GoalDetailModal,GoalSearchFilter,OrganizedGoalsView,HabitCompletionTimeline}.tsx`
- `src/components/accountability/{PartnerGoalsKanban,PartnerGoalCard}.tsx`
- `src/components/profile/ProfileGoals.tsx`, `src/components/admin/UserDetailDrawer.tsx`
- `src/hooks/{useProfileStats,useAnalyticsSummary,useCarryOverObjectives}.ts`
- `src/utils/quarterUtils.ts`, `src/components/rituals/PlanningTrendsChart.tsx`, `src/components/habits/QuarterlyReviewDialog.tsx`
- MCP: `supabase/functions/mcp-server/{read-tools,write-tools,training-tools,resources-prompts}.ts`

**B. Objectives: `is_completed` → `status === 'done'`** (~30 files, ~120 references)
- Services: `weeklyProgressService`, `habitStreaksService`, `accountabilityService`
- Hooks: `useWeeklyPlanning`, `useWeeklyObjectives`, `useWeeklyDashboardData`, `useWeekTransition`, `useCategoryFocus`, `useWeekClose`, `useAnalyticsSummary`, `useAISuggestions`, `useQuarterlyReview`, `useObjectiveMutations`, `useObjectiveHandlers`, `useEnsureTrainingWeeklyObjective`, `useWeeklyInsights`
- Components: `ThisWeekView`, `WeekTransitionCard`, `HistoricalWeekSummary`, `HabitsDueThisWeek`, `ObjectiveItem`, `ObjectiveStatusPill`, `GoalDetailObjectivesSection`, `IncompleteObjectiveReflections`, `PreviousWeekSummary`, `HabitCompletionTimeline`, `WeeklySessionDetailModal`, `WeeklyPlanningTab`, `StreakHistoryChart`, `QuarterlyReviewsTab`, `QuarterlyReviewDialog`, `WeeklyPlanningHistory`, `QuarterlyReviewsHistory`, `WeeklyPlanningDialog`, `UserDetailDrawer`, `PartnerDashboard`
- Edge functions: `weekly-insights`, `mcp-server/*`
- `src/types/{weeklyProgress,habits}.ts`

Mutation sites that previously wrote `is_completed: true/false` now write only `status: 'done' | 'in_progress' | 'not_started'`.

## Phase 3 — Verification

1. `tsgo` typecheck — Supabase types regenerate after the migration; any stale `'completed'` literal on goals or `is_completed` reference becomes a compile error. Treat the typecheck as the completeness gate.
2. `rg "'completed'" src/ supabase/functions/` and `rg "is_completed" src/ supabase/functions/` must return zero hits (outside `integrations/supabase/types.ts`, which is auto-generated).
3. Manual smoke via Playwright: mark a goal done, mark an objective done from list view, drag an objective across columns in the Kanban, verify the Done count in This Week and the analytics radar.

## Risk & rollback

- **Risk:** any string-literal comparison missed becomes a silent no-op (button does nothing). Mitigation: the shared `BoardStatus` union + typecheck catches all of them at compile time. Goal `status` is already a discriminated union from generated types — same protection.
- **Rollback:** `ALTER TYPE goal_status RENAME VALUE 'done' TO 'completed'` and re-add the `is_completed` column with a backfill from `status`. Cheap.

## Out of scope

- Social Pipeline (different domain).
- Extracting the shared `<KanbanBoard>` primitive — that's the next plan.
- Any UI/visual changes.

## Order of operations

1. Run the migration (Phase 1). Wait for types to regenerate.
2. Code sweep (Phase 2) in one pass — typecheck will guide.
3. Verify (Phase 3).
