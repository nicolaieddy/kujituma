import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BodyPartEntry, BodySide } from "@/lib/bodyParts";

interface Props {
  value: BodyPartEntry[];
  onChange: (next: BodyPartEntry[]) => void;
}

/**
 * Simple stylized humanoid SVG with clickable anatomical regions.
 * Front and back views toggle via the buttons above the figure.
 *
 * For paired regions (foot, ankle, calf, knee, quad, hamstring, hip/glute),
 * clicking the left half toggles the LEFT side, the right half toggles RIGHT.
 * Both can be active at once.
 *
 * For central regions (head, upper body, lower back, groin), a click toggles
 * the part with side="na" (or "both" for upper body).
 */

type View = "front" | "back";
type RegionKind = "paired" | "central";

interface Region {
  key: string;        // matches BODY_PART_BY_KEY key
  label: string;
  kind: RegionKind;
  view: View | "both";
  // SVG paths for left + right (paired) or single (central)
  left?: string;
  right?: string;
  shape?: string;
  centralSide?: BodySide; // for central regions (default "na")
}

// ViewBox: 200 wide x 460 tall. Centerline at x=100.
const REGIONS: Region[] = [
  // Head (both views)
  { key: "head", label: "Head", kind: "central", view: "both", centralSide: "na",
    shape: "M100,8 a32,32 0 1 1 -0.1,0 z" },

  // Upper body — front: chest + arms area
  { key: "upper_body", label: "Upper body", kind: "central", view: "front", centralSide: "both",
    // shoulders, chest, arms, abs as one shape
    shape: "M62,72 L138,72 L160,90 L168,200 L150,210 L130,200 L130,215 L70,215 L70,200 L50,210 L32,200 L40,90 Z" },

  // Upper body — back: shoulders + upper back
  { key: "upper_body", label: "Upper body (back)", kind: "central", view: "back", centralSide: "both",
    shape: "M62,72 L138,72 L160,90 L168,175 L150,180 L130,175 L70,175 L50,180 L32,175 L40,90 Z" },

  // Lower back (back only)
  { key: "lower_back", label: "Lower back", kind: "central", view: "back", centralSide: "na",
    shape: "M70,178 L130,178 L130,215 L70,215 Z" },

  // Groin (front only)
  { key: "groin", label: "Groin", kind: "central", view: "front", centralSide: "na",
    shape: "M82,210 L118,210 L110,232 L90,232 Z" },

  // Hip / Glute — front shows hips, back shows glutes (paired)
  { key: "hip_glute", label: "Hip / Glute", kind: "paired", view: "front",
    left:  "M70,213 L98,213 L96,238 L68,238 Z",
    right: "M102,213 L130,213 L132,238 L104,238 Z" },
  { key: "hip_glute", label: "Hip / Glute", kind: "paired", view: "back",
    left:  "M64,213 L98,213 L96,255 L62,255 Z",
    right: "M102,213 L136,213 L138,255 L104,255 Z" },

  // Quad (front only, paired)
  { key: "quad", label: "Quad", kind: "paired", view: "front",
    left:  "M68,240 L97,240 L94,318 L66,318 Z",
    right: "M103,240 L132,240 L134,318 L106,318 Z" },

  // Hamstring (back only, paired)
  { key: "hamstring", label: "Hamstring", kind: "paired", view: "back",
    left:  "M64,258 L97,258 L94,330 L64,330 Z",
    right: "M103,258 L136,258 L136,330 L106,330 Z" },

  // Knee (both views, paired)
  { key: "knee", label: "Knee", kind: "paired", view: "front",
    left:  "M67,320 L96,320 L95,345 L67,345 Z",
    right: "M104,320 L133,320 L133,345 L105,345 Z" },
  { key: "knee", label: "Knee", kind: "paired", view: "back",
    left:  "M64,332 L96,332 L96,355 L65,355 Z",
    right: "M104,332 L136,332 L135,355 L104,355 Z" },

  // Calf / Shin (both views, paired)
  { key: "calf_shin", label: "Calf / Shin", kind: "paired", view: "front",
    left:  "M70,347 L95,347 L93,415 L73,415 Z",
    right: "M105,347 L130,347 L127,415 L107,415 Z" },
  { key: "calf_shin", label: "Calf / Shin", kind: "paired", view: "back",
    left:  "M68,357 L95,357 L93,415 L72,415 Z",
    right: "M105,357 L132,357 L128,415 L107,415 Z" },

  // Ankle (both, paired)
  { key: "ankle", label: "Ankle", kind: "paired", view: "front",
    left:  "M74,417 L92,417 L91,432 L75,432 Z",
    right: "M108,417 L126,417 L125,432 L109,432 Z" },
  { key: "ankle", label: "Ankle", kind: "paired", view: "back",
    left:  "M73,417 L92,417 L91,432 L74,432 Z",
    right: "M108,417 L127,417 L126,432 L109,432 Z" },

  // Foot (both, paired)
  { key: "foot", label: "Foot", kind: "paired", view: "front",
    left:  "M70,434 L93,434 L93,452 L66,452 Z",
    right: "M107,434 L130,434 L134,452 L107,452 Z" },
  { key: "foot", label: "Foot", kind: "paired", view: "back",
    left:  "M70,434 L92,434 L92,448 L70,448 Z",
    right: "M108,434 L130,434 L130,448 L108,448 Z" },
];

