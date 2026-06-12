// Standard race distance helpers: canonical keys, auto-detection from
// .fit distance, time parsing/formatting, and PB/silver/bronze ranking.

export type StandardRaceKey = "5k" | "10k" | "half_marathon" | "marathon";

export const STANDARD_DISTANCES: {
  key: StandardRaceKey;
  label: string;
  meters: number;
}[] = [
  { key: "5k", label: "5K", meters: 5000 },
  { key: "10k", label: "10K", meters: 10000 },
  { key: "half_marathon", label: "Half marathon", meters: 21097.5 },
  { key: "marathon", label: "Marathon", meters: 42195 },
];

export const RACE_DISTANCE_LABELS: Record<StandardRaceKey, string> = {
  "5k": "5K",
  "10k": "10K",
  half_marathon: "Half marathon",
  marathon: "Marathon",
};

export function isStandardRaceKey(v: string | null | undefined): v is StandardRaceKey {
  return v === "5k" || v === "10k" || v === "half_marathon" || v === "marathon";
}

/** Best-fit standard distance from meters (±3% tolerance). */
export function detectStandardDistance(meters: number | null | undefined): StandardRaceKey | null {
  if (!meters || meters <= 0) return null;
  let best: { key: StandardRaceKey; diff: number } | null = null;
  for (const s of STANDARD_DISTANCES) {
    const diff = Math.abs(meters - s.meters) / s.meters;
    if (diff <= 0.03 && (!best || diff < best.diff)) {
      best = { key: s.key, diff };
    }
  }
  return best?.key ?? null;
}

/** Parse "h:mm:ss", "mm:ss", "1h 23m 45s", or pure seconds. */
export function parseTimeToSeconds(input: string | null | undefined): number | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;
  // 1h 23m 45s style
  const human = s.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/i);
  if (human && (human[1] || human[2] || human[3])) {
    return (+(human[1] || 0)) * 3600 + (+(human[2] || 0)) * 60 + (+(human[3] || 0));
  }
  const parts = s.split(":").map((p) => p.trim());
  if (parts.every((p) => /^\d+(\.\d+)?$/.test(p))) {
    if (parts.length === 3) return +parts[0] * 3600 + +parts[1] * 60 + +parts[2];
    if (parts.length === 2) return +parts[0] * 60 + +parts[1];
    if (parts.length === 1) return +parts[0];
  }
  return null;
}

export function formatSecondsToTime(total: number | null | undefined): string {
  if (total == null || !isFinite(total) || total < 0) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.round(total % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export type Medal = "pb" | "silver" | "bronze";

export const MEDAL_META: Record<Medal, { label: string; emoji: string; className: string }> = {
  pb: { label: "PB", emoji: "🥇", className: "bg-amber-100 text-amber-900 border-amber-300" },
  silver: { label: "Silver", emoji: "🥈", className: "bg-slate-100 text-slate-800 border-slate-300" },
  bronze: { label: "Bronze", emoji: "🥉", className: "bg-orange-100 text-orange-900 border-orange-300" },
};

interface RaceLike {
  id: string;
  event_type: string;
  race_distance: string | null;
  official_time_seconds: number | null;
}

/**
 * Compute medal rankings (PB / silver / bronze) per standard distance.
 * Only considers race events with a standard race_distance key and a time.
 */
export function computeMedals<T extends RaceLike>(events: T[]): Record<string, Medal> {
  const byDist = new Map<StandardRaceKey, { id: string; t: number }[]>();
  for (const e of events) {
    if (e.event_type !== "race") continue;
    if (!isStandardRaceKey(e.race_distance)) continue;
    if (e.official_time_seconds == null || e.official_time_seconds <= 0) continue;
    const arr = byDist.get(e.race_distance) ?? [];
    arr.push({ id: e.id, t: e.official_time_seconds });
    byDist.set(e.race_distance, arr);
  }
  const medals: Record<string, Medal> = {};
  for (const arr of byDist.values()) {
    arr.sort((a, b) => a.t - b.t);
    if (arr[0]) medals[arr[0].id] = "pb";
    if (arr[1]) medals[arr[1].id] = "silver";
    if (arr[2]) medals[arr[2].id] = "bronze";
  }
  return medals;
}
