import { cn } from "@/lib/utils";

interface Props { className?: string }

/** Minimal pulse-line over a track baseline. Uses currentColor + primary accent. */
export const TrainingEmpty = ({ className }: Props) => (
  <svg
    viewBox="0 0 128 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-full w-full", className)}
  >
    {/* baseline track */}
    <path
      d="M6 60 H122"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeDasharray="2 4"
      opacity="0.5"
    />
    {/* pulse line */}
    <path
      d="M6 50 L26 50 L34 30 L42 56 L52 22 L62 50 L78 50 L86 38 L94 50 L122 50"
      stroke="hsl(var(--primary))"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* runner dot */}
    <circle cx="62" cy="50" r="3" fill="hsl(var(--primary))" />
    {/* lap markers */}
    <circle cx="6" cy="60" r="1.5" fill="currentColor" opacity="0.6" />
    <circle cx="64" cy="60" r="1.5" fill="currentColor" opacity="0.6" />
    <circle cx="122" cy="60" r="1.5" fill="currentColor" opacity="0.6" />
  </svg>
);
