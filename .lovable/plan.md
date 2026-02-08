

# Performance Optimization: Goals Page Query Analysis

## Current State

After analyzing the Goals page query patterns, the application already follows best practices for data fetching:

### Optimized Patterns Already in Place
- **Consolidated RPC functions** for dashboard, habits, accountability, and partner data
- **Batch profile lookups** using `.in()` queries instead of N+1 patterns  
- **React Query caching** with appropriate staleTime (2-5 minutes)
- **`get_goals_objective_counts` RPC** returns all counts in one call for goal cards

## Identified Optimization Opportunity

### Goal Reordering (N queries → 1 query)

**Current Code** (`goalsService.ts` line 162-173):
```typescript
static async reorderGoals(reorderedGoals: { id: string; order_index: number }[]): Promise<void> {
  const promises = reorderedGoals.map(({ id, order_index }) =>
    supabase.from('goals').update({ order_index }).eq('id', id)
  );
  const results = await Promise.all(promises);
}
```

**Problem**: When reordering 10 goals, this creates 10 separate UPDATE queries.

**Solution**: Create a single RPC function to batch update all order indices.

---

## Implementation Plan

### Step 1: Create RPC Function for Batch Goal Reordering

Create a new migration with an RPC function that accepts an array of goal IDs and order indices, then performs a single batch update:

```sql
CREATE OR REPLACE FUNCTION public.reorder_goals(
  p_goal_orders jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  goal_order RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Batch update using a single query with CASE expression
  UPDATE goals g
  SET order_index = (p_goal_orders->>g.id::text)::integer
  WHERE g.id IN (SELECT jsonb_object_keys(p_goal_orders)::uuid)
    AND g.user_id = v_user_id;
END;
$$;
```

### Step 2: Update GoalsService

Modify the `reorderGoals` method to use the new RPC:

```typescript
static async reorderGoals(reorderedGoals: { id: string; order_index: number }[]): Promise<void> {
  // Convert to object format: { "goal-id-1": 0, "goal-id-2": 1, ... }
  const goalOrders: Record<string, number> = {};
  reorderedGoals.forEach(({ id, order_index }) => {
    goalOrders[id] = order_index;
  });

  const { error } = await supabase.rpc('reorder_goals', {
    p_goal_orders: goalOrders
  });

  if (error) throw error;
}
```

### Step 3: Update TypeScript Types

Add the new RPC function to the Supabase types.

---

## Technical Details

### Database Changes
| Change | Description |
|--------|-------------|
| New RPC: `reorder_goals` | Batch updates goal order_index values |
| Security | Uses `auth.uid()` to ensure users can only reorder their own goals |

### Performance Impact
| Metric | Before | After |
|--------|--------|-------|
| Queries per reorder | N (one per goal) | 1 |
| Network round-trips | N | 1 |
| Typical improvement | 10 goals = 10 queries | 10 goals = 1 query |

### Files to Modify
1. `supabase/migrations/[new].sql` - Add RPC function
2. `src/services/goalsService.ts` - Update `reorderGoals` method
3. `src/integrations/supabase/types.ts` - Add RPC type (auto-generated)

---

## Risk Assessment

**Low Risk**: 
- The change only affects the reordering operation
- Optimistic updates in the UI remain unchanged
- Fallback: If RPC fails, behavior is the same as current errors

**Testing**: Verify drag-and-drop reordering works correctly in all goal columns (Not Started, In Progress, Completed)

