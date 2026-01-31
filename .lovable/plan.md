

# Authentication Flow Redesign Plan

## Overview
This plan redesigns the sign-in/sign-up flow to be clearer and more intuitive, with proper separation between returning users and new users.

## Current Problems Identified

1. **Sign-in mode bypasses ToS checkbox** but `TosGate` still shows the modal after OAuth redirect for users without ToS records
2. **New users must manually toggle** to "Create Account" mode to see ToS checkbox
3. **Returning users redirected to /community** instead of /goals
4. **After onboarding, users go to /goals** but land on "Weekly Plan" tab instead of "Goals" tab
5. **`TosGate` shows modal unnecessarily** for returning users who already accepted ToS

## Proposed Solution

### Flow Summary

**Returning Users (Sign In):**
1. Click "Continue with Google" directly (no ToS checkbox shown)
2. Complete Google OAuth
3. System checks `tos_acceptances` - should have valid record
4. Redirect directly to `/goals?tab=longterm`

**New Users (Create Account):**
1. Click "New to Kujituma? Create an account"
2. See ToS checkbox, must check to proceed
3. Click "Sign up with Google"
4. Complete Google OAuth
5. System records ToS acceptance
6. Redirect to `/onboarding`
7. Complete profile (name, avatar, about, location)
8. Optionally create first goal
9. Redirect to `/goals?tab=longterm`

## Implementation Details

### 1. Update Auth.tsx - Sign-In Flow

**Changes:**
- For **sign-in mode**: Remove ToS requirement, let returning users sign in directly
- For **sign-up mode**: Keep ToS checkbox requirement
- Update redirect destinations:
  - Returning users → `/goals?tab=longterm`
  - New users → `/onboarding`
- Store a flag in sessionStorage during sign-up to indicate this is a new user signup

```text
┌─────────────────────────────────────┐
│         Welcome Back                │
│ Sign in to track your goals...      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │   Continue with Google      │    │
│  └─────────────────────────────┘    │
│                                     │
│  ────────── OR ──────────           │
│                                     │
│  New to Kujituma? Create account    │
└─────────────────────────────────────┘
```

### 2. Update Auth.tsx - Sign-Up Flow  

```text
┌─────────────────────────────────────┐
│      Create Your Account            │
│ Join Kujituma to track your goals.. │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ☐ I agree to Terms of Service  ││
│  │   and Privacy Policy           ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │   Sign up with Google           ││
│  └─────────────────────────────────┘│
│                                     │
│  ────────── OR ──────────           │
│                                     │
│  Already have an account? Sign in   │
└─────────────────────────────────────┘
```

### 3. Update TosGate.tsx - Smarter Detection

**Current Issue:** TosGate shows modal even for returning users who just signed in

**Fix:**
- Check if user just completed a sign-in (not sign-up) flow
- For sign-in users who somehow don't have ToS record (edge case), show modal
- For sign-up users, the ToS is already recorded during the signup flow

**Logic:**
- If `is_new_signup` flag exists in sessionStorage → user is signing up, ToS will be recorded
- If no flag and no ToS record → user is returning but needs to accept updated ToS
- If no flag and has current ToS → proceed normally

### 4. Update AuthContext.tsx - New User Detection

**Current behavior:** Checks `is_profile_complete` to determine `isNewUser`

**Enhancement:** 
- Keep this behavior but ensure it runs immediately after OAuth callback
- Add handling for the `?tab=longterm` query parameter

### 5. Update Onboarding Completion Flow

**Current:** Redirects to `/goals` (lands on "Weekly Plan" tab)

**Fix:** Redirect to `/goals?tab=longterm` so new users land on the Goals tab

### 6. Update Goals.tsx - Tab from URL

**Add:** Read `tab` query parameter on mount to set initial active tab

```typescript
// In Goals.tsx useEffect
const searchParams = new URLSearchParams(location.search);
const tabParam = searchParams.get('tab');
if (tabParam === 'longterm' || tabParam === 'weekly') {
  setActiveTab(tabParam);
}
```

### 7. Handle Edge Cases

| Scenario | Handling |
|----------|----------|
| User signs in but has incomplete profile | Redirect to /onboarding |
| User signs in, profile complete, no ToS | Show TosAcceptanceModal (updated ToS) |
| User creates account, completes OAuth, but browser closes | On next visit, detect incomplete profile → onboarding |
| User is on mobile with flaky connection | Optimistic UI, retry ToS recording |
| User already has account but clicks "Create Account" | OAuth will recognize existing account, proceed as sign-in |

## Files to Modify

1. **`src/pages/Auth.tsx`**
   - Update redirect logic: returning users → `/goals?tab=longterm`
   - Keep ToS only for sign-up flow
   - Store `is_new_signup` flag for TosGate coordination

2. **`src/components/auth/TosGate.tsx`**
   - Check for signup flag before showing modal
   - Only show modal for returning users who need to accept updated ToS
   - Clear signup flag after ToS is recorded

3. **`src/components/onboarding/OnboardingWizard.tsx`**
   - Change final redirect from `/goals` to `/goals?tab=longterm`

4. **`src/pages/Goals.tsx`**
   - Read `tab` query parameter to set initial tab
   - Clean up URL after reading parameter

5. **`src/App.tsx`** (RequireProfileComplete wrapper)
   - Update redirect destination to `/onboarding` (already correct)
   - Ensure proper handling of the Goals tab redirect

## Additional Recommendations

1. **Add loading state during OAuth callback** - Show "Setting up your account..." message while processing

2. **Improve error messages** - If Google OAuth fails, show specific actionable error

3. **Add "Remember me" behavior** - Users who sign in should stay signed in across sessions (already handled by Supabase)

4. **Consider adding email login** - Future enhancement for users who prefer not to use Google

## Testing Checklist

After implementation, verify these scenarios:

- [ ] New user creates account → sees ToS → completes OAuth → lands on onboarding
- [ ] New user completes onboarding → lands on Goals tab (not Weekly Plan)
- [ ] Returning user signs in → lands on Goals tab directly (no ToS modal)
- [ ] Returning user with incomplete profile → redirected to onboarding
- [ ] User with outdated ToS version signs in → sees ToS update modal
- [ ] User clicks "Create Account" but already has account → handled gracefully
- [ ] Mobile flow works smoothly without stack overflow errors
- [ ] OAuth redirect works from both preview and production domains

