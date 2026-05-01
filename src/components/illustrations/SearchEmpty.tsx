import { cn } from "@/lib/utils";

interface Props { className?: string }

/** Magnifier over dotted grid for "no results" states. */
export const SearchEmpty = ({ className }: Props) => (
  <svg
    viewBox="0 0 128 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-full w-full", className)}
  >
    {/* dotted grid */}
    {Array.from({ length: 5 }).map((_, r) =>
      Array.from({ length: 9 }).map((_, c) => (
        <circle
          key={`${r}-${c}`}
          cx={20 + c * 11}
          cy={18 + r * 11}
          r={1}
          fill="currentColor"
          opacity={0.25}
        />
      ))
    )}
    {/* magnifier */}
    <circle cx="58" cy="40" r="16" stroke="hsl(var(--primary))" strokeWidth="1.75" fill="hsl(var(--primary) / 0.08)" />
    <path d="M70 52 L86 66" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
