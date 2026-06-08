/**
 * Centralized TanStack Query key factory.
 *
 * Why: Before this file, query keys were stringly-typed and spelled
 * inconsistently across hooks (e.g. `"synced_activities"` vs
 * `"synced-activities"`), causing silent cache-miss bugs and making
 * cross-hook invalidations hard to audit.
 *
 * Rules:
 *  - Always use this factory for `queryKey` and `invalidateQueries` keys.
 *  - Each domain is a sub-object. Functions return `as const` tuples
 *    so TanStack can match by prefix.
 *  - Invalidate the *most specific* key you can. Use the bare list
 *    (e.g. `qk.training.plan()`) only when you genuinely want to
 *    blow away every variant.
 */

export const qk = {
  // ---- Goals ----------------------------------------------------------
  goals: {
    all: (userId?: string) => ["goals", userId] as const,
    objectiveCounts: (userId?: string) =>
      ["goal-objective-counts", userId] as const,
    commentCounts: (goalIds: string[]) =>
      ["goal-comment-counts", goalIds.join(",")] as const,
  },

  // ---- Weekly planning / objectives ----------------------------------
  weekly: {
    objectives: (userId?: string, weekStart?: string) =>
      ["weekly-objectives", userId, weekStart] as const,
    allObjectives: (userId?: string) =>
      ["all-weekly-objectives", userId] as const,
    dashboard: (userId?: string, weekStart?: string) =>
      ["weekly-dashboard", userId, weekStart] as const,
    planning: (userId?: string, weekStart?: string) =>
      ["weekly-planning", userId, weekStart] as const,
    progress: (weekStart?: string) =>
      ["weekly-progress-post", weekStart] as const,
    insights: (userId?: string) => ["weekly-insights", userId] as const,
  },

  // ---- Training ------------------------------------------------------
  training: {
    plan: () => ["training-plan"] as const,
    matchedActivities: () => ["training-matched-activities"] as const,
    workoutActivities: () => ["training-workout-activities"] as const,
    syncedActivities: () => ["synced-activities"] as const,
    activityLaps: (activityId?: string) =>
      ["activity-laps", activityId] as const,
    activityReflectionsWeek: () =>
      ["activity-reflections-week"] as const,
    sleepEntries: () => ["sleep-entries"] as const,
    workoutPreferences: (userId?: string) =>
      ["workout-preferences", userId] as const,
  },

  // ---- Daily check-ins / habits --------------------------------------
  checkIns: {
    all: (userId?: string, limit?: number) =>
      ["all-daily-check-ins", userId, limit] as const,
  },
  habits: {
    statsOptimized: (userId?: string) =>
      ["habit-stats-optimized", userId] as const,
  },

  // ---- Profile / values ----------------------------------------------
  profile: {
    page: (profileUserId?: string) =>
      ["profile-page-data", profileUserId] as const,
    categoryFocus: (userId?: string) =>
      ["category-focus", userId] as const,
  },

  // ---- Accountability ------------------------------------------------
  accountability: {
    data: (userId?: string) => ["accountability-data", userId] as const,
    partnershipUnread: (partnershipId?: string, userId?: string) =>
      ["partnership-unread", partnershipId, userId] as const,
    allPartnershipsUnread: (stableKey?: string, userId?: string) =>
      ["all-partnerships-unread", stableKey, userId] as const,
  },
} as const;

/**
 * Convenience: every training-domain key in one array, for hooks that
 * legitimately need to nuke the whole cluster after a bulk activity
 * upload or reflection edit.
 */
export const trainingClusterKeys = [
  qk.training.syncedActivities(),
  qk.training.plan(),
  qk.training.matchedActivities(),
  qk.training.workoutActivities(),
  qk.training.activityReflectionsWeek(),
] as const;
