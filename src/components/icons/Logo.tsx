/**
 * Diffract brand mark — a prism splitting a white beam into a spectrum.
 *
 * The same artwork as `public/icon.svg`, inlined as a component so the
 * title bar, About dialog and empty-state all share one source of truth.
 */

export interface LogoProps {
  size?: number;
  className?: string;
  /** Hide the incoming beam / spectrum (small sizes). */
  compact?: boolean;
}

export function Logo({ size = 24, className, compact = false }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="Diffract"
    >
      <defs>
        <linearGradient id="difr-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3d3d4d" />
          <stop offset="0.5" stopColor="#2a2a36" />
          <stop offset="1" stopColor="#1c1c26" />
        </linearGradient>
        <linearGradient id="difr-spectrum-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff4d6d" />
          <stop offset="0.18" stopColor="#ff9e40" />
          <stop offset="0.36" stopColor="#ffe14d" />
          <stop offset="0.54" stopColor="#4dffa3" />
          <stop offset="0.72" stopColor="#4dc9ff" />
          <stop offset="0.88" stopColor="#7a6cff" />
          <stop offset="1" stopColor="#d24dff" />
        </linearGradient>
      </defs>
      {!compact && (
        <path
          d="M2 30 L26 30"
          stroke="#f5f5f5"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      )}
      <path
        d="M32 14 L48 44 L16 44 Z"
        fill="url(#difr-glass)"
        stroke="#5a5a72"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M32 14 L20 44" stroke="#8a8aa8" strokeWidth="1" opacity="0.6" />
      {!compact && (
        <g stroke="url(#difr-spectrum-stroke)" strokeWidth="3.2" strokeLinecap="round">
          <path d="M40 36 L62 22" />
          <path d="M41 38 L62 30" />
          <path d="M42 40 L62 38" />
          <path d="M43 42 L62 46" />
        </g>
      )}
    </svg>
  );
}
