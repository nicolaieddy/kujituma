import { cn } from "@/lib/utils";

interface Props { className?: string }

/** Light flag-on-summit motif. */
export const GoalsEmpty = ({ className }: Props) => (
  <svg
    viewBox="0 0 128 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-full w-full", className)}
  >
    {/* far ridge */}
    <path
      d="M4 64 L34 40 L58 56 L82 36 L104 52 L124 40 L124 70 L4 70 Z"
      fill="currentColor"
      opacity="0.08"
    />
    {/* near ridge */}
    <path
      d="M4 70 L26 54 L46 66 L68 48 L92 64 L124 50"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.55"
    />
    {/* flag pole */}
    <path
      d="M82 18 L82 50"
      stroke="hsl(var(--primary))"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    {/* flag */}
    <path
      d="M82 20 L98 24 L82 30 Z"
      fill="hsl(var(--primary))"
    />
    {/* summit base dot */}
    <circle cx="82" cy="50" r="2.25" fill="hsl(var(--primary))" />
  </svg>
);
