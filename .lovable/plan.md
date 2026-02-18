
## Redesign: Phone Verification UX — Verified State

### Problem
When a phone is verified, the current UI shows three overlapping elements:
1. A full-width disabled text input with the phone number
2. A "Change" button
3. A separate green banner below repeating "is verified. SMS notifications are active."

This is visually noisy and redundant. The user's screenshot confirms this.

### New Verified State Design

Replace the entire verified state with a **single compact row** that shows:

```
┌──────────────────────────────────────────────────────────┐
│  📱  Phone Number                          ✅ Verified   │
│                                                          │
│  +13133203922                           [Change Number]  │
└──────────────────────────────────────────────────────────┘
```

- The phone number is shown as plain text (not an input) — clean, not editable
- "Change Number" is a small ghost/link-style button that resets the flow
- The "Verified" badge is in the header right — minimal and clear
- No green banner below — the badge alone signals verified status
- The card shrinks to a tight 2-row layout when verified

### Unverified / Entry State (unchanged in function, refined in style)
- Phone entry: input + "Send Code" button on one row
- If phone exists but unverified: amber "Not verified" badge, with pre-filled number
- OTP entry: OTP boxes + Verify button + resend timer (kept, works well)

### What Changes

**`src/components/profile/PhoneVerificationSection.tsx`**

1. **Verified state** — remove the disabled input + "Change" button row entirely. Replace with a compact display:
   - Phone number as `<p>` text with a phone icon
   - "Change number" as an inline text button (small, muted, underline style)
   - Remove the green banner `div` below — the header badge is sufficient

2. **Idle/unverified state** — tighten up the label: remove the verbose "(E.164 format, e.g. +12025551234)" inline label text. Move the format hint to a `<p className="text-xs text-muted-foreground">` below the input instead, so the label reads cleanly as just "Phone Number".

3. **Card structure when verified** — use a single-row `CardContent` with flex layout instead of the multi-section layout that currently renders.

### Exact Verified State Before → After

**Before (3 separate UI elements):**
```jsx
// Element 1: disabled input row
<div className="space-y-2">
  <Label>Phone Number (E.164 format...)</Label>
  <div className="flex gap-2">
    <Input disabled value={phoneInput} />
    <Button onClick={handleChangeNumber}>Change</Button>
  </div>
</div>

// Element 2: green banner
<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
  <CheckCircle2 />
  <p>{currentPhone} is verified. SMS notifications are active.</p>
</div>
```

**After (1 clean compact layout):**
```jsx
<div className="flex items-center justify-between py-1">
  <div className="flex items-center gap-2">
    <span className="text-sm font-medium text-foreground">{currentPhone}</span>
  </div>
  <button
    onClick={handleChangeNumber}
    className="text-xs text-muted-foreground hover:text-foreground underline"
  >
    Change number
  </button>
</div>
```

### Files Changed

| File | Change |
|---|---|
| `src/components/profile/PhoneVerificationSection.tsx` | Redesign the verified state to a single compact row; tighten the idle state label |

No backend, database, or other files need to change.
