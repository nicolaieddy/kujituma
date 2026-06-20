export type BodySide = "left" | "right" | "both" | "na";

export interface BodyPartEntry {
  part: string;       // canonical key (e.g. "calf_shin")
  side: BodySide;
  specific?: string;  // optional free-text refinement (e.g. "medial gastroc")
}

export interface BodyPartDef {
  key: string;
  label: string;
  region: "Leg" | "Back" | "Upper body" | "Head" | "Other";
  aliases: string[]; // extra words that should match in search
}

// Broader, runner-friendly, non-medical taxonomy.
export const BODY_PARTS: BodyPartDef[] = [
  { key: "foot",        label: "Foot",         region: "Leg",        aliases: ["toe", "toes", "arch", "heel", "plantar", "metatarsal", "leg"] },
  { key: "ankle",       label: "Ankle",        region: "Leg",        aliases: ["achilles", "leg"] },
  { key: "calf_shin",   label: "Calf / Shin",  region: "Leg",        aliases: ["calf", "shin", "soleus", "gastroc", "tibia", "shin splint", "leg"] },
  { key: "knee",        label: "Knee",         region: "Leg",        aliases: ["patella", "itb", "meniscus", "kneecap", "leg"] },
  { key: "hamstring",   label: "Hamstring",    region: "Leg",        aliases: ["hammy", "back of leg", "leg"] },
  { key: "quad",        label: "Quad",         region: "Leg",        aliases: ["quadriceps", "thigh", "front of leg", "leg"] },
  { key: "groin",       label: "Groin",        region: "Leg",        aliases: ["adductor", "inner thigh", "leg", "hip"] },
  { key: "hip_glute",   label: "Hip / Glute",  region: "Leg",        aliases: ["hip", "glute", "butt", "piriformis", "leg"] },
  { key: "lower_back",  label: "Lower back",   region: "Back",       aliases: ["lumbar", "back", "si joint", "sciatica"] },
  { key: "upper_body",  label: "Upper body",   region: "Upper body", aliases: ["shoulder", "chest", "arm", "neck", "elbow", "wrist", "rib"] },
  { key: "head",        label: "Head",         region: "Head",       aliases: ["headache", "concussion", "jaw", "ear", "face"] },
  { key: "other",       label: "Other",        region: "Other",      aliases: ["stomach", "gut", "skin", "general"] },
];

export const BODY_PART_BY_KEY: Record<string, BodyPartDef> = BODY_PARTS.reduce(
  (acc, p) => ({ ...acc, [p.key]: p }),
  {},
);

export const SIDE_LABEL: Record<BodySide, string> = {
  left: "L",
  right: "R",
  both: "Both",
  na: "—",
};

export function formatBodyParts(parts: BodyPartEntry[] | null | undefined): string {
  if (!parts || parts.length === 0) return "";
  return parts
    .map((p) => {
      const def = BODY_PART_BY_KEY[p.part];
      const label = def?.label ?? p.part;
      const sideTxt = p.side === "left" ? "L" : p.side === "right" ? "R" : p.side === "both" ? "L+R" : "";
      const main = sideTxt ? `${sideTxt} ${label}` : label;
      return p.specific ? `${main} (${p.specific})` : main;
    })
    .join(", ");
}

// Severity labels (still stored 1..5 for backward compat & sortability).
export const SEVERITY_LABELS: Record<number, { short: string; help: string }> = {
  1: { short: "None / minimal", help: "Aware of it but no impact on training." },
  2: { short: "Niggle",          help: "Mild — training as planned, monitoring it." },
  3: { short: "Manageable",      help: "Modifying some workouts but still training." },
  4: { short: "Limiting",        help: "Skipping or heavily modifying sessions." },
  5: { short: "Stopping training", help: "Cannot train at all." },
};

export type IssueCategory = "niggle" | "injury" | "illness";

export const ISSUE_CATEGORY_META: Record<IssueCategory, { label: string; description: string }> = {
  niggle:  { label: "Niggle",  description: "Minor — training through" },
  injury:  { label: "Injury",  description: "Significant — modifies or stops training" },
  illness: { label: "Illness", description: "Sick — affecting training" },
};
