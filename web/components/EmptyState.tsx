'use client';

import Link from 'next/link';

type Props = {
  title: string;
  description: string;
  action?: { label: string; href: string };
};

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* Decorative icon placeholder */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-mist-faint/30">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C6A15B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h.01M12 12h.01M16 12h.01" />
        </svg>
      </div>

      <h3 className="mb-2 font-display text-lg font-semibold text-parchment">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-mist">{description}</p>

      {action && (
        <Link
          href={action.href}
          className="rounded-lg bg-brass px-5 py-2.5 text-sm font-bold text-midnight transition-opacity hover:opacity-90"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
