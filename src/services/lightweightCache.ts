// Lightweight cache service for critical data only
class LightweightCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private readonly DEFAULT_TTL = 3 * 60 * 1000; // 3 minutes
  private readonly STORAGE_PREFIX = 'lw_cache_';

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });

    // Auto-cleanup to prevent memory leaks
    if (this.cache.size > 30) {
      this.cleanup();
    }
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  // Persistent storage methods for optimistic loading
  setPersistent<T>(key: string, data: T): void {
    try {
      localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(data));
    } catch (e) {
      // Storage full or unavailable, silently fail
    }
  }

  getPersistent<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  // Simple key generators
  keys = {
    userProfile: (userId: string) => `profile_${userId}`,
    posts: (type: string) => `posts_${type}`,
  };
}

export const lightweightCache = new LightweightCache();