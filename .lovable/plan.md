
## Personal Values + Goal Alignment

Add a first-class **Values** concept that lives on the profile, links to goals, and produces an "alignment score" per goal — auto-suggested from goal title/description by AI, then manually editable.

Built on your philosophy: *goals that get done are the ones deeply tied to your values*. So values aren't decorative — they're surfaced at creation, on every card, and in analytics.

---

### 1. Data model

**`user_values`** (new table)
- `label` (short, e.g. "Integrity")
- `statement` (the "I feel… when…" line)
- `feeling` (optional emotion word: "At ease", "Proud" — extracted from the statement; nice-to-have, not required)
- `visibility` ∈ `private` | `public` (default `private`, per-value)
- `order_index`, `is_archived`

**`goal_value_links`** (new join table)
- `goal_id`, `value_id`
- `weight` smallint 1–5 (how strongly this goal serves this value)
- `source` ∈ `ai` | `user` (so we can show "AI suggested" vs "you set")
- `ai_confidence` numeric 0–1 (when AI-generated)
- unique (goal_id, value_id)

Both tables: RLS scoped to `user_id`. `user_values` gets a public-read policy gated by `visibility = 'public'` so other users can see only the ones the owner opened up.

### 2. Values score per goal

`values_score = round( (sum(weight) / (5 × number_of_user_values)) × 100 )` — a 0–100% number.

Why this formula: rewards both **breadth** (touching multiple values) and **depth** (high weight). A goal tagged to 1 value at weight 5 with 9 total values = 11%. A goal tagged to 4 values at avg weight 4 = 36%. Tunable; we can also show a simpler "★ 4.2 avg weight" if % feels noisy.

Computed in a SQL view `goal_values_alignment` so cards/analytics read it cheaply.

### 3. AI auto-suggestion

New edge function `suggest-goal-values`:
- Input: `goal_id` (reads title + description) + user's active values
- Calls Lovable AI Gateway (google/gemini-2.5-flash) with a strict JSON schema: `[{value_id, weight 1-5, reason}]`
- Writes results to `goal_value_links` with `source='ai'`

Trigger points:
- **Goal create**: after save, fire-and-forget call; results appear within ~2s with a subtle "AI suggested" badge.
- **Goal edit** (title/description changed): re-suggest only for links still marked `source='ai'`; user-edited links are preserved.
- **Manual "Re-suggest" button** in the values editor inside the goal detail modal.

### 4. UI surfaces

**Profile → new "Values" section** (above or beside Goals)
- List of values as cards: label (bold), statement (muted), eye-icon visibility toggle per value
- "Add value" → form with label + statement; bulk "Import from text" to paste your screenshot list and auto-split lines
- Reorder via drag handle
- Public profile (`ProfilePublicView`) shows only values where `visibility='public'`; section hidden entirely if none are public

**Goal form (create + edit)** — nudge
- After title/description are filled, show "Which values does this serve?" with the user's values as chips. Each chip has a weight stepper (1–5). If user skips, AI fills it in after save.
- If user has **zero values defined**, show a one-time inline prompt: "Define your values first — goals tied to values get done." with a link to Profile → Values.

**Goal card** (`GoalCard.tsx`)
- Small pill: ★ icon + `{score}%` with tooltip listing top 3 linked values. Color shifts: <30% muted, 30–60% accent, 60%+ primary.

**Goal detail modal**
- New "Values alignment" section: progress bar with the score, list of linked values with weight sliders, AI-suggested ones flagged with a sparkle icon and "Accept / Edit / Remove" actions. "Re-suggest with AI" button.

**Analytics dashboard** (`AnalyticsDashboard.tsx`)
- New "Values alignment" card:
  - Radar chart: one axis per value, plotted by sum of weights across active goals → shows which values you actually invest in vs neglect.
  - "Average values score across active goals" headline number with 30-day trend.
  - "Lowest-alignment active goals" list — gentle nudge to either re-tag or reconsider keeping them.

**Goal creation nudge already covered above.**

### 5. MCP exposure

Add read tools to `mcp-server`:
- `list_values` — returns user's values (label + statement)
- `get_goal_values_alignment` — returns score + linked values for a given goal

Useful when you ask an AI assistant "why isn't this goal moving?" — it can see the alignment.

Per project memory rule, also update `src/components/profile/McpSection.tsx` tools list.

### 6. Cache invalidation

Mutations on values or goal-value links invalidate: `['values']`, `['goals']`, `['goalsAlignment']`, `['analytics']`, `['weeklyDashboard']`, and the affected `['goal', id]`.

---

### Out of scope (call out for your sign-off)

- **No** values score in the weekly "This Week" view yet — you didn't pick it. Can add later as a weekly "values coverage" stat.
- **No** AI auto-extraction of "feeling" word from statements — left as optional manual field; we can add a one-shot parser if you want.
- **No** historical trend on individual values yet — the trend line is on the aggregate score only.

### Technical notes

- AI call uses the existing Lovable AI Gateway integration (no new key).
- `goal_values_alignment` view: `LEFT JOIN` so goals with zero links show `score=0`.
- Auto-suggest debounced 1s on goal edit to avoid burning credits while typing.
- Per-value `visibility` enum chosen over a profile-level toggle so you can keep "Shameful when…" private but make "At peace when I am one with nature" public.
- Migration order: create tables + GRANTs + RLS + policies, then view, then edge function deploys automatically.
