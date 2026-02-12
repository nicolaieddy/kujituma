

# Migrate Old Comments and Clean Up Legacy Code

## Data Migration

11 existing comments stored in `objective_partner_feedback.comment` need to be copied into the new `objective_comments` table. All referenced objectives still exist in `weekly_objectives`. The migration will:

- Insert each non-null comment from `objective_partner_feedback` into `objective_comments`, preserving the original `partner_id` as `user_id`, `objective_id`, and `created_at` timestamp
- This is a one-time data migration via SQL

## Code Cleanup

After the migration, the `comment` column on `objective_partner_feedback` becomes redundant. The feedback system should only track reaction type (agree/question) -- all text conversation now lives in `objective_comments`.

### Changes

| File | What Changes |
|------|-------------|
| **Database migration** | Insert old comments into `objective_comments`; optionally drop the `comment` column from `objective_partner_feedback` |
| `src/hooks/useObjectiveFeedback.ts` | Remove `comment` from the `ObjectiveFeedback` interface, remove `comment` parameter from `submitFeedback` mutation |
| `src/components/accountability/FeedbackCommentPopover.tsx` | Remove the comment popover flow entirely -- buttons now just toggle reactions. Remove the old comment indicator text. Keep the Chat button for opening the comments sheet. Simplify to just two toggle buttons + Chat link |
| `src/pages/PartnerDashboard.tsx` | Remove `comment` prop passing to feedback functions |

### Simplified FeedbackCommentPopover

The component currently opens a popover asking for a note after each reaction. Since notes now live in the threaded comments system, the buttons will simply toggle the reaction on/off (with the existing remove-confirmation dialog). The "Chat" button remains as the entry point to the full conversation.

Before: Click thumbs-up -> popover asks "Add a note?" -> submit note
After: Click thumbs-up -> toggles reaction immediately. Click Chat -> opens threaded comments sheet.

### Database Migration SQL

```sql
-- Migrate old comments to the new objective_comments table
INSERT INTO objective_comments (objective_id, user_id, message, created_at)
SELECT objective_id, partner_id, comment, created_at
FROM objective_partner_feedback
WHERE comment IS NOT NULL AND comment != '';

-- Drop the comment column from objective_partner_feedback
ALTER TABLE objective_partner_feedback DROP COLUMN IF EXISTS comment;
```
