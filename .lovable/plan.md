

# Fix Google Sign-In Button to Follow Official Branding Guidelines

## Problem
The current sign-in button is green with a white monochrome Google icon. This violates Google's branding guidelines, which require:
- White or light background (not colored)
- The official multi-colored Google "G" logo (blue, red, yellow, green)
- Roboto font family
- Specific padding and sizing
- Dark text (#1f1f1f) on the white background
- A subtle border and shadow

## Solution
Update the Auth page to render a Google-compliant sign-in button using the official color palette and SVG logo. No new libraries needed -- just correct SVG paths and styling.

## Technical Changes

### File: `src/pages/Auth.tsx`

**Replace both Google button instances** (sign-up and sign-in) with a properly branded button:

- **Background**: White (`#ffffff`) with a light border (`#747775`)
- **Text color**: Dark (`#1f1f1f`)
- **Font**: Roboto, 500 weight, 14px
- **Google "G" icon**: Official multi-colored SVG (blue `#4285F4`, red `#EA4335`, yellow `#FBBC05`, green `#34A853`)
- **Hover state**: Light gray background (`#f2f2f2`)
- **Border radius**: 20px (pill shape per current Google guidelines)
- **Height**: 40px (Google's standard)

The button text will be:
- Sign-up flow: "Sign up with Google"
- Sign-in flow: "Continue with Google"  

Both match Google's approved call-to-action text options.

### File: `index.html`
Add Roboto font import via Google Fonts CDN (if not already present).

No other files change. The Supabase OAuth flow remains identical -- only the button's visual presentation is updated.

