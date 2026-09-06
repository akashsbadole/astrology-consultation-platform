'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { api } from '@/lib/api';
import type { ConsultationOut } from '@/lib/types';

export default function AstrologerConsultationsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['consultations', 'astrologer'],
    queryFn: async () => {
      const all: ConsultationOut[] = [];
      let page = 1;
      while (true) {
        const res = await fetch(`/api/consultations?page=${page}`, { credentials: 'include' });
        if (!res.ok) break;
        const data = await res.json();
        all.push(...data.items);
        if (page >= data.pages) break;
        page++;
      }
      return all;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-brass/30 border-t-brass" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-panel border border-error/30 bg-parchment p-8 text-center">
        <p className="text-sm text-error">Failed to load consultations. Please try again.</p>
      </div>
    );
  }

  const active = data?.filter((c) => c.status === 'active') ?? [];
  const past = data?.filter((c) => c.status === 'ended' || c.status === 'expired') ?? [];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-semibold text-parchment">Consultations</h1>

      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-brass">Active</h2>
          {active.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-panel border border-brass/40 bg-parchment p-5"
            >
              <div>
                <p className="text-sm font-semibold text-midnight">Mode: {c.mode}</p>
                <p className="text-xs text-ink/60">{c.total_billed_paise / 100} billed</p>
              </div>
              <Link
                href={`/(astrologer)/consultations/${c.id}`}
                className="rounded-lg bg-gradient-to-br from-brass to-[#B08A44] px-5 py-2 text-sm font-bold text-midnight hover:opacity-90"
              >
                Join
              </Link>
            </div>
          ))}
        </div>
      )}

      {active.length === 0 && (
        <div className="rounded-panel border border-brass/25 bg-parchment p-8 text-center">
          <p className="text-sm text-ink/60">No active consultations.</p>
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Past</h2>
          {past.map((c) => (
            <div
              key={c.id}
              className="rounded-panel border border-brass/20 bg-parchment p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-midnight">{c.mode}</p>
                  <p className="text-xs text-ink/60">{c.status}</p>
                </div>
                <p className="text-sm font-bold text-midnight">
                  +₹{((c.total_billed_paise * 0.8) / 100).toFixed(0)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
