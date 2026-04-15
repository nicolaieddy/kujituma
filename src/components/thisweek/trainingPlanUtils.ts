import type { TrainingPlanWorkout } from "@/hooks/useTrainingPlan";
import { parseLocalDate } from "@/utils/dateUtils";

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const DAY_OPTIONS = [
  { value: "0", label: "Monday" },
  { value: "1", label: "Tuesday" },
  { value: "2", label: "Wednesday" },
  { value: "3", label: "Thursday" },
  { value: "4", label: "Friday" },
  { value: "5", label: "Saturday" },
  { value: "6", label: "Sunday" },
];

export const WORKOUT_TYPES = ["Run", "Ride", "Swim", "Walk", "Hike", "Yoga", "WeightTraining", "Workout", "Rest"];

export type WorkoutStatus = "done" | "missed" | "upcoming";

export interface TrainingPlanDisplayWorkout extends TrainingPlanWorkout {
  sourceWorkoutId: string;
  isDerivedSession: boolean;
  sessionLabel?: string;
}

/** A merged session groups activities from different sources (Strava + .FIT) that represent the same physical effort */
export interface MergedSession {
  /** The activity used for primary display stats (prefer Strava for naming, .FIT for detailed data) */
  displayActivity: any;
  /** All activities in this session (e.g. one Strava + one .FIT) */
  activities: any[];
  /** Unique data sources in this session */
  sources: string[];
  /** Which activity ID to use for lap/chart data (prefer .FIT) */
  lapsActivityId: string | null;
}

/**
 * Merges activities that represent the same physical session.
 * A Strava sync and .FIT upload for the same workout produce two rows in synced_activities —
 * this function groups them so they display as a single session with multiple source badges.
 */
export function mergeActivitiesIntoSessions(activities: any[]): MergedSession[] {
  if (activities.length === 0) return [];

  // Sort by start_date
  const sorted = [...activities].sort((a, b) =>
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  const sessions: MergedSession[] = [];
  const used = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].id)) continue;

    const group = [sorted[i]];
    used.add(sorted[i].id);

    // Look for other activities that match this one (same physical session)
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(sorted[j].id)) continue;
      if (isSamePhysicalSession(sorted[i], sorted[j])) {
        group.push(sorted[j]);
        used.add(sorted[j].id);
      }
    }

    // Prefer .FIT for laps (richer data), Strava for display name/description
    const fitActivity = group.find(a => a.source === "fit_upload");
    const stravaActivity = group.find(a => a.source !== "fit_upload");
    // Use Strava as primary display if available (has name/description), else .FIT
    const displayActivity = stravaActivity || fitActivity || group[0];

    sessions.push({
      displayActivity,
      activities: group,
      sources: [...new Set(group.map(a => a.source))],
      lapsActivityId: fitActivity?.id || group[0]?.id || null,
    });
  }

  return sessions;
}

function isSamePhysicalSession(a: any, b: any): boolean {
  // Different sources is a strong signal (Strava + .FIT for same workout)
  if (a.source === b.source) return false;

  // Must be on the same date
  const dateA = a.activity_date || a.start_date?.split("T")[0];
  const dateB = b.activity_date || b.start_date?.split("T")[0];
  if (dateA !== dateB) return false;

  // Check duration similarity (within 25%)
  if (a.duration_seconds && b.duration_seconds) {
    const ratio = a.duration_seconds / b.duration_seconds;
    if (ratio < 0.75 || ratio > 1.33) return false;
  }

  // Check distance similarity (within 25%)
  if (a.distance_meters && b.distance_meters) {
    const ratio = a.distance_meters / b.distance_meters;
    if (ratio < 0.75 || ratio > 1.33) return false;
  }

  return true;
}

