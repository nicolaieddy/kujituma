

# Plan: Remove Community/Feed Feature

## What gets removed

### Entire directories (delete all files)
- `src/components/community/` (6 files) — CommunityFeed, CommunitySidebar, CommunityRightSidebar, CreateGoalUpdateModal, GoalUpdateCard, GoalUpdateComments
- `src/components/feed/` (19 files) — all feed post components, FeedView, VirtualizedFeedList, etc.

### Pages
- `src/pages/Feed.tsx` — the community/feed page

### Hooks
- `src/hooks/useGoalUpdates.ts` — fetches goal update feed
- `src/hooks/useGoalFollows.ts` — follow/unfollow goals
- `src/hooks/useUnifiedPosts.ts` — unified post feed
- `src/hooks/useWeeklyFeedPost.ts` — weekly feed post logic
- `src/hooks/useWeeklyShare.ts` — share week to community
- `src/hooks/useWeeklyProgressPost.ts` — progress post creation
- `src/hooks/useCommentReactions.ts` — reactions on comments

### Services
- `src/services/goalUpdatesService.ts` — goal updates CRUD
- `src/services/unifiedPostsService.ts` — unified posts queries
- `src/services/goalFollowsService.ts` — goal follows CRUD

### Types
- `src/types/goalUpdates.ts` — GoalUpdate, CheerType, etc.

### Files that need editing (not deleting)

1. **`src/App.tsx`** — Remove `/community` route, Feed lazy import, change `*` fallback from `<Feed />` to `<Goals />`
2. **`src/components/layout/NavigationMenu.tsx`** — Remove "Community" nav item from `navItems` array
3. **`src/components/layout/MainNavigation.tsx`** — Remove "feed" tab (this component may become unnecessary with only Goals left, but we'll keep it if admin tab still uses it)
4. **`src/components/thisweek/ThisWeekView.tsx`** — Remove share-to-community functionality (`handleViewInCommunity`, share week card references)
5. **`src/components/thisweek/WeeklyReflectionCard.tsx`** — Remove "shared with community" messaging
6. **`src/components/thisweek/ShareWeekCard.tsx`** — May need deletion or gutting if it's purely for community sharing
7. **`src/components/thisweek/SharedPostPreview.tsx`** — Delete (preview of shared community post)
8. **`src/components/thisweek/ShareConfirmationDialog.tsx`** — Delete (confirms sharing to community)
9. **`src/components/habits/CloseLastWeekPrompt.tsx`** — Remove "share with community" messaging
10. **`src/components/feed/PostContextMenu.tsx`** — Deleted with feed directory
11. **`src/components/profile/NotificationPreferences.tsx`** — Remove "Goals & Community" label, update to just "Goals"
12. **`src/pages/PrivacyPolicy.tsx`** / **`src/pages/TermsOfService.tsx`** — Remove community feed references from legal text
13. **`src/hooks/useWeeklyProgress.ts`** — Remove `feedPost` references if it returns community feed data
14. **`vite.config.ts`** — Update PWA description to remove "community" wording

### Summary
- **~30 files deleted**
- **~10 files edited**
- Navigation simplified (no more Community tab)
- Week sharing to community removed; weekly close/reflection still works for personal use

