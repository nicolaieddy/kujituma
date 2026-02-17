
## Root Cause

`CheckInQuestionsSettings` is a **Radix UI Sheet** (built on `@radix-ui/react-dialog`). When the check-in **Dialog** is open, Radix UI installs a **focus trap** on that dialog. Any attempt to interact with a second Radix dialog/sheet that opens on top gets blocked by that focus trap — the sheet appears visually but interactions are swallowed, making it look "greyed out."

## Solution: Inline Settings Panel (Single-View Switch)

Replace the separate Sheet with an **inline settings view** rendered inside the existing Dialog/Drawer. When the gear icon is clicked, the dialog content switches to show the settings panel (and a back button replaces the title). This avoids the two-dialogs-at-once problem entirely.

The implementation adds a `view` state (`'checkin' | 'settings'`) to `DailyCheckInDialog`. When `view === 'settings'`, the content area renders the settings UI (the same fields from `CheckInQuestionsSettings`) instead of the check-in form, and the header shows a back arrow + "Customise Questions" title. Switching back to `'checkin'` returns to the normal form.

This is the same "nested view" pattern used in mobile settings apps (e.g. iOS Settings).

---

## Technical Changes

### 1. `DailyCheckInDialog.tsx`

- Add `const [view, setView] = useState<'checkin' | 'settings'>('checkin')` state.
- Replace the settings gear `onClick` from `setShowQuestionsSettings(true)` → `setView('settings')`.
- In both the Desktop (Dialog) and Mobile (Drawer) renders:
  - When `view === 'checkin'`: render existing content + footer as today.
  - When `view === 'settings'`: render `<InlineCheckInSettings />` with a back button in the header. Footer becomes just a "Done" / back button.
- Reset `view` back to `'checkin'` when the dialog closes (in the existing `useEffect` on `open`).
- Remove the `showQuestionsSettings` state and the separate `<CheckInQuestionsSettings ... />` sibling renders.

### 2. New component: `src/components/habits/InlineCheckInSettings.tsx`

Extract the settings UI from `CheckInQuestionsSettings.tsx` into a plain `<div>` (no Sheet/Dialog wrapper) so it can be embedded inline. It uses the same `useCheckInCustomQuestions` hook, renders the same built-in questions display, custom questions list, add-question input, and preset suggestions — just without a Sheet container.

### 3. `CheckInQuestionsSettings.tsx`

Keep the file as-is (it's still used anywhere the sheet can open standalone). The `InlineCheckInSettings` will be a separate extracted component.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/habits/DailyCheckInDialog.tsx` | Add `view` state; switch content between check-in form and inline settings; remove Sheet sibling |
| `src/components/habits/InlineCheckInSettings.tsx` | **New file** — settings UI as a plain div, no Sheet wrapper |

---

## User Experience

Before: Click gear → Sheet appears but is greyed out and unresponsive (blocked by Dialog focus trap).

After: Click gear → Dialog content slides/switches to the settings panel inline. Click back arrow → returns to check-in form. No z-index or focus trap conflicts.
