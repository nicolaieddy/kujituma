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

// Shared alias buckets so a search like "leg" or "lower body" surfaces every
// relevant part. Each part below pulls from these and adds its own specifics.
const LEG_SYNONYMS = [
  "leg", "legs", "lower body", "lower limb", "lower limbs", "lower leg",
  "lower legs", "lower extremity", "lower extremities",
];
const BACK_SYNONYMS = ["back", "spine", "spinal", "backache", "back pain"];
const UPPER_BODY_SYNONYMS = [
  "upper body", "upper limb", "upper limbs", "torso", "trunk", "core",
];
const HEAD_SYNONYMS = ["head", "skull", "face", "facial"];

// Broader, runner-friendly, non-medical taxonomy.
// Aliases include common misspellings, plurals, slang, and broader region words
// so searching "leg", "lowerleg", "achilis", "kneecap", etc. all find a match.
export const BODY_PARTS: BodyPartDef[] = [
  {
    key: "foot",
    label: "Foot",
    region: "Leg",
    aliases: [
      ...LEG_SYNONYMS,
      "foot", "feet", "toe", "toes", "big toe", "arch", "arches", "heel", "heels",
      "plantar", "plantar fascia", "plantar fasciitis", "fascitis", "fasciitis",
      "metatarsal", "metatarsals", "ball of foot", "forefoot", "midfoot",
      "sole", "instep", "bunion", "bunions", "blister", "blisters", "nail",
      "toenail", "black toenail",
    ],
  },
  {
    key: "ankle",
    label: "Ankle",
    region: "Leg",
    aliases: [
      ...LEG_SYNONYMS,
      "ankle", "ankles", "achilles", "achillies", "achilis", "achiles",
      "tendon", "achilles tendon", "achilles tendinitis", "tendonitis",
      "tendinopathy", "sprain", "sprained ankle", "rolled ankle",
    ],
  },
  {
    key: "calf_shin",
    label: "Calf / Shin",
    region: "Leg",
    aliases: [
      ...LEG_SYNONYMS,
      "calf", "calves", "calfs", "shin", "shins", "shin splint", "shin splints",
      "splints", "soleus", "gastroc", "gastrocnemius", "tibia", "tibial",
      "lower leg", "back of lower leg", "front of lower leg",
      "compartment syndrome", "stress fracture",
    ],
  },
  {
    key: "knee",
    label: "Knee",
    region: "Leg",
    aliases: [
      ...LEG_SYNONYMS,
      "knee", "knees", "kneecap", "knee cap", "patella", "patellar",
      "patellar tendon", "patella tendon", "runners knee", "runner's knee",
      "itb", "it band", "iliotibial", "iliotibial band", "meniscus",
      "mcl", "lcl", "acl", "pcl", "ligament", "chondromalacia",
    ],
  },
  {
    key: "hamstring",
    label: "Hamstring",
    region: "Leg",
    aliases: [
      ...LEG_SYNONYMS,
      "hamstring", "hamstrings", "hammy", "hammies", "ham string",
      "back of leg", "back of thigh", "back thigh", "biceps femoris",
      "high hamstring", "hamstring tendinopathy",
    ],
  },
  {
    key: "quad",
    label: "Quad",
    region: "Leg",
    aliases: [
      ...LEG_SYNONYMS,
      "quad", "quads", "quadriceps", "quadricep", "thigh", "thighs",
      "front of leg", "front of thigh", "front thigh", "vmo", "rectus femoris",
    ],
  },
  {
    key: "groin",
    label: "Groin",
    region: "Leg",
    aliases: [
      ...LEG_SYNONYMS,
      "groin", "groan", "adductor", "adductors", "inner thigh", "inner thighs",
      "pubic", "pubis", "osteitis pubis", "hip",
    ],
  },
  {
    key: "hip_glute",
    label: "Hip / Glute",
    region: "Leg",
    aliases: [
      ...LEG_SYNONYMS,
      "hip", "hips", "hip flexor", "hip flexors", "flexor", "psoas",
      "glute", "glutes", "gluteal", "gluteus", "butt", "buttock", "buttocks",
      "bum", "piriformis", "bursitis", "labrum", "labral",
    ],
  },
  {
    key: "lower_back",
    label: "Lower back",
    region: "Back",
    aliases: [
      ...BACK_SYNONYMS,
      "lower back", "low back", "lumbar", "lumbar spine", "si joint", "si",
      "sacroiliac", "sciatica", "sciatic", "disc", "slipped disc", "herniated",
      "qL", "quadratus lumborum",
    ],
  },
  {
    key: "upper_body",
    label: "Upper body",
    region: "Upper body",
    aliases: [
      ...UPPER_BODY_SYNONYMS, ...BACK_SYNONYMS,
      "upper back", "mid back", "thoracic", "shoulder", "shoulders",
      "rotator cuff", "neck", "trap", "traps", "trapezius",
      "chest", "pec", "pecs", "pectoral", "rib", "ribs", "intercostal",
      "arm", "arms", "bicep", "biceps", "tricep", "triceps", "elbow", "elbows",
      "forearm", "forearms", "wrist", "wrists", "hand", "hands", "finger",
      "fingers", "thumb", "core", "ab", "abs", "abdominal", "abdominals",
      "oblique", "obliques",
    ],
  },
  {
    key: "head",
    label: "Head",
    region: "Head",
    aliases: [
      ...HEAD_SYNONYMS,
      "headache", "headaches", "migraine", "migraines", "concussion",
      "dizzy", "dizziness", "vertigo", "jaw", "tmj", "ear", "ears",
      "eye", "eyes", "sinus", "sinuses", "tooth", "teeth", "dental",
    ],
  },
  {
    key: "other",
    label: "Other",
    region: "Other",
    aliases: [
      "other", "general", "whole body", "systemic", "fatigue", "tired",
      "stomach", "tummy", "belly", "gut", "gi", "digestion", "nausea",
      "cramp", "cramps", "skin", "rash", "chafing", "chafe",
      "cold", "flu", "fever", "cough", "sore throat", "covid",
      "respiratory", "lung", "lungs", "asthma", "allergy", "allergies",
      "heart", "cardiac", "mental", "stress", "anxiety", "sleep",
    ],
  },
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
