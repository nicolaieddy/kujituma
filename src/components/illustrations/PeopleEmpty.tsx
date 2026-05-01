import { cn } from "@/lib/utils";

interface Props { className?: string }

/** Two friendly silhouettes for friends/partners empty states. */
export const PeopleEmpty = ({ className }: Props) => (
  <svg
    viewBox="0 0 128 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-full w-full", className)}
  >
    {/* ground */}
    <path d="M14 64 H114" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity="0.35" />
    {/* left person */}
    <circle cx="48" cy="34" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.6" fill="none" />
    <path d="M34 62 a14 14 0 0 1 28 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" fill="none" />
    {/* right person (accent) */}
    <circle cx="82" cy="34" r="8" stroke="hsl(var(--primary))" strokeWidth="1.75" fill="hsl(var(--primary) / 0.1)" />
    <path d="M68 62 a14 14 0 0 1 28 0" stroke="hsl(var(--primary))" strokeWidth="1.75" strokeLinecap="round" fill="none" />
    {/* connection dot */}
    <circle cx="65" cy="48" r="1.5" fill="hsl(var(--primary))" opacity="0.7" />
  </svg>
);
