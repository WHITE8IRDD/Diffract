/**
 * Diffract brand mark — the cat artwork inside a white circular badge.
 *
 * Source of truth: `public/brand/diffract-badge.svg` (also the favicon and,
 * via `scripts/generate_icons.py`, the app icons). `compact` is kept for API
 * compatibility with the earlier prism mark and has no effect here.
 */

export interface LogoProps {
  size?: number;
  className?: string;
  compact?: boolean;
}

export function Logo({ size = 24, className }: LogoProps) {
  return (
    <img
      src="/brand/diffract-badge.svg"
      width={size}
      height={size}
      alt="Diffract"
      className={className}
      draggable={false}
      decoding="async"
    />
  );
}
