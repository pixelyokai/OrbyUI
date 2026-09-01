import { memo, useId } from "react";

/** The OrbyUI mark, traced from the Paper design file. */
export const OrbMark = memo(function OrbMark({ size = 24 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  const blur = `blur-${uid}`;
  const clip = `clip-${uid}`;
  const spec = `spec-${uid}`;
  const rim = `rim-${uid}`;
  const edge = `edge-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ flexShrink: 0, display: "block" }}
    >
      <defs>
        <filter id={blur} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5.333" />
        </filter>
        <clipPath id={clip}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
        <radialGradient id={spec} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.56" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={rim} cx="50%" cy="50%" r="50%">
          <stop offset="92%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#fff" stopOpacity="1" />
        </radialGradient>
        <linearGradient id={edge} x1="74%" y1="-42%" x2="-29%" y2="206%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="38%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clip})`}>
        <rect width="24" height="24" fill="#fff" />
        <g filter={`url(#${blur})`}>
          <ellipse cx="2.6" cy="1.67" rx="7.39" ry="16.33" fill="#EDE9FE" />
          <ellipse cx="24.77" cy="7.67" rx="7.39" ry="16.33" fill="#A4F4CF" />
          <circle cx="17.38" cy="14.71" r="11.56" fill="#00D3F2" />
          <circle cx="13.73" cy="27.88" r="11.56" fill="#A3B3FF" />
        </g>
        <ellipse cx="12" cy="11.64" rx="7.6" ry="7.6" fill={`url(#${spec})`} opacity="0.9" />
        <path
          d="M4.3 10.5c1.6-1.6 5.4-1.6 5.4 5.1"
          stroke={`url(#${edge})`}
          strokeWidth="0.55"
          fill="none"
          style={{ mixBlendMode: "overlay" }}
        />
      </g>
      <circle cx="12" cy="12" r="11.7" fill={`url(#${rim})`} />
    </svg>
  );
});

export function Wordmark() {
  return (
    <span className="bg-gradient-to-b from-foreground/70 to-foreground bg-clip-text text-[16px] leading-6 font-semibold text-transparent">
      OrbyUI
    </span>
  );
}
