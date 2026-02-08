
# Fix: Apply Auth Store Pattern to Remaining Files

## Overview

Two files were missed during the synchronized auth store refactor and still contain `supabase.auth.getUser()` calls that add unnecessary network latency.

## Files to Update

### 1. `src/services/unifiedPostsService.ts`

This service has a private `getCurrentUser()` helper method that wraps `supabase.auth.getUser()`. It's used in 10 places throughout the service.

**Current implementation:**
```typescript
private async getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
```

**Fix:**
Replace with `authStore.getUser()` for synchronous access:
```typescript
import { authStore } from '@/stores/authStore';

private getCurrentUser() {
  return authStore.getUser();
}
```

This change makes the method synchronous, eliminating 10 potential network calls per community feed load.

---

### 2. `src/components/profile/ProfileGoals.tsx`

This component directly calls `supabase.auth.getUser()` to verify if the current user matches the profile being viewed.

**Current implementation (line 125):**
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (user?.id === userId) {
  fetchedGoals = await GoalsService.getGoals();
}
```

**Fix:**
Import and use `authStore` instead:
```typescript
import { authStore } from '@/stores/authStore';

// In fetchGoals:
const user = authStore.getUser();
if (user?.id === userId) {
  fetchedGoals = await GoalsService.getGoals();
}
```

---

## Technical Notes

- `goalUpdatesService.ts` does NOT need changes - it was already designed correctly by accepting `userId` as a parameter rather than fetching auth internally
- All other services have already been updated in the previous implementation
- The authStore is already synced with AuthContext, so these changes will work immediately

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Profile page auth calls | 1 | 0 |
| Community feed auth calls | Up to 10 | 0 |
| Additional latency saved | 200-2000ms | 0ms |
