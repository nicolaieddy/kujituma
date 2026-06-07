import type { ModuleDefinition, ModuleId } from "./types";

/**
 * Single source of truth for optional modules.
 * Core features (Goals, Habits, Daily Check-in, Weekly Planning, Analytics, Profile)
 * are NOT modules — they're always available.
 */
export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    id: "training_plan",
    name: "Training Plan",
    tagline: "Plan workouts, sync activities from Strava, Garmin, and .FIT files.",
    description:
      "Build a weekly training schedule, auto-match completed workouts to planned sessions, and pull rich session data (HR, power, pace) from your devices. Includes per-activity reflections and goal-linked training metrics.",
    coverEmoji: "🏃",
    category: "fitness",
    tier: "free",
    status: "available",
    surfaces: {
      pages: ["/training"],
      navItems: ["Training"],
      profileSections: ["Workouts preferences tab", "Strava / Garmin / .FIT integrations"],
      integrations: ["Strava", "Garmin", ".FIT files"],
      mcpToolPrefixes: ["training_", "workout_", "activity_"],
    },
    dataTables: [
      "training_plan_workouts",
      "training_workout_activities",
      "training_workout_goals",
      "synced_activities",
      "activity_laps",
      "activity_streams",
      "activity_mappings",
      "strava_connections",
      "garmin_connections",
      "workout_preferences",
    ],
  },
  {
    id: "sleep",
    name: "Sleep",
    tagline: "Track sleep score trends and build a bedtime consistency streak.",
    description:
      "A dedicated Sleep page with nightly score trends, duration averages, and a bedtime-consistency streak so you can see — at a glance — whether your evenings are working for you. Imports from Garmin sleep CSV today; Apple Health and Oura coming later.",
    coverEmoji: "😴",
    category: "health",
    tier: "free",
    status: "available",
    surfaces: {
      pages: ["Dedicated Sleep page (/sleep)"],
      thisWeekCards: ["Nightly sleep summary inside the Training Plan card"],
      profileSections: ["Sleep import (Garmin CSV)"],
      mcpToolPrefixes: ["sleep_"],
    },
    dataTables: ["sleep_entries"],
  },
  {
    id: "health_metrics",
    name: "Health Metrics",
    tagline: "Weight, body comp, labs, and supplements — overlaid with training and mood.",
    description:
      "Log body measurements, blood-panel results, and your supplement stack. Overlay weekly training load (km from Strava/Garmin) and average daily mood onto your weight or body-fat trend to see how everything moves together.",
    coverEmoji: "🩺",
    category: "health",
    tier: "free",
    status: "available",
    surfaces: {
      pages: ["Dedicated Health page (/health)"],
      mcpToolPrefixes: ["health_", "lab_", "supplement_"],
    },
    dataTables: [
      "body_measurements",
      "lab_results",
      "lab_result_values",
      "supplements",
      "supplement_logs",
    ],
  },
];

export const getModule = (id: ModuleId): ModuleDefinition | undefined =>
  MODULE_REGISTRY.find((m) => m.id === id);
