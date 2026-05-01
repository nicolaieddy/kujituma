import { cn } from "@/lib/utils";

interface Props { className?: string }

/** Streak/checkbox row motif for habits & check-ins. */
export const HabitsEmpty = ({ className }: Props) => (
  <svg
    viewBox="0 0 128 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-full w-full", className)}
  >
    {/* baseline */}
    <path d="M8 60 H120" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity="0.4" />
    {/* day cells */}
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <rect
        key={i}
        x={12 + i * 15}
        y={32}
        width={11}
        height={11}
        rx={2.5}
        stroke="currentColor"
        strokeWidth="1.25"
        opacity={0.45}
        fill="none"
      />
    ))}
    {/* completed cells */}
    {[0, 1, 2].map((i) => (
      <rect
        key={`c-${i}`}
        x={12 + i * 15}
        y={32}
        width={11}
        height={11}
        rx={2.5}
        fill="hsl(var(--primary))"
        opacity={0.85}
      />
    ))}
    {/* check on last completed */}
    <path
      d="M33 38 L36 41 L41 35"
      stroke="hsl(var(--primary-foreground, 0 0% 100%))"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* spark */}
    <circle cx="42" cy="22" r="1.5" fill="hsl(var(--primary))" opacity="0.6" />
    <circle cx="52" cy="18" r="1" fill="hsl(var(--primary))" opacity="0.5" />
  </svg>
);
