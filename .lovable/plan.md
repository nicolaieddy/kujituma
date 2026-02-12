

# Objective Feedback: From Reactions to Conversations

## What's Changing

The current feedback system only supports a single "reaction + note" per partner per objective. There's no way for the objective owner to respond, and partners can't see each other's feedback or have a discussion. This plan upgrades the system to support threaded comments on objectives, visible on both the owner's weekly plan page and the partner dashboard.

## Current Limitations

- The `objective_partner_feedback` table stores one row per partner per objective with a single `comment` field
- The owner sees feedback only in tiny tooltips (no way to respond)
- Partners can't see each other's comments
- No conversation threading

## Plan

### 1. New Database Table: `objective_comments`

Create a new table for threaded comments on objectives, separate from the existing reaction system (thumbs-up / question marks stay as-is):

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| objective_id | uuid | FK to weekly_objectives |
| user_id | uuid | Who wrote the comment (owner or partner) |
| message | text | The comment text |
| created_at | timestamptz | When posted |

RLS policies:
- Users can read comments on their own objectives
- Accountability partners can read/write comments on objectives they have visibility to (via partnership goal visibility)
- Objective owners can read/write comments on their own objectives

### 2. New Hook: `useObjectiveComments`

A new hook (`src/hooks/useObjectiveComments.ts`) that handles:
- Fetching comments for a set of objective IDs (with partner profile data joined)
- Adding a new comment (with optimistic update)
- Query key structure: `['objective-comments', objectiveIds]`

### 3. New Component: `ObjectiveCommentsSheet`

A new sheet/drawer component (`src/components/accountability/ObjectiveCommentsSheet.tsx`) that opens when clicking on an objective's feedback area. It shows:
- The objective text at the top for context
- The existing reactions (thumbs-up/question indicators)
- A scrollable list of all comments from both the owner and partners, with avatars and timestamps
- A text input at the bottom to add a new comment
- Works for both the owner (on their weekly plan page) and the partner (on the partner dashboard)

### 4. Update `ObjectiveFeedbackIndicator` (Owner's View)

Currently shows feedback in tooltips only. Changes:
- Make the indicator clickable -- opens the `ObjectiveCommentsSheet`
- Show a comment count badge (e.g., "3 comments") alongside the existing reaction icons
- The sheet lets the owner read all comments and reply

### 5. Update `FeedbackCommentPopover` (Partner's View)

The thumbs-up/question buttons stay as quick reactions. Changes:
- Replace the truncated comment preview text with a clickable "View thread" / comment count link
- Clicking it opens the same `ObjectiveCommentsSheet`
- The partner can see all comments (including from the objective owner and other partners) and add more

### 6. Notification on New Comment

Add a database trigger (`notify_objective_comment`) that creates a notification when a comment is added:
- If the commenter is a partner, notify the objective owner
- If the commenter is the owner, notify partners who have previously interacted with that objective

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useObjectiveComments.ts` | Fetch/create comments with optimistic updates |
| `src/components/accountability/ObjectiveCommentsSheet.tsx` | Sheet UI for viewing/adding comments on an objective |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/thisweek/ObjectiveFeedbackIndicator.tsx` | Make clickable, add comment count, open sheet |
| `src/components/goals/ObjectiveItem.tsx` | Pass through click handler for opening comments sheet, add state for selected objective |
| `src/components/goals/WeeklyObjectivesList.tsx` | Add `ObjectiveCommentsSheet` and state management for which objective's comments are open |
| `src/components/accountability/FeedbackCommentPopover.tsx` | Add "View thread" link that opens the comments sheet |
| `src/pages/PartnerDashboard.tsx` | Add `ObjectiveCommentsSheet` and integrate with existing feedback flow |

### Database Migration

```sql
CREATE TABLE objective_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id uuid REFERENCES weekly_objectives(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast lookups
CREATE INDEX idx_objective_comments_objective_id ON objective_comments(objective_id);

-- RLS
ALTER TABLE objective_comments ENABLE ROW LEVEL SECURITY;

-- Users can see comments on their own objectives
CREATE POLICY "Users can view comments on own objectives"
  ON objective_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM weekly_objectives wo
      WHERE wo.id = objective_comments.objective_id
      AND wo.user_id = auth.uid()
    )
  );

-- Partners can view comments on objectives they have visibility to
CREATE POLICY "Partners can view comments on partner objectives"
  ON objective_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM weekly_objectives wo
      JOIN accountability_partnerships ap ON (
        (ap.user1_id = auth.uid() AND ap.user2_id = wo.user_id AND ap.user1_can_view_user2_goals = true)
        OR (ap.user2_id = auth.uid() AND ap.user1_id = wo.user_id AND ap.user2_can_view_user1_goals = true)
      )
      WHERE wo.id = objective_comments.objective_id
      AND ap.status = 'active'
    )
  );

-- Users can insert comments on their own objectives or partner objectives they can view
CREATE POLICY "Users can add comments"
  ON objective_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM weekly_objectives wo
        WHERE wo.id = objective_comments.objective_id
        AND wo.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM weekly_objectives wo
        JOIN accountability_partnerships ap ON (
          (ap.user1_id = auth.uid() AND ap.user2_id = wo.user_id AND ap.user1_can_view_user2_goals = true)
          OR (ap.user2_id = auth.uid() AND ap.user1_id = wo.user_id AND ap.user2_can_view_user1_goals = true)
        )
        WHERE wo.id = objective_comments.objective_id
        AND ap.status = 'active'
      )
    )
  );

-- Notification trigger
CREATE OR REPLACE FUNCTION notify_objective_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  objective_owner_id uuid;
  objective_text_val text;
  commenter_name text;
BEGIN
  SELECT wo.user_id, wo.text INTO objective_owner_id, objective_text_val
  FROM weekly_objectives wo WHERE wo.id = NEW.objective_id;

  SELECT full_name INTO commenter_name FROM profiles WHERE id = NEW.user_id;

  IF NEW.user_id != objective_owner_id THEN
    -- Partner commented, notify owner
    INSERT INTO notifications (user_id, triggered_by_user_id, type, message)
    VALUES (objective_owner_id, NEW.user_id, 'partner_objective_feedback',
      commenter_name || ' commented on your objective: "' ||
      LEFT(objective_text_val, 50) ||
      CASE WHEN LENGTH(objective_text_val) > 50 THEN '..."' ELSE '"' END
    );
  ELSE
    -- Owner replied, notify partners who previously commented
    INSERT INTO notifications (user_id, triggered_by_user_id, type, message)
    SELECT DISTINCT oc.user_id, NEW.user_id, 'partner_objective_feedback',
      commenter_name || ' replied on objective: "' ||
      LEFT(objective_text_val, 50) ||
      CASE WHEN LENGTH(objective_text_val) > 50 THEN '..."' ELSE '"' END
    FROM objective_comments oc
    WHERE oc.objective_id = NEW.objective_id
      AND oc.user_id != NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_objective_comment_added
  AFTER INSERT ON objective_comments
  FOR EACH ROW EXECUTE FUNCTION notify_objective_comment();
```

### Existing Reactions Stay

The thumbs-up/question reaction system (`objective_partner_feedback`) remains unchanged. It serves as quick lightweight feedback. The new comments system adds the ability to have actual conversations alongside those reactions.

