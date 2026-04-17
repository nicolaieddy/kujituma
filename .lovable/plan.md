
## Per-Workout Reflection Field

Add a persistent free-text "reflection" field to each synced activity, exposed via UI, MCP tools, and rolled up in weekly planning.

### 1. Database (migration)

Add to `synced_activities`:
- `reflection text` (nullable)
- `reflection_updated_at timestamptz` (auto-updated via trigger when `reflection` changes)

`created_at` already exists on the table, so we reuse it.

### 2. Hook: `useActivityReflection.ts` (new)

Small hook with TanStack Query:
- `useQuery` keyed by activity id (optional — value comes from parent activity already)
- `useMutation` to upsert: `update synced_activities set reflection = ... where id = ...`
- Invalidates `["synced-activities"]` and `["training-plan"]` queries on success

### 3. UI — Activity reflection section

**New component**: `src/components/training/ActivityReflection.tsx`
- Inline display in collapsed/expanded card
- View mode: italic muted text + Copy button (clipboard) + Edit pencil
- Empty state: "Add reflection" placeholder button
- Edit mode: `Textarea` with placeholder describing the 3 prompts (plan vs actual / pattern callout / structural implication), Save / Cancel
- Copy uses `navigator.clipboard.writeText` + toast confirmation (so you can paste to WhatsApp)

**Integration points** (`TrainingWorkoutCard.tsx`):
- Inside collapsed row: one-line truncated italic preview when reflection present
- Inside `ExpandedDetail` per session: full `ActivityReflection` component
- For merged Strava+.FIT sessions, reflection is stored on the **display activity** (Strava-preferred) so it survives source merging

### 4. MCP tools

Add to `supabase/functions/mcp-server/read-tools.ts`:
```
get_activity_reflection(activity_id) → returns { activity_id, reflection, updated_at }
  - resolves activity_id via dual lookup (UUID or strava_activity_id) per existing pattern
```

Add to `supabase/functions/mcp-server/write-tools.ts`:
```
set_activity_reflection(activity_id, reflection) → upsert reflection text
  - uses same dual lookup
  - returns confirmation with truncated preview
```

### 5. Weekly planning roll-up

Modify `WeeklyPlanningDialog.tsx`:
- New read-only section "Run reflections this week" above the Last Week Reflection textarea
- Query `synced_activities` for the planning week range where `reflection is not null`
- Render as bullet list: `• [activity_name, date] — reflection`
- Visible only when at least one reflection exists for the week

### 6. Memory

Update `mem://features/training/` with a new entry:
- `mem://features/training/per-activity-reflection` — describes the field, where it lives (synced_activities), MCP tools, and weekly roll-up behavior
- Update `mem://index.md` to reference it

### Files touched

**New**:
- `src/components/training/ActivityReflection.tsx`
- `src/hooks/useActivityReflection.ts`
- `supabase/migrations/<new>.sql`
- `mem://features/training/per-activity-reflection`

**Edited**:
- `src/components/thisweek/TrainingWorkoutCard.tsx` (inline preview + expanded section)
- `src/components/habits/WeeklyPlanningDialog.tsx` (week roll-up)
- `supabase/functions/mcp-server/read-tools.ts` (+ register in `index.ts` if needed)
- `supabase/functions/mcp-server/write-tools.ts`
- `src/hooks/useSyncedActivities.ts` (include `reflection` in select)
- `mem://index.md`

### Notes
- Plain text storage (no markdown), preserves newlines via `whitespace-pre-wrap`
- RLS: existing `synced_activities` policies (user-scoped) cover the new column; no policy changes needed
- No CHECK constraint; the trigger only updates `reflection_updated_at`
