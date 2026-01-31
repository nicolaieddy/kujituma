

# Database Query Performance Optimization Plan

## Executive Summary
The Goals page is slow to load because data is fetched using a **waterfall pattern** - multiple independent queries run sequentially rather than in parallel. Additionally, some services make redundant `supabase.auth.getUser()` calls and there are opportunities to create database functions that return combined data in a single round-trip.

## Current Problems Identified

### 1. Waterfall Query Pattern
When `ThisWeekView` loads, it triggers multiple hooks that each make independent database calls:
- `useGoals()` - fetches goals
- `useWeeklyProgress()` → `useWeeklyObjectives()` - fetches objectives
- `useWeeklyProgressPost()` - fetches progress post
- `useWeeklyFeedPost()` - fetches feed post
- `useHabitStats()` - fetches goals AGAIN + all habit objectives
- `useWeekTransition()` - fetches last week's objectives + progress post + planning session
- `useCarryOverObjectives()` - fetches incomplete objectives

These run **sequentially** because React Query doesn't parallelize across hooks by default when components mount.

### 2. Redundant Auth Checks
Every service method calls `supabase.auth.getUser()` individually:
```typescript
// In GoalsService.getGoals()
const { data: user } = await supabase.auth.getUser();
// In WeeklyProgressService.getWeeklyObjectives()  
const { data: { user } } = await supabase.auth.getUser();
// In HabitStreaksService.getAllHabitStats()
const { data: { user } } = await supabase.auth.getUser();
```
Each `getUser()` call is an extra round-trip to verify the session.

### 3. N+1 Pattern in HabitStreaksService
`getAllHabitStats()` does:
1. Fetch all goals with habits (1 query)
2. For each goal, calculate stats requiring filtering objectives

### 4. Multiple Queries for Related Data
`getIncompleteObjectivesFromPreviousWeeks()` makes 3 separate queries:
1. Incomplete objectives from past weeks
2. Current and future objectives (to check duplicates)
3. Dismissed objectives

## Proposed Solutions

### Solution 1: Create Combined RPC Functions (High Impact)
Create PostgreSQL functions that return all data needed for a view in a single call.

**New RPC: `get_weekly_dashboard_data`**
Returns: objectives, progress post, feed post, planning session, last week data - all in one call.

