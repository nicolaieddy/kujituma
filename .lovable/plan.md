

# Transparent Auth Optimization: Synchronized Auth Store

## The Problem

Services need auth data but can't access React context. Currently they call `supabase.auth.getUser()` which makes a network request (~200ms) on every call. With 10-20 service calls per page, this adds 2+ seconds of latency.

## The Solution

Create a **synchronized auth store** - a module-level singleton that:
1. Automatically stays in sync with `AuthContext`
2. Provides **synchronous** access to auth from anywhere (services, utilities, etc.)
3. Requires **zero changes** to service method signatures or hooks

This is similar to how libraries like Zustand or Jotai work - state lives outside React but stays synchronized.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                     React Component Tree                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  AuthProvider                                        │    │
│  │  - Subscribes to supabase.auth.onAuthStateChange    │    │
│  │  - On every change: authStore.setUser(user)  ───────┼────┼──┐
│  └─────────────────────────────────────────────────────┘    │  │
│                                                             │  │
│  ┌─────────────────────────────────────────────────────┐    │  │
│  │  useGoals hook                                       │    │  │
│  │  └─> GoalsService.getGoals()                        │    │  │
│  └─────────────────────────────────────────────────────┘    │  │
└─────────────────────────────────────────────────────────────┘  │
                                                                  │
┌─────────────────────────────────────────────────────────────┐  │
│                    authStore (module)                        │◄─┘
│  ┌─────────────────────────────────────────────────────┐    │
│  │  private _user: User | null = null                  │    │
│  │  private _session: Session | null = null            │    │
│  │                                                     │    │
│  │  setUser(user, session) { ... }  ◄──────────────────┼────┘
│  │  getUser() { return this._user }  // Synchronous!   │
│  │  requireUser() { if (!_user) throw; return _user }  │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
          │
          │  Synchronous access (0ms)
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      GoalsService                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  async getGoals() {                                 │    │
│  │    const user = authStore.requireUser(); // 0ms     │    │
│  │    return supabase.from('goals')...                 │    │
│  │  }                                                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### Step 1: Create the Auth Store

Create a new file that acts as a synchronized store for auth state.

**File: `src/stores/authStore.ts`**

```typescript
import { User, Session } from '@supabase/supabase-js';

/**
 * Synchronized auth store - provides synchronous access to auth state
 * from anywhere in the application (services, utilities, etc.)
 * 
 * This store is kept in sync by AuthContext via setAuth().
 * Services can read from it synchronously without network calls.
 */
class AuthStore {
  private _user: User | null = null;
  private _session: Session | null = null;

  /**
   * Called by AuthContext whenever auth state changes.
   * This keeps the store synchronized with React state.
   */
  setAuth(user: User | null, session: Session | null) {
    this._user = user;
    this._session = session;
  }

  /**
   * Get current user synchronously. Returns null if not authenticated.
   * Use this when you want to handle the null case yourself.
   */
  getUser(): User | null {
    return this._user;
  }

  /**
   * Get current session synchronously. Returns null if not authenticated.
   */
  getSession(): Session | null {
    return this._session;
  }

  /**
   * Get current user or throw if not authenticated.
   * Use this in services where authentication is required.
   */
  requireUser(): User {
    if (!this._user) {
      throw new Error('User not authenticated');
    }
    return this._user;
  }

  /**
   * Get current user ID or throw if not authenticated.
   * Convenience method for the most common use case.
   */
  requireUserId(): string {
    return this.requireUser().id;
  }

  /**
   * Check if user is authenticated.
   */
  isAuthenticated(): boolean {
    return this._user !== null;
  }

  /**
   * Clear auth state (called on sign out).
   */
  clear() {
    this._user = null;
    this._session = null;
  }
}

// Export singleton instance
export const authStore = new AuthStore();
```

### Step 2: Sync AuthContext with the Store

Update `AuthContext.tsx` to push auth changes to the store.

**Changes to `src/contexts/AuthContext.tsx`:**

```typescript
import { authStore } from '@/stores/authStore';

// In the onAuthStateChange callback, after setting React state:
setSession(session);
setUser(session?.user ?? null);
authStore.setAuth(session?.user ?? null, session);  // ADD THIS

// In signOut, before redirect:
authStore.clear();  // ADD THIS
window.location.href = '/';
```

### Step 3: Update Services to Use the Store

Replace async auth calls with synchronous store access.

**Before (in any service):**
```typescript
static async getGoals(): Promise<Goal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id);
  // ...
}
```

**After:**
```typescript
import { authStore } from '@/stores/authStore';

static async getGoals(): Promise<Goal[]> {
  const userId = authStore.requireUserId();  // Synchronous, 0ms
  
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId);
  // ...
}
```

---

## Why This Pattern Works

1. **Transparent**: Service method signatures don't change - callers are unaffected
2. **Centralized**: One place to add future optimizations (logging, metrics, etc.)
3. **Synchronous**: No async overhead for auth - it's just a property access
4. **Safe**: If the store is out of sync (edge case), services throw immediately rather than making unauthorized requests
5. **Familiar**: This is how Zustand, Jotai, and other state libraries work outside React

## Extending the Pattern

This same pattern can be extended for other cross-cutting concerns:

**Future possibilities:**
- Request deduplication (don't fetch same data twice in flight)
- Query result caching (like your `lightweightCache`)
- Request batching (combine multiple small queries)
- Logging/telemetry middleware

```typescript
// Example: Adding request tracking
class AppStore {
  auth: AuthStore;
  requests: RequestTracker;
  cache: CacheStore;
}

export const appStore = new AppStore();
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/stores/authStore.ts` | **Create** - new auth store |
| `src/contexts/AuthContext.tsx` | Sync with authStore on state changes |
| `src/services/goalsService.ts` | Replace `getUser()` with `authStore.requireUserId()` |
| `src/services/habitsService.ts` | Replace ~17 instances |
| `src/services/weeklyProgressService.ts` | Replace ~15 instances |
| `src/services/accountabilityService.ts` | Replace ~20 instances |
| `src/services/friendsService.ts` | Replace ~5 instances |
| `src/services/habitCompletionsService.ts` | Replace ~4 instances |
| `src/services/notificationsService.ts` | Replace ~4 instances |
| `src/services/dailyStreakService.ts` | Replace ~3 instances |
| `src/services/habitStreaksService.ts` | Replace ~3 instances |
| `src/services/customCategoriesService.ts` | Replace ~2 instances |
| `src/services/carryOverLogService.ts` | Replace ~2 instances |
| `src/utils/authUtils.ts` | Update to use authStore internally |

---

## Technical Considerations

### Race Condition Prevention

The store is updated synchronously in the same React render cycle as the context state. By the time any hook calls a service, the store is already current.

### SSR Compatibility

Not applicable - this is a client-only Vite/React app.

### Testing

Services become easier to test - you can set `authStore.setAuth(mockUser, mockSession)` in test setup instead of mocking Supabase auth.

---

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Auth calls per page | 10-20 network requests | 0 |
| Auth latency | 150-300ms each | 0ms |
| Total page load overhead | 2-4 seconds | 0 seconds |
| Service complexity | Async auth handling | Synchronous access |

