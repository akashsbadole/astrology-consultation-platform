'use client';

import { useEffect, useState } from 'react';

/**
 * Same armillary-sphere line drawing as the mobile app's CelestialMotif —
 * kept visually identical across platforms. Plays one entrance animation
 * on mount via CSS, respecting prefers-reduced-motion.
 */
export function CelestialMotif({ size = 108 }: { size?: number }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 108 108"
      className={reduced ? '' : 'animate-[motif-in_0.9s_ease-out]'}
      style={{ transformOrigin: '54px 54px' }}
    >
      <circle cx="54" cy="54" r="40" stroke="rgba(246,241,231,0.28)" strokeWidth={1} fill="none" />
      <ellipse
        cx="54"
        cy="54"
        rx="40"
        ry="16"
        stroke="#C6A15B"
        strokeWidth={1.4}
        fill="none"
        transform="rotate(-18 54 54)"
      />
      <ellipse
        cx="54"
        cy="54"
        rx="40"
        ry="16"
        stroke="#8C7239"
        strokeWidth={1}
        fill="none"
        transform="rotate(42 54 54)"
      />
      <circle cx="54" cy="54" r="4.5" fill="#C6A15B" />
      <circle cx="86" cy="30" r="1.6" fill="rgba(246,241,231,0.64)" />
      <circle cx="20" cy="72" r="1.6" fill="rgba(246,241,231,0.64)" />
      <circle cx="76" cy="84" r="1.2" fill="rgba(246,241,231,0.64)" />
    </svg>
  );
}
