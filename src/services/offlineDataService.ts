import { get, set, del, keys } from 'idb-keyval';

// Keys for cached data
const CACHE_KEYS = {
  GOALS: 'offline_goals',
  WEEKLY_OBJECTIVES: 'offline_weekly_objectives',
  DAILY_CHECKIN: 'offline_daily_checkin',
  WEEKLY_PLANNING: 'offline_weekly_planning',
  PROFILE: 'offline_profile',
  STREAKS: 'offline_streaks',
  LAST_SYNC: 'offline_last_sync',
} as const;

interface CachedData<T> {
  data: T;
  timestamp: number;
  weekStart?: string;
}

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

class OfflineDataService {
  private isOnline = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  get online() {
    return this.isOnline;
  }

  // Generic cache setter
  async cacheData<T>(key: string, data: T, weekStart?: string): Promise<void> {
    try {
      const cached: CachedData<T> = {
        data,
        timestamp: Date.now(),
        weekStart,
      };
      await set(key, cached);
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  // Generic cache getter
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cached = await get<CachedData<T>>(key);
      if (!cached) return null;

      // Check if cache is still valid
      if (Date.now() - cached.timestamp > CACHE_DURATION) {
        await del(key);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  // Goals
  async cacheGoals(goals: any[]): Promise<void> {
    await this.cacheData(CACHE_KEYS.GOALS, goals);
  }

  async getCachedGoals(): Promise<any[] | null> {
    return this.getCachedData(CACHE_KEYS.GOALS);
  }

  // Weekly objectives
  async cacheWeeklyObjectives(objectives: any[], weekStart: string): Promise<void> {
    const key = `${CACHE_KEYS.WEEKLY_OBJECTIVES}_${weekStart}`;
    await this.cacheData(key, objectives, weekStart);
  }

  async getCachedWeeklyObjectives(weekStart: string): Promise<any[] | null> {
    const key = `${CACHE_KEYS.WEEKLY_OBJECTIVES}_${weekStart}`;
    return this.getCachedData(key);
  }

  // Daily check-in
  async cacheDailyCheckIn(checkIn: any, date: string): Promise<void> {
    const key = `${CACHE_KEYS.DAILY_CHECKIN}_${date}`;
    await this.cacheData(key, checkIn);
  }

  async getCachedDailyCheckIn(date: string): Promise<any | null> {
    const key = `${CACHE_KEYS.DAILY_CHECKIN}_${date}`;
    return this.getCachedData(key);
  }

  // Weekly planning
  async cacheWeeklyPlanning(session: any, weekStart: string): Promise<void> {
    const key = `${CACHE_KEYS.WEEKLY_PLANNING}_${weekStart}`;
    await this.cacheData(key, session, weekStart);
  }

  async getCachedWeeklyPlanning(weekStart: string): Promise<any | null> {
    const key = `${CACHE_KEYS.WEEKLY_PLANNING}_${weekStart}`;
    return this.getCachedData(key);
  }

  // Profile
  async cacheProfile(profile: any): Promise<void> {
    await this.cacheData(CACHE_KEYS.PROFILE, profile);
  }

  async getCachedProfile(): Promise<any | null> {
    return this.getCachedData(CACHE_KEYS.PROFILE);
  }

  // Streaks
  async cacheStreaks(streaks: any): Promise<void> {
    await this.cacheData(CACHE_KEYS.STREAKS, streaks);
  }

  async getCachedStreaks(): Promise<any | null> {
    return this.getCachedData(CACHE_KEYS.STREAKS);
  }

  // Update last sync time
  async updateLastSync(): Promise<void> {
    await set(CACHE_KEYS.LAST_SYNC, Date.now());
  }

  async getLastSync(): Promise<number | null> {
    return get(CACHE_KEYS.LAST_SYNC);
  }

  // Clear all cached data
  async clearAll(): Promise<void> {
    const allKeys = await keys();
    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith('offline_')) {
        await del(key);
      }
    }
  }
}

export const offlineDataService = new OfflineDataService();
