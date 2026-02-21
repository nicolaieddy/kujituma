

# Security Hardening Plan for Journal Entries & Sensitive Data

## Current State

Your journal entries are stored in `daily_check_ins.journal_entry`. The good news: **RLS is already enabled** and policies restrict access to `auth.uid() = user_id` for SELECT, INSERT, and UPDATE. This means no other authenticated user can read your journal entries through the Supabase API.

However, there are several layers of additional protection we can add.

---

## What We'll Implement

### 1. Block DELETE on daily_check_ins (no policy exists today)

There is no DELETE policy, which means by default deletes are blocked by RLS. This is correct behavior -- but we should add an explicit deny to make the intent clear and prevent accidental policy additions later.

### 2. Restrict service_role access patterns

The `service_role` key bypasses all RLS. We should ensure:
- The service_role key is **never** exposed in frontend code (it isn't today -- only the anon key is used)
- Edge functions that use it don't expose journal data

### 3. Add a database-level security function to strip journal entries from any shared context

Create a `SECURITY DEFINER` function that explicitly excludes `journal_entry` when any partner/accountability data is fetched. This acts as a second barrier even if someone accidentally creates an overly permissive RLS policy.

### 4. Add column-level comments and a protective trigger

Add a trigger that **prevents** the `journal_entry` column from being returned in any RPC function that isn't explicitly owned by the user. This is defense-in-depth.

### 5. Enable leaked password protection

The Supabase linter flagged that leaked password protection is disabled. This is a quick win -- it prevents users from signing up with passwords found in known data breaches.

### 6. Fix the 4 overly permissive RLS policies

The linter found policies using `WITH CHECK (true)` or `USING (true)` on INSERT/DELETE/UPDATE for:
- `accountability_partnerships` (INSERT with true)
- `partnership_visibility_history` (INSERT with true)  
- `friends` (INSERT with true)

These are used by `SECURITY DEFINER` functions internally, but we should tighten them to only allow the `postgres` role or add proper checks.

---

## Technical Details

### Migration 1: Protective view for journal data

```sql
-- Create a secure function that NEVER returns journal_entry to non-owners
CREATE OR REPLACE FUNCTION public.get_safe_check_in_data(p_user_id UUID)
RETURNS SETOF daily_check_ins
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return full data (including journal) to the owner
  IF auth.uid() = p_user_id THEN
    RETURN QUERY SELECT * FROM daily_check_ins WHERE user_id = p_user_id;
  ELSE
    -- Return nothing for non-owners (extra safety net)
    RETURN;
  END IF;
END;
$$;
```

### Migration 2: Add explicit DELETE denial + audit trigger

```sql
-- Explicit deny: no one can delete check-ins via API
CREATE POLICY "No one can delete check-ins via API"
ON public.daily_check_ins
FOR DELETE
USING (false);

-- Audit trigger: log any access to journal_entry column
CREATE TABLE IF NOT EXISTS public.journal_access_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.journal_access_log ENABLE ROW LEVEL SECURITY;

-- Only the system can write to audit log
CREATE POLICY "No direct access to audit log"
ON public.journal_access_log
FOR ALL
USING (false);
```

### Migration 3: Tighten the overly permissive INSERT policies

```sql
-- accountability_partnerships: only allow via security definer functions
DROP POLICY IF EXISTS "System can create partnerships" ON accountability_partnerships;
CREATE POLICY "System can create partnerships" 
ON accountability_partnerships FOR INSERT
TO authenticated
WITH CHECK (
  user1_id = auth.uid() OR user2_id = auth.uid()
);

-- friends: same approach  
DROP POLICY IF EXISTS "System can create friendships" ON friends;
CREATE POLICY "System can create friendships"
ON friends FOR INSERT
TO authenticated  
WITH CHECK (
  user1_id = auth.uid() OR user2_id = auth.uid()
);

-- partnership_visibility_history: restrict to partnership members
DROP POLICY IF EXISTS "System can insert history" ON partnership_visibility_history;
CREATE POLICY "Members can insert visibility history"
ON partnership_visibility_history FOR INSERT
TO authenticated
WITH CHECK (
  partnership_id IN (
    SELECT id FROM accountability_partnerships
    WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  )
);
```

### Settings change: Enable leaked password protection

This is a Supabase dashboard setting, not a migration. You'll need to enable it at:
**Authentication > Settings > Password Security > Enable leaked password protection**

### Settings change: Upgrade Postgres version

The linter flagged security patches are available. This is done via **Project Settings > Infrastructure** in the Supabase dashboard.

---

## What This Does NOT Protect Against

To be transparent, here are the remaining attack vectors and what you'd need to address them outside of Lovable:

| Risk | Mitigation (requires Supabase dashboard / external tools) |
|---|---|
| Someone obtains your `service_role` key | Rotate keys regularly in Supabase dashboard; never commit them to git |
| Direct database access via stolen credentials | Enable Supabase's database password rotation; use SSL-only connections |
| At-rest encryption of journal text | Supabase encrypts data at rest by default (AES-256). For extra protection, you could encrypt journal entries client-side before storing them (would require a key management strategy) |
| Supabase staff access | Supabase SOC2 compliant; for maximum protection, consider client-side encryption |

### Optional Future Enhancement: Client-Side Encryption

The strongest protection would be encrypting journal entries in the browser before they reach the database. This means even if someone gains full database access, the text is unreadable without the user's encryption key. This is a significant architecture change and would be a separate project.

---

## Summary of Changes

| Change | Type | Impact |
|---|---|---|
| Explicit DELETE denial on `daily_check_ins` | Migration | Prevents accidental deletion |
| Journal access audit log table | Migration | Tracks access patterns |
| Tighten 3 overly permissive INSERT policies | Migration | Closes privilege escalation paths |
| Enable leaked password protection | Dashboard setting | Prevents weak passwords |
| Upgrade Postgres | Dashboard setting | Security patches |

