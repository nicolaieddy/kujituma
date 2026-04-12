

# Plan: Fix Major Security Issues

## Issues to Fix (3 error-level findings)

### 1. Profiles table exposes sensitive data to all authenticated users
**Problem**: The SELECT policy `Authenticated users can view basic profile info` uses `USING (true)`, granting every authenticated user access to `email`, `phone_number`, `date_of_birth`, `google_id` on every profile.

**Fix**:
- Drop the `USING (true)` SELECT policy
- Create a `profiles_public` database view containing only safe columns (`id`, `full_name`, `avatar_url`, `about_me`, social links, `country`, `city`, `created_at`)
- Grant SELECT on the view to `authenticated` and `anon`
- Update ~6 app files that query other users' profiles (friend search, mention input, notification profiles, partner profiles, goal comments) to use `profiles_public` instead of `profiles`
- The existing `owner_full_profile_access` policy remains, so users still get full access to their own row via `profiles`

**Files changed**: Migration SQL, `src/services/friendsService.ts`, `src/services/notificationsService.ts`, `src/services/accountabilityService.ts`, `src/components/ui/mention-input.tsx`, `src/components/accountability/GoalCommentsSheet.tsx`, `src/components/profile/ProfilePublicView.tsx`

### 2. habit_completions leaks via Realtime broadcast
**Problem**: `habit_completions` is published to Supabase Realtime. Even though RLS restricts SELECT to the owner, Realtime broadcasts raw payloads to all channel subscribers, bypassing RLS.

**Fix**:
- Remove `habit_completions` from the Realtime publication via migration (`ALTER PUBLICATION supabase_realtime DROP TABLE habit_completions`)
- The existing `useRealtimeHabits` hook already does optimistic cache updates on insert/delete, so cross-device sync continues to work via query invalidation on window focus (already built into React Query)
- Add a short polling interval (30s `refetchInterval`) to the habit completions query as a fallback for cross-device sync

**Files changed**: Migration SQL, `src/hooks/useHabitCompletions.ts`

### 3. No Realtime channel authorization
**Problem**: No policies on `realtime.messages` means any authenticated user can subscribe to any channel topic.

**Fix**:
- Remove `goals` and `weekly_objectives` from the Realtime publication as well (they contain personal data). The existing `useRealtimeGoals` hook already invalidates queries — switching to React Query's `refetchOnWindowFocus` plus a polling interval achieves the same result without Realtime exposure
- Keep `posts`, `comments`, and `check_in_reactions` in Realtime since they have public/partnership-scoped SELECT policies
- Note: Adding policies on `realtime.messages` requires modifying the `realtime` schema which is Supabase-managed. The user would need to configure this in the Supabase dashboard if finer-grained channel auth is needed

**Files changed**: Migration SQL, `src/hooks/useRealtimeGoals.ts` (convert to polling), `src/hooks/useRealtimeHabits.ts` (remove or convert to polling)

---

## Technical Details

### Migration SQL (single migration)
```sql
-- 1. Drop overly permissive profiles SELECT policy
DROP POLICY "Authenticated users can view basic profile info" ON public.profiles;

-- 2. Create public view with safe columns only
CREATE VIEW public.profiles_public AS
SELECT id, full_name, avatar_url, about_me, country, city,
       linkedin_url, instagram_url, twitter_url, youtube_url,
       tiktok_url, github_url, website_url, medium_url,
       substack_url, snapchat_url, whatsapp_url, telegram_url,
       signal_url, email_contact, social_links_order,
       cover_photo_url, cover_photo_position, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- 3. Remove sensitive tables from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE habit_completions;
ALTER PUBLICATION supabase_realtime DROP TABLE goals;
ALTER PUBLICATION supabase_realtime DROP TABLE weekly_objectives;
```

### App code changes
- Replace `from('profiles').select('id, full_name, avatar_url')` with `from('profiles_public').select('id, full_name, avatar_url')` in queries that fetch **other users'** profiles
- Self-profile queries (own profile edit, own avatar) stay as `from('profiles')` since the owner policy covers those
- Remove `useRealtimeGoals` subscription logic, replace with `refetchInterval: 30000` on the goals query
- Remove `useRealtimeHabits` subscription, add `refetchInterval: 30000` on habit completions query

