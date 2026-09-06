'use client';

type Props = { rating: number; max?: number };

export function StarRating({ rating, max = 5 }: Props) {
  const clamped = Math.max(0, Math.min(rating, max));

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${clamped} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.min(Math.max(clamped - i, 0), 1);
        const id = `star-fill-${i}`;
        return (
          <svg key={i} width="16" height="16" viewBox="0 0 20 20" className="shrink-0">
            <defs>
              <linearGradient id={id}>
                <stop offset={`${fill * 100}%`} stopColor="#C6A15B" />
                <stop offset={`${fill * 100}%`} stopColor="rgba(246,241,231,0.28)" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.26 5.06 16.7 6 11.21l-4-3.9 5.53-.8L10 1.5z"
              fill={`url(#${id})`}
              stroke="#C6A15B"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </span>
  );
}
