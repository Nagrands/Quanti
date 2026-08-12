import { useId } from "react";

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  const gradientId = `quanti-brand-${useId().replaceAll(":", "")}`;
  const depthId = `${gradientId}-depth`;

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="9" y1="7" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4b8cff" />
          <stop offset="0.48" stopColor="#2164d8" />
          <stop offset="1" stopColor="#0b315f" />
        </linearGradient>
        <linearGradient id={depthId} x1="32" y1="2" x2="32" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#061c3b" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14.5" fill={`url(#${gradientId})`} />
      <rect x="2" y="2" width="60" height="60" rx="14.5" fill={`url(#${depthId})`} />
      <circle cx="30" cy="29.5" r="15" fill="none" stroke="#ffffff" strokeWidth="7" />
      <path d="m39.5 39 10.5 10.5" fill="none" stroke={`url(#${gradientId})`} strokeLinecap="round" strokeWidth="9.5" />
      <path d="m39.5 39 10.5 10.5" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="5.25" />
    </svg>
  );
}
