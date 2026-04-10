

# Plan: Add Markdown Rendering for Goal Descriptions

## Why
Customer feedback: goal descriptions lose formatting (newlines, bullets, numbered lists). The input is a textarea (already supports multi-line), but render uses plain `<p>` tags that collapse formatting.

## Approach
Install `react-markdown` and render goal descriptions as markdown in all display locations. Plain text looks identical; users who add `-` bullets or `1.` numbered lists get proper formatting automatically.

## Changes

### 1. Install `react-markdown`
Add the dependency (lightweight, no remark/rehype plugins needed for basic use).

### 2. Create a reusable `MarkdownContent` component (`src/components/ui/markdown-content.tsx`)
A thin wrapper around `react-markdown` with consistent prose styling (text color, spacing, list styles). Used everywhere descriptions are displayed.

### 3. Update render points (3 files)
- **`GoalDetailOverview.tsx`** (line 362): Replace `<p>{goal.description}</p>` with `<MarkdownContent>`
- **`GoalCard.tsx`** (lines 424-432): Replace truncated `<p>` with markdown for expanded view, keep plain text truncation for collapsed
- **`GoalDetailModal.tsx`**: Check if description is rendered here too and update

### 4. Style the markdown output
Add Tailwind prose-like classes so bullets, numbered lists, headings, bold, and line breaks render cleanly within the existing dark/light theme cards.

## Files changed
- `package.json` — add `react-markdown`
- New: `src/components/ui/markdown-content.tsx`
- `src/components/goals/GoalDetailOverview.tsx`
- `src/components/goals/GoalCard.tsx`
- `src/components/goals/GoalDetailModal.tsx` (if applicable)

