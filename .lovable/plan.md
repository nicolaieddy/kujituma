

# Database Query Performance Optimization Plan

## ✅ COMPLETED IMPLEMENTATION

### Summary
Successfully implemented performance optimizations to reduce database round-trips from 8-12 sequential queries to 2-3 parallel queries.

### Changes Made

#### 1. Database Migration (DONE)
Created new RPC functions:
- `get_weekly_dashboard_data(p_week_start, p_last_week_start)` - Returns objectives, progress post, planning session, and last week data in one call
- `get_habit_stats_data()` - Returns goals with habits and all habit objectives in one call
- `get_carryover_data(p_current_week_start)` - Returns incomplete, carried-over, and dismissed objectives in one call

Added performance indexes:
- `idx_goals_user_status` - Partial index on goals for user/status lookups
- `idx_weekly_objectives_user_week` - Index for weekly objectives by user/week
- `idx_weekly_progress_posts_user_week` - Index for progress posts by user/week

#### 2. New Hooks (DONE)
- `src/hooks/useWeeklyDashboardData.ts` - Consolidated hook using `get_weekly_dashboard_data` RPC
- `src/hooks/useHabitStatsOptimized.ts` - Optimized habit stats hook using `get_habit_stats_data` RPC
- `src/hooks/useCarryOverDataOptimized.ts` - Optimized carry-over data hook using `get_carryover_data` RPC

#### 3. Updated Hooks (DONE)
- `src/hooks/useHabitStats.ts` - Now uses `get_habit_stats_data` RPC instead of multiple queries
- `src/hooks/useWeekTransition.ts` - Now uses `useWeeklyDashboardData` instead of 3 separate queries

#### 4. Enhanced Prefetching (DONE)
- `src/App.tsx` - Updated `usePrefetchDashboardData` to prefetch goals, dashboard data, and habit stats in parallel on user authentication

### Expected Performance Improvement
- **Before**: 8-12 sequential database queries (800-1200ms on slow connections)
- **After**: 2-3 parallel queries using RPCs (200-400ms)
- **Perceived improvement**: 60-70% faster initial load

### Testing Checklist
- [ ] Goals page loads within 500ms on fast connections
- [ ] All data displays correctly (objectives, habits, carry-over)
- [ ] Week navigation still works
- [ ] Real-time updates still function
- [ ] Offline mode still caches data correctly
- [ ] No regressions in existing functionality

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

