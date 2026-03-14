

# Plan: Emotional Vocabulary Expansion for Daily Check-in

## What changes

### 1. Add emotion tags UI after mood picker (`DailyCheckInDialog.tsx`)
- Define an `EMOTION_TAGS` map keyed by mood range:
  - Mood 1-2: anxious, frustrated, lonely, overwhelmed, hurt, disappointed
  - Mood 3: restless, uncertain, contemplative, neutral, mixed
  - Mood 4-5: grateful, energized, proud, hopeful, connected, peaceful
- Add state: `const [emotionTags, setEmotionTags] = useState<string[]>([])`
- After the mood picker buttons, render a collapsible grid of emotion word badges. Tapping toggles selection (multi-select). Selected tags get a filled/highlighted style.
- Reset emotion tags when mood changes to a different range bracket (1-2 vs 3 vs 4-5)
- Include emotion tags in draft save/restore logic
- On submit, store emotion tags in the existing `custom_answers` JSONB field under a reserved key `_emotion_tags` (array of strings). No DB migration needed.
- Populate from `todayCheckIn.custom_answers._emotion_tags` when editing an existing check-in

### 2. Display emotion tags in check-in history (`CheckInDetailModal.tsx`)
- Read `_emotion_tags` from the check-in's `custom_answers` field
- Show selected tags as colored badges below the mood/energy section

### 3. Display emotion tags in rituals history (`DailyCheckInsTab.tsx`)
- Show emotion tag badges in the check-in list rows and detail view

### 4. Update `CreateDailyCheckIn` type (`types/habits.ts`)
- No changes needed — `custom_answers` is already `Record<string, string>`. We'll store `_emotion_tags` as a JSON-stringified array in that field, or use the JSONB flexibility directly since the DB column is `jsonb`.

### Files modified
- `src/components/habits/DailyCheckInDialog.tsx` — emotion tag picker UI, state, draft logic, submit
- `src/components/rituals/CheckInDetailModal.tsx` — display emotion tags
- `src/components/rituals/DailyCheckInsTab.tsx` — show tags in list view

### Technical notes
- Storage: `custom_answers._emotion_tags = ["grateful", "energized"]` — stored in existing JSONB column, no migration
- The emotion tag grid appears only after a mood is selected, with smooth animation
- Multi-select: users can pick as many tags as they want from the contextual set

