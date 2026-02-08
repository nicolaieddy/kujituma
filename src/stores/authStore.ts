import { User, Session } from '@supabase/supabase-js';

/**
 * Synchronized auth store - provides synchronous access to auth state
 * from anywhere in the application (services, utilities, etc.)
 * 
 * This store is kept in sync by AuthContext via setAuth().
 * Services can read from it synchronously without network calls.
 * 
 * This eliminates the ~200ms network latency per supabase.auth.getUser() call.
 * With 10-20 service calls per page, this saves 2+ seconds of load time.
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