```sql
CREATE OR REPLACE FUNCTION get_weekly_dashboard_data(
  p_week_start TEXT,
  p_last_week_start TEXT
)
RETURNS JSONB
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'objectives', (SELECT COALESCE(jsonb_agg(wo.*), '[]'::jsonb) 
                   FROM weekly_objectives wo WHERE wo.user_id = auth.uid() AND wo.week_start = p_week_start),
    'progress_post', (SELECT row_to_json(wpp.*) 
                      FROM weekly_progress_posts wpp WHERE wpp.user_id = auth.uid() AND wpp.week_start = p_week_start),
    'feed_post', (SELECT row_to_json(fp.*) 
                  FROM unified_feed_posts fp WHERE fp.user_id = auth.uid() AND fp.week_start = p_week_start),
    'planning_session', (SELECT row_to_json(wps.*) 
                         FROM weekly_planning_sessions wps WHERE wps.user_id = auth.uid() AND wps.week_start = p_week_start),
    'last_week_objectives', (SELECT COALESCE(jsonb_agg(wo.*), '[]'::jsonb) 
                             FROM weekly_objectives wo WHERE wo.user_id = auth.uid() AND wo.week_start = p_last_week_start),
    'last_week_post', (SELECT row_to_json(wpp.*) 
                       FROM weekly_progress_posts wpp WHERE wpp.user_id = auth.uid() AND wpp.week_start = p_last_week_start)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Benefit**: Reduces 6 separate queries to 1 database round-trip.

### Solution 2: Create RPC for Habit Stats (Medium Impact)
`getAllHabitStats()` currently fetches goals, then objectives - can be combined:

```sql
CREATE OR REPLACE FUNCTION get_habit_stats_data()
RETURNS JSONB
AS $$
BEGIN
  RETURN jsonb_build_object(
    'goals_with_habits', (
      SELECT COALESCE(jsonb_agg(g.*), '[]'::jsonb)
      FROM goals g 
      WHERE g.user_id = auth.uid() 
        AND g.status != 'deleted' 
        AND g.habit_items IS NOT NULL 
        AND jsonb_array_length(g.habit_items) > 0
    ),
    'habit_objectives', (
      SELECT COALESCE(jsonb_agg(wo.*), '[]'::jsonb)
      FROM weekly_objectives wo
      WHERE wo.user_id = auth.uid()
        AND wo.goal_id IN (
          SELECT id FROM goals 
          WHERE user_id = auth.uid() 
            AND status != 'deleted'
            AND habit_items IS NOT NULL
        )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Solution 3: Parallel Query Hook (Medium Impact)
Create a custom hook that uses React Query's `useQueries` for parallel execution:

```typescript
// New hook: useWeeklyDashboardData
export const useWeeklyDashboardData = (weekStart: string) => {
  const { user } = useAuth();
  const lastWeekStart = useMemo(() => {
    // Calculate last week
  }, [weekStart]);

  return useQuery({
    queryKey: ['weekly-dashboard', user?.id, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weekly_dashboard_data', {
        p_week_start: weekStart,
        p_last_week_start: lastWeekStart
      });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
};
```

### Solution 4: Eliminate Redundant Auth Calls (Low-Medium Impact)
Pass user ID from hooks to service methods instead of re-fetching:

```typescript
// Before (in service)
static async getGoals(): Promise<Goal[]> {
  const { data: user } = await supabase.auth.getUser(); // ← Removed
  // ...
}

// After (with userId parameter)
static async getGoals(userId: string): Promise<Goal[]> {
  const { data: goals, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)  // ← Use passed userId
    // ...
}
```

**Note**: This requires updating all service methods and their callers.

### Solution 5: Add Missing Index for Goals User Lookup (Low Impact)
Currently missing a basic index for the most common query pattern:

```sql
CREATE INDEX IF NOT EXISTS idx_goals_user_status 
ON goals(user_id, status) 
WHERE status != 'deleted';
```

### Solution 6: Prefetch More Data on Auth (Medium Impact)
Expand `usePrefetchGoals` to prefetch all dashboard data:

```typescript
const usePrefetchDashboardData = (queryClient: QueryClient) => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user?.id) {
      const currentWeekStart = WeeklyProgressService.getWeekStart();
      
      // Prefetch all in parallel
      Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['goals', user.id],
          queryFn: GoalsService.getGoals,
        }),
        queryClient.prefetchQuery({
          queryKey: ['weekly-objectives', user.id, currentWeekStart],
          queryFn: () => WeeklyProgressService.getWeeklyObjectives(currentWeekStart),
        }),
        queryClient.prefetchQuery({
          queryKey: ['habit-stats', user.id],
          queryFn: HabitStreaksService.getAllHabitStats,
        }),
      ]);
    }
  }, [user?.id, queryClient]);
};
```

## Implementation Priority

| Solution | Impact | Effort | Priority |
|----------|--------|--------|----------|
| 1. Combined RPC Function | High | Medium | 1st |
| 6. Enhanced Prefetching | Medium | Low | 2nd |
| 2. Habit Stats RPC | Medium | Medium | 3rd |
| 3. Parallel Query Hook | Medium | Low | 4th |
| 4. Eliminate Auth Calls | Low-Med | High | 5th |
| 5. Add Missing Index | Low | Low | 6th |

## Technical Details

### Files to Create
1. **New migration file**: Create `get_weekly_dashboard_data` and `get_habit_stats_data` RPC functions
2. **`src/hooks/useWeeklyDashboardData.ts`**: New consolidated hook

### Files to Modify
1. **`src/App.tsx`**: Expand prefetching to include more data
2. **`src/hooks/useWeeklyProgress.ts`**: Use new RPC function
3. **`src/components/thisweek/ThisWeekView.tsx`**: Consume consolidated data
4. **`src/services/weeklyProgressService.ts`**: Add method for RPC call
5. **`src/hooks/useHabitStats.ts`**: Use RPC function for combined data

### Expected Performance Improvement
- **Before**: 8-12 sequential database queries (800-1200ms on slow connections)
- **After**: 2-3 parallel queries using RPCs (200-400ms)
- **Perceived improvement**: 60-70% faster initial load

## Testing Checklist

After implementation:
- [ ] Goals page loads within 500ms on fast connections
- [ ] All data displays correctly (objectives, habits, carry-over)
- [ ] Week navigation still works
- [ ] Real-time updates still function
- [ ] Offline mode still caches data correctly
- [ ] No regressions in existing functionality

