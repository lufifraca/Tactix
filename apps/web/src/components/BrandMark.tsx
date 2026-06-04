import * as React from "react";

/**
 * Tactix "Steel Star" brand mark (from the official brand kit).
 *
 * Navy→silver gradient star with a reticle aperture. Per the brand spec the
 * reticle ring is dropped below ~48px for clarity, so small instances render
 * as a clean solid star. Pass `tile` for the app-icon style (star on a dark
 * rounded tile); default is the flat star for placing on the dark UI.
 */
export function BrandMark({
  size = 32,
  tile = false,
  className,
}: {
  size?: number;
  tile?: boolean;
  className?: string;
}) {
  const showReticle = size >= 48;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tx-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a2e4d" />
          <stop offset=".34" stopColor="#3a567c" />
          <stop offset=".52" stopColor="#9bafce" />
          <stop offset=".64" stopColor="#7991b5" />
          <stop offset=".82" stopColor="#34506f" />
          <stop offset="1" stopColor="#1c3050" />
        </linearGradient>
        {tile && (
          <linearGradient id="tx-tile" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#161a24" />
            <stop offset="1" stopColor="#0b0d13" />
          </linearGradient>
        )}
      </defs>
      {tile && <rect x="2" y="2" width="96" height="96" rx="23.5" fill="url(#tx-tile)" />}
      <path d="M50 36 L75 25 L64 50 L75 75 L50 64 L25 75 L36 50 L25 25 Z" fill="url(#tx-steel)" />
      {showReticle && (
        <>
          <circle cx="50" cy="50" r="8.4" fill="none" stroke="#b8c8e2" strokeWidth="2" opacity=".82" />
          <circle cx="50" cy="50" r="4" fill="#10131b" />
        </>
      )}
    </svg>
  );
}
