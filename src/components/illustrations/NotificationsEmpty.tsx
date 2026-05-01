import { cn } from "@/lib/utils";

interface Props { className?: string }

/** Calm bell with soft sound waves. */
export const NotificationsEmpty = ({ className }: Props) => (
  <svg
    viewBox="0 0 128 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-full w-full", className)}
  >
    {/* waves */}
    <path d="M34 40 Q28 46 28 54" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity="0.35" />
    <path d="M94 40 Q100 46 100 54" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity="0.35" />
    {/* bell body */}
    <path
      d="M50 50 V42 a14 14 0 0 1 28 0 V50 l4 6 H46 Z"
      stroke="hsl(var(--primary))"
      strokeWidth="1.75"
      strokeLinejoin="round"
      fill="hsl(var(--primary) / 0.08)"
    />
    {/* clapper */}
    <path d="M60 60 a4 4 0 0 0 8 0" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* top dot */}
    <circle cx="64" cy="26" r="2" fill="hsl(var(--primary))" />
  </svg>
);
