

# Plan: Add Relationship Intentions to Weekly Planning

## Challenge
The `weekly_planning_sessions` DB table only has `last_week_reflection` and `week_intention` text columns — no columns for relationship data. Adding new columns requires a migration.

## Approach
Store relationship intentions in the existing `week_intention` field would be messy. Instead, add two new columns to the database table and update all layers.

### 1. Database migration
Add two nullable text columns to `weekly_planning_sessions`:
- `relationship_investment` — "Which relationship will you invest in this week?"
- `honest_conversation` — "What honest conversation are you avoiding?"

### 2. Update types (`src/types/habits.ts`)
Add `relationship_investment?: string` and `honest_conversation?: string` to both `WeeklyPlanningSession` and `CreateWeeklyPlanningSession` interfaces.

### 3. Update Supabase types (`src/integrations/supabase/types.ts`)
Add the two new fields to the `weekly_planning_sessions` Row/Insert/Update types.

### 4. Update dialog (`src/components/habits/WeeklyPlanningDialog.tsx`)
- Add two new state variables: `relationshipInvestment` and `honestConversation`
- Add a new "Relationships" section after the Week Intention section with a `Heart` icon header, subtitle referencing the Connect framework, and two textareas
- Populate from `planningSession` on load
- Include both fields in the `savePlanningSession` call
- Add a relationship tip to the Planning Tips section

### 5. Update detail modal (`src/components/rituals/WeeklySessionDetailModal.tsx`)
- Add `relationship_investment` and `honest_conversation` to the `WeeklySession` interface
- Display them with Heart/MessageCircle icons below the week intention section

### 6. Update planning tab (`src/components/rituals/WeeklyPlanningTab.tsx`)
- Display relationship fields in the current week card and past session list items

### Files changed
- New migration SQL (via Supabase)
- `src/types/habits.ts`
- `src/integrations/supabase/types.ts`
- `src/components/habits/WeeklyPlanningDialog.tsx`
- `src/components/rituals/WeeklySessionDetailModal.tsx`
- `src/components/rituals/WeeklyPlanningTab.tsx`

