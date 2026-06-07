# Health Metrics Module

A new optional module for tracking body metrics, lab results, and supplements — plotted alongside training load and mood so you can see how the inputs and outputs of your routine move together.

## Scope

- New module `health_metrics` in the registry, gated install via the Modules store.
- New `/health` page with three tabs:
  1. **Body** — weight, body fat %, lean mass, waist, resting HR (charts + entry).
  2. **Labs** — periodic blood-panel rows (HDL, LDL, hsCRP, ferritin, vitamin D, A1c, etc.) shown as a sortable timeline of panels.
  3. **Supplements** — current supplement stack with daily adherence checkboxes (similar to habits but lighter-weight).
- A combined **"Overlay"** view on the Body tab that lets you toggle training load (weekly km / TSS-like estimate from `synced_activities`) and average mood/energy (from `daily_check_ins`) on top of the weight or body-fat trend.

## Data model

Four new tables, all RLS-locked to `auth.uid()`:

- `body_measurements` — measured_on (date), weight_kg, body_fat_pct, lean_mass_kg, waist_cm, resting_hr, notes, source (manual / garmin / withings).
- `lab_results` — taken_on (date), panel_name, lab_provider, notes; with a child `lab_result_values` (marker_key, marker_label, value_numeric, unit, reference_low, reference_high, flag).
- `supplements` — name, dose, unit, schedule (daily/weekdays/custom JSON), started_on, archived_at, notes.
- `supplement_logs` — supplement_id, taken_on (date), taken (bool), notes.

All four get `created_at`/`updated_at`, update trigger, GRANTs to `authenticated` + `service_role`, and per-user RLS.

For weight import down the road we'll reuse the Garmin pipeline (out of scope for v1 — manual entry only).

## UI

- `/health` route gated by `RequireModule id="health_metrics"`.
- Mobile-first stacked layout, capsule tabs matching existing app style.
- Body tab:
  - Big "Add measurement" button → sheet with weight/body-fat/lean-mass/waist/RHR/notes.
  - Recharts line chart (weight by default; metric selector pill row).
  - Overlay toggles: Training load (right Y axis, weekly km) and Mood (right Y axis, 1-5).
  - Trailing stats: 7-day avg, 30-day avg, vs 30 days ago delta.
- Labs tab:
  - "Add panel" button → sheet to create a panel + add marker rows inline.
  - Timeline list of panels (most recent first), each expandable to show all markers with green/red badge if outside reference range.
  - Click a marker name → mini sparkline of that marker across all panels.
- Supplements tab:
  - List of active supplements with today's check box.
  - "Add supplement" sheet.
  - 14-day adherence grid per supplement (dot for each day).

## Module registry entry

```ts
{
  id: "health_metrics",
  name: "Health Metrics",
  tagline: "Weight, body comp, labs, and supplements — overlaid with training and mood.",
  coverEmoji: "🩺",
  category: "health",
  tier: "free",
  status: "available",
  surfaces: {
    pages: ["Dedicated Health page (/health)"],
    mcpToolPrefixes: ["health_", "lab_", "supplement_"],
  },
  dataTables: ["body_measurements", "lab_results", "lab_result_values", "supplements", "supplement_logs"],
}
```

## Files

- New: `src/pages/Health.tsx`, `src/components/health/BodyTab.tsx`, `BodyMeasurementChart.tsx`, `AddBodyMeasurementSheet.tsx`, `LabsTab.tsx`, `AddLabPanelSheet.tsx`, `LabMarkerSparkline.tsx`, `SupplementsTab.tsx`, `AddSupplementSheet.tsx`.
- New hooks: `useBodyMeasurements.ts`, `useLabPanels.ts`, `useSupplements.ts`, `useTrainingLoadByWeek.ts` (reads `synced_activities`), `useMoodByDay.ts` (reads `daily_check_ins`).
- Edit: `src/modules/registry.ts` + `src/modules/types.ts` (add module id), `src/App.tsx` (route + RequireModule), `src/components/layout/NavigationMenu.tsx` (nav item gated).

## Backfill

No backfill — module starts opt-in; users install from `/modules` when they want it. No existing tables to detect against.

## Out of scope (future)

- Withings / Apple Health weight import.
- Photo-based progress tracking.
- AI commentary on lab trends.
- Reminders for supplement logging (will reuse notifications later).
