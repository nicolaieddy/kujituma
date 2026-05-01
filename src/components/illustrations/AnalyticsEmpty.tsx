import { cn } from "@/lib/utils";

interface Props { className?: string }

/** Soft sparkline over rising bar wisps. */
export const AnalyticsEmpty = ({ className }: Props) => (
  <svg
    viewBox="0 0 128 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-full w-full", className)}
  >
    {/* axes */}
    <path d="M14 14 L14 64 L120 64" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity="0.45" />
    {/* rising bars */}
    <rect x="26" y="50" width="8" height="14" rx="2" fill="currentColor" opacity="0.18" />
    <rect x="42" y="42" width="8" height="22" rx="2" fill="currentColor" opacity="0.22" />
    <rect x="58" y="36" width="8" height="28" rx="2" fill="currentColor" opacity="0.26" />
    <rect x="74" y="28" width="8" height="36" rx="2" fill="currentColor" opacity="0.30" />
    <rect x="90" y="22" width="8" height="42" rx="2" fill="currentColor" opacity="0.34" />
    {/* sparkline overlay */}
    <path
      d="M22 52 L38 46 L54 38 L70 32 L86 24 L110 18"
      stroke="hsl(var(--primary))"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="110" cy="18" r="2.5" fill="hsl(var(--primary))" />
  </svg>
);