export function formatDistance(meters: number | null): string {
  if (!meters) return "";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatPace(secPerKm: number | null): string {
  if (!secPerKm) return "";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

export function getWorkoutStatus(workout: Pick<TrainingPlanWorkout, "week_start" | "day_of_week" | "workout_type">, matchedActivity: unknown): WorkoutStatus {
  // Rest days are always "done" — nothing to track
  if (workout.workout_type === "Rest") return "done";
  if (matchedActivity) return "done";

  const today = new Date();
  const workoutDate = parseLocalDate(workout.week_start);
  workoutDate.setDate(workoutDate.getDate() + workout.day_of_week);

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return workoutDate < startOfToday ? "missed" : "upcoming";
}

function splitPmSession(text: string | null | undefined) {
  if (!text) return null;

  const match = text.match(/\bPM\s*:/i);
  if (!match || match.index === undefined) return null;

  const before = text.slice(0, match.index).trim().replace(/[\s–—-]+$/, "").trim();
  const after = text.slice(match.index + match[0].length).trim();

  if (!after) return null;

  return {
    primary: before,
    secondary: after,
  };
}

function inferWorkoutTypeFromText(text: string, fallback: string) {
  const normalized = text.toLowerCase();

  if (/\b(rest|off|recovery day)\b/.test(normalized)) return "Rest";
  if (/\b(run|jog|tempo|fartlek|stride|interval|marathon|easy pace)\b/.test(normalized)) return "Run";
  if (/\b(ride|bike|cycle|cycling)\b/.test(normalized)) return "Ride";
  if (/\b(swim|pool|open water)\b/.test(normalized)) return "Swim";
  if (/\b(hike|trail walk)\b/.test(normalized)) return "Hike";
  if (/\b(walk)\b/.test(normalized)) return "Walk";
  if (/\b(yoga|mobility|stretch)\b/.test(normalized)) return "Yoga";
  if (/\b(gym|core|strength|lift|weights|stability)\b/.test(normalized)) return "Workout";

  return fallback || "Workout";
}

function buildPmTitle(sourceTitle: string, pmText: string) {
  const firstSentence = pmText
    .replace(/^[\s•\-–—]+/, "")
    .split(/(?<=[.!?])\s+/)[0]
    ?.trim()
    .replace(/[.!?]$/, "");

  if (!firstSentence) return `${sourceTitle} · PM`;

  const concise = firstSentence.length > 42 ? `${firstSentence.slice(0, 39).trim()}…` : firstSentence;
  return `PM · ${concise}`;
}

function splitWorkoutForDisplay(workout: TrainingPlanWorkout): TrainingPlanDisplayWorkout[] {
  const descriptionSplit = splitPmSession(workout.description);
  const notesSplit = descriptionSplit ? null : splitPmSession(workout.notes);
  const pmText = descriptionSplit?.secondary || notesSplit?.secondary;

  const primaryWorkout: TrainingPlanDisplayWorkout = {
    ...workout,
    description: descriptionSplit?.primary ?? workout.description,
    notes: notesSplit?.primary ?? workout.notes,
    sourceWorkoutId: workout.id,
    isDerivedSession: false,
  };

  if (!pmText) {
    return [primaryWorkout];
  }

  const pmWorkout: TrainingPlanDisplayWorkout = {
    ...workout,
    id: `${workout.id}__pm`,
    title: buildPmTitle(workout.title || workout.workout_type, pmText),
    description: pmText,
    notes: "",
    workout_type: inferWorkoutTypeFromText(pmText, workout.workout_type),
    target_distance_meters: null,
    target_duration_seconds: null,
    target_pace_per_km: null,
    matched_strava_activity_id: null,
    matched_activity_id: null,
    sourceWorkoutId: workout.id,
    isDerivedSession: true,
    sessionLabel: "PM",
  };

  return [primaryWorkout, pmWorkout];
}

export function getDisplayWorkouts(workouts: TrainingPlanWorkout[]): TrainingPlanDisplayWorkout[] {
  return workouts.flatMap(splitWorkoutForDisplay);
}
