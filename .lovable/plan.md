

# Fix: Analytics Page Crash ("r is not a function")

## Problem

The analytics page crashes with a "r is not a function" error (minified). This happens because `AnalyticsDashboard` destructures `data` from `useAnalyticsSummary()`, which returns a React Query result. When the query completes but `data` is still `undefined` (e.g., a network hiccup, error state, or race condition), the component tries to access properties like `data.completionRate.toFixed(0)` on `undefined`, which crashes the app.

## Root Cause

In `src/components/analytics/AnalyticsDashboard.tsx` (line 10):
```typescript
const { data, isLoading } = useAnalyticsSummary();
```

After the `isLoading` check, the code assumes `data` is always defined -- but `useQuery` can return `data: undefined` even when `isLoading` is `false` (e.g., on error or when the query is disabled).

## Fix

**File: `src/components/analytics/AnalyticsDashboard.tsx`**

Add a fallback for `data` so it never crashes:

```typescript
const { data: rawData, isLoading } = useAnalyticsSummary();
const data = rawData ?? {
  completionRate: 0,
  completedObjectives: 0,
  totalObjectives: 0,
  currentStreak: 0,
  longestStreak: 0,
  goalsCompleted: 0,
  goalsInProgress: 0,
  activeWeeks: 0,
  avgObjectivesPerWeek: 0,
  weeklyProgress: [],
  categoryBreakdown: [],
  recentWeeks: [],
};
```

This is a one-line conceptual change -- provide a safe default when `data` is undefined, preventing the crash while still rendering the page (with zeros/empty states).

