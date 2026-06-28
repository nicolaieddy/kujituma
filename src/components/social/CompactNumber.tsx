import { formatCompact } from "@/lib/social";

interface Props {
  value: number | null | undefined;
  /** Optional prefix (e.g. "+") applied to both the visible and tooltip text. */
  prefix?: string;
  className?: string;
}

/**
 * Renders an abbreviated number (e.g. "6.23K") with a native browser tooltip
 * (`title`) showing the exact full figure with thousands separators
 * (e.g. "6,234"). For values below 1,000 the compact form already IS the full
 * figure, so no tooltip is set.
 */
export function CompactNumber({ value, prefix = "", className }: Props) {
  if (value == null) return <span className={className}>—</span>;
  const compact = `${prefix}${formatCompact(value)}`;
  const full = `${prefix}${value.toLocaleString()}`;
  const needsTitle = Math.abs(value) >= 1_000;
  return (
    <span className={className} title={needsTitle ? full : undefined}>
      {compact}
    </span>
  );
}
