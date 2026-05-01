# Polished empty states for Training, Goals & Analytics

Replace the three plain "No … yet" blocks with a reusable, on-brand empty-state component that pairs a light SVG illustration with a one-line headline, a short helper sentence, and a primary call-to-action button.

## What you'll see

**Training** (This Week → Training Plan, when no workouts):
- Illustration: minimalist running track / pulse-line motif
- Headline: "Plan your training week"
- Helper: "Add your first workout, or copy last week's plan to get rolling."
- CTAs: `Add first workout` (primary) · `Copy last week` (ghost)

**Goals** (Goals page, when user has none):
- Illustration: light flag-on-summit motif
- Headline: "Set your first goal"
- Helper: "Goals turn intentions into weekly objectives. Start with one that matters this quarter."
- CTA: `Create a goal` (primary, opens existing create dialog)

**Goals — filtered no-results** (existing search-empty block):
- Same component, search-icon variant, no CTA except `Clear filters`.

**Analytics** (two charts: Weekly Progress, Goals by Category, when empty):
- Illustration: gentle sparkline/bar wisps
- Headline: "Nothing to chart yet"
- Helper: "Add objectives and check them off — your trends will appear here within a week."
- CTA: `Go to This Week` (link to `/`)

## Design language

- **Light & minimal**: SVGs use only `currentColor` + one accent (`hsl(var(--primary))` at 60–80% opacity), thin 1.5px strokes, generous negative space, ~140×100px.
- **Container**: existing dashed-border card style (`rounded-2xl border border-dashed border-border bg-muted/20`), centered, ~py-10.
- **Typography**: Plus Jakarta semibold headline (text-base), muted helper text (text-sm), tight 2-line max.
- **Motion**: subtle `animate-fade-in` on mount; CTA gets `hover-scale` already in the design system.
- **Dark-mode safe**: all colors via tokens, no hex.

## Technical details

1. **New shared component** `src/components/ui/empty-state.tsx`
   - Props: `illustration: ReactNode`, `title: string`, `description: string`, `actions?: ReactNode`, `className?`.
   - Renders the dashed-card container + centered stack.

2. **New illustrations directory** `src/components/illustrations/`
   - `TrainingEmpty.tsx`, `GoalsEmpty.tsx`, `AnalyticsEmpty.tsx` — pure inline SVG components (no external assets, no network).
   - Each accepts `className` so size/color can be overridden.

3. **Wire-ups** (replace existing blocks only — no behavior change):
   - `src/components/thisweek/TrainingPlanCard.tsx` lines ~237–252
   - `src/components/goals/OrganizedGoalsView.tsx` lines ~290–296 (filtered) and ~554–560 (no goals) — reuse existing "create goal" handler already in scope; if not in scope, add a prop or trigger the existing top-bar `New goal` button via a callback already available on the page.
   - `src/components/analytics/AnalyticsDashboard.tsx` lines ~186–190 and ~241–245.

4. **No new dependencies, no DB changes, no edge functions.** Pure presentational refactor.

## Out of scope

- No animated Lottie files (keeps bundle light, matches "minimal" brief).
- No copy changes elsewhere on these pages.
- No changes to the populated states.
