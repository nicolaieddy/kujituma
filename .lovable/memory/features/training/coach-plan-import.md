---
name: Coach Plan Import
description: AI-parse pasted text / screenshots / PDFs of coach training plans into structured weekly workouts, with original source preserved and viewable
type: feature
---
Users can import a week's worth of workouts from a coach by pasting text, uploading a screenshot, or uploading a document. Files go to the private `coach-plans` storage bucket (per-user folder). The `parse-coach-plan` Supabase Edge Function calls the Lovable AI Gateway (`google/gemini-2.5-flash`, vision-capable) and returns a strict JSON schema of workouts which are inserted into `training_plan_workouts` with `source_import_id` linking back to a row in `training_plan_imports` (stores original text, file path, mime, parsed_summary).

Workouts created from an import show a small "Source" chip in `TrainingWorkoutCard`. Clicking opens `CoachPlanSourceDialog` which renders the original pasted text, screenshot (signed URL), or a link to download the document.

Entry point: "Import from coach" button in the Training Plan card header (`TrainingPlanCard.tsx`). Day-of-week is 0=Mon..6=Sun to match existing schema. AI converts km/mi/h:mm/pace into meters/seconds.
