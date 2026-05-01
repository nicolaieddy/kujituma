import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  illustration: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
  /** When true, uses a slimmer compact layout (good for in-card empties like charts). */
  compact?: boolean;
}

/**
 * Polished, brand-consistent empty state used across Training, Goals, Analytics, etc.
 * Pairs a light SVG illustration with guidance copy and a primary CTA.
 */
export const EmptyState = ({
  illustration,
  title,
  description,
  actions,
  className,
  compact = false,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-muted/20 text-center animate-fade-in",
        compact ? "px-4 py-6" : "px-6 py-10",
        className,
      )}
    >
      <div className="mx-auto flex flex-col items-center gap-4">
        <div
          className={cn(
            "flex items-center justify-center text-muted-foreground/70",
            compact ? "h-16 w-24" : "h-20 w-32",
          )}
          aria-hidden
        >
          {illustration}
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className="font-heading text-base font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {actions && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
