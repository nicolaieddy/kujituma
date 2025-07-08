interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;

  constructor() {
    // Load from localStorage on init
    this.loadFromStorage();
    
    // Clean up expired items every minute
    setInterval(() => this.cleanup(), 60 * 1000);
    
    // Save to localStorage every 30 seconds
    setInterval(() => this.saveToStorage(), 30 * 1000);
  }

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // If cache is full, remove oldest items
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    this.stats.sets++;
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.data as T;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) this.stats.deletes++;
    return result;
  }

  clear(): void {
    this.cache.clear();
    localStorage.removeItem('cache_data');
  }

  getStats(): CacheStats & { size: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  // Cache key generators for common data types
  keys = {
    userProfile: (userId: string) => `user_profile_${userId}`,
    userPosts: (userId: string, period: string) => `user_posts_${userId}_${period}`,
    allPosts: (period: string) => `all_posts_${period}`,
    notifications: (userId: string) => `notifications_${userId}`,
    goals: (userId: string) => `goals_${userId}`,
    popularGoals: () => 'popular_goals',
    userStats: (userId: string) => `user_stats_${userId}`
  };

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private saveToStorage(): void {
    try {
      const serializable = Array.from(this.cache.entries()).slice(0, 100); // Limit storage size
      localStorage.setItem('cache_data', JSON.stringify(serializable));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('cache_data');
      if (stored) {
        const entries = JSON.parse(stored);
        const now = Date.now();
        
        // Only load non-expired items
        entries.forEach(([key, item]: [string, CacheItem<any>]) => {
          if (now - item.timestamp < item.ttl) {
            this.cache.set(key, item);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }
}

export const cacheService = new CacheService();