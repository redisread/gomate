import { cn } from "@/lib/utils";

/** Decorative brand mark; the adjacent text or link provides its accessible name. */
export function BrandIcon({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/brand-icon.png?v=5"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={cn("shrink-0", className)}
    />
  );
}
