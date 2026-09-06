'use client';

export function formatPaise(paise: number): string {
  const rupees = Math.abs(paise);
  const formatted = rupees.toLocaleString('en-IN');
  return paise < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

type Props = { paise: number; className?: string };

export function PriceDisplay({ paise, className }: Props) {
  return (
    <span className={className ?? 'font-semibold text-brass'}>
      {formatPaise(paise)}
    </span>
  );
}
