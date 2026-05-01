import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  illustration: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  /** Sizing preset. Defaults to "md". `compact` is kept for backwards compat (= "sm"). */
  size?: "sm" | "md" | "lg";
  /** @deprecated use size="sm" instead. */
  compact?: boolean;
}

const sizeStyles = {
  sm: {
    wrap: "px-4 py-6",
    art: "h-16 w-24",
    title: "text-sm",
    desc: "text-xs",
    gap: "gap-3",
  },
  md: {
    wrap: "px-6 py-10",
    art: "h-20 w-32",
    title: "text-base",
    desc: "text-sm",
    gap: "gap-4",
  },
  lg: {
    wrap: "px-8 py-14",
    art: "h-28 w-44",
    title: "text-lg",
    desc: "text-sm",
    gap: "gap-5",
  },
} as const;

/**
 * Polished, brand-consistent empty state used across the app.
 * Pairs a light SVG illustration with guidance copy and an optional CTA row.
 *
 * Use the shared illustrations in `@/components/illustrations` for a consistent look.
 */
export const EmptyState = ({
  illustration,
  title,
  description,
  actions,
  className,
  size,
  compact = false,
}: EmptyStateProps) => {
  const resolvedSize = size ?? (compact ? "sm" : "md");
  const s = sizeStyles[resolvedSize];

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-muted/20 text-center animate-fade-in",
        s.wrap,
        className,
      )}
    >
      <div className={cn("mx-auto flex flex-col items-center", s.gap)}>
        <div
          className={cn(
            "flex items-center justify-center text-muted-foreground/70",
            s.art,
          )}
          aria-hidden
        >
          {illustration}
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className={cn("font-heading font-semibold text-foreground", s.title)}>
            {title}
          </h3>
          {description && (
            <p className={cn("leading-relaxed text-muted-foreground", s.desc)}>
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
