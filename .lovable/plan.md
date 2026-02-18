
## Fix: Phone OTP Verification — Three Bugs Found

### Bug 1 (Critical): `supabase.auth.getClaims()` Does Not Exist

Both `send-otp/index.ts` and `verify-otp/index.ts` call `supabase.auth.getClaims(token)`, which is **not a real method** in Supabase JS v2. This causes every request to fail with `401 Unauthorized`, meaning:
- No OTP is ever sent via Twilio
- No verification code is ever validated

**Fix:** Replace `getClaims` with `supabase.auth.getUser()`, which is the correct Supabase v2 way to validate a JWT and get the user ID from an edge function.

```typescript
// WRONG (doesn't exist)
const { data: authData } = await supabase.auth.getClaims(token);
const userId = authData.claims.sub;

// CORRECT
const { data: { user }, error: authError } = await supabase.auth.getUser();
const userId = user.id;
```

---

### Bug 2 (Critical): Reset Trigger Fires on the Same UPDATE That Sets `phone_verified = true`

In `verify-otp`, the profile update is:
```sql
UPDATE profiles SET phone_number = '...', phone_verified = true WHERE id = userId
```

The `trg_reset_phone_verified` trigger fires `BEFORE UPDATE` on `profiles` and checks `IF NEW.phone_number IS DISTINCT FROM OLD.phone_number`. Since `phone_number` changes from `''` (empty string, its default) to the actual verified number, the trigger resets `phone_verified` back to `false` **in the same statement that tried to set it to true**.

**Fix:** The trigger's reset function must be made smarter — it should NOT reset `phone_verified` when `phone_verified` is already being explicitly set to `true` in the same update statement. We do this by checking if `NEW.phone_verified = true` and allowing that through:

```sql
CREATE OR REPLACE FUNCTION public.reset_phone_verified_on_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only reset if phone number is changing AND verification isn't being explicitly granted
  IF NEW.phone_number IS DISTINCT FROM OLD.phone_number AND NEW.phone_verified IS NOT TRUE THEN
    NEW.phone_verified := false;
  END IF;
  RETURN NEW;
END;
$$;
```

This way, the `verify-otp` edge function (which sets both `phone_number` and `phone_verified = true` in the same UPDATE) is allowed through, but changing the phone number via any other path (profile edit form) will still correctly reset verification.

---

### Bug 3 (UX): `phoneKey` Increment Causes Re-mount After Verification

In `NotificationPreferences`, `handleVerified` calls `setPhoneKey(k => k + 1)`, which remounts `PhoneVerificationSection`. The remounted component re-fetches the profile from the DB. Even if Bug 2 were fixed, this introduces a timing race — the component re-mounts before the DB write completes, potentially reading stale data.

**Fix:** Remove the `phoneKey` re-mount trick. Instead:
- Pass the verified phone number directly from `PhoneVerificationSection`'s `onVerified` callback: `onVerified(phoneNumber: string)`
- `NotificationPreferences` updates its `hasPhone` state directly from the callback data, no re-mount needed
- `PhoneVerificationSection` manages its own internal state (already does this correctly with `setState("verified")`)

---

### Summary of Files Changed

| File | Change |
|---|---|
| `supabase/functions/send-otp/index.ts` | Replace `getClaims` with `getUser()` |
| `supabase/functions/verify-otp/index.ts` | Replace `getClaims` with `getUser()` |
| `supabase/migrations/..._fix_phone_trigger.sql` | Fix `reset_phone_verified_on_change()` to not reset when `phone_verified` is being set to `true` in same update |
| `src/components/profile/NotificationPreferences.tsx` | Remove `phoneKey` state and re-mount; update `handleVerified` to set `hasPhone(true)` directly without triggering a DB re-fetch |
| `src/components/profile/PhoneVerificationSection.tsx` | Update `onVerified` callback signature to pass the phone number back |

No new secrets, tables, or dependencies needed.