// Outline of the humanoid silhouette (front + back share roughly the same shape)
const SILHOUETTE_FRONT =
  "M100,8 a32,32 0 1 1 -0.1,0 M68,72 L132,72 L155,86 L168,195 L155,210 L138,202 L132,215 L130,232 L132,318 L130,345 L130,415 L126,432 L132,452 L106,452 L104,432 L104,318 L100,238 L96,318 L96,432 L94,452 L68,452 L74,432 L70,415 L70,345 L68,318 L70,232 L68,215 L62,202 L45,210 L32,195 L45,86 Z";

export function BodyMap({ value, onChange }: Props) {
  const [view, setView] = useState<View>("front");

  const visible = REGIONS.filter((r) => r.view === view || r.view === "both");

  const findEntry = (key: string) => value.find((v) => v.part === key);

  const isPairedActive = (key: string, side: "left" | "right") => {
    const e = findEntry(key);
    if (!e) return false;
    return e.side === side || e.side === "both";
  };

  const togglePaired = (key: string, side: "left" | "right") => {
    const existing = findEntry(key);
    if (!existing) {
      onChange([...value, { part: key, side }]);
      return;
    }
    const cur = existing.side;
    let next: BodySide | null;
    if (cur === side) {
      next = null; // remove this side -> if was alone, remove entry
    } else if (cur === "both") {
      // remove just clicked side, keep the other
      next = side === "left" ? "right" : "left";
    } else if (cur === "left" || cur === "right") {
      // had the other side; now both
      next = "both";
    } else {
      // was "na"
      next = side;
    }
    if (next === null) {
      onChange(value.filter((v) => v.part !== key));
    } else {
      onChange(value.map((v) => (v.part === key ? { ...v, side: next! } : v)));
    }
  };

  const toggleCentral = (key: string, defaultSide: BodySide = "na") => {
    if (findEntry(key)) onChange(value.filter((v) => v.part !== key));
    else onChange([...value, { part: key, side: defaultSide }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-1 rounded-md border bg-muted/40 p-0.5 w-fit mx-auto">
        {(["front", "back"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "px-3 py-1 text-xs rounded-sm transition-colors capitalize",
              view === v ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <svg
          viewBox="0 0 200 460"
          className="w-full max-w-[220px] h-auto"
          aria-label={`Body map (${view} view)`}
        >
          {/* Silhouette */}
          <path
            d={SILHOUETTE_FRONT}
            fill="hsl(var(--muted))"
            stroke="hsl(var(--border))"
            strokeWidth="1.5"
            fillRule="evenodd"
          />

          {/* Clickable regions */}
          {visible.map((r, i) => {
            if (r.kind === "central") {
              const active = !!findEntry(r.key);
              return (
                <path
                  key={`${r.key}-${view}-${i}`}
                  d={r.shape}
                  onClick={() => toggleCentral(r.key, r.centralSide ?? "na")}
                  className={cn(
                    "cursor-pointer transition-colors",
                    active
                      ? "fill-primary/70 stroke-primary"
                      : "fill-transparent hover:fill-primary/15 stroke-transparent hover:stroke-primary/40",
                  )}
                  strokeWidth="1"
                >
                  <title>{r.label}</title>
                </path>
              );
            }
            // paired
            const leftActive = isPairedActive(r.key, "left");
            const rightActive = isPairedActive(r.key, "right");
            return (
              <g key={`${r.key}-${view}-${i}`}>
                <path
                  d={r.left}
                  onClick={() => togglePaired(r.key, "left")}
                  className={cn(
                    "cursor-pointer transition-colors",
                    leftActive
                      ? "fill-primary/70 stroke-primary"
                      : "fill-transparent hover:fill-primary/15 stroke-transparent hover:stroke-primary/40",
                  )}
                  strokeWidth="1"
                >
                  <title>{r.label} (right side — viewer's left)</title>
                </path>
                <path
                  d={r.right}
                  onClick={() => togglePaired(r.key, "right")}
                  className={cn(
                    "cursor-pointer transition-colors",
                    rightActive
                      ? "fill-primary/70 stroke-primary"
                      : "fill-transparent hover:fill-primary/15 stroke-transparent hover:stroke-primary/40",
                  )}
                  strokeWidth="1"
                >
                  <title>{r.label} (left side — viewer's right)</title>
                </path>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Tap a region to select. Tap left/right halves independently for paired
        parts. You're looking <strong>at</strong> the body — your left = their right.
      </p>
    </div>
  );
}
