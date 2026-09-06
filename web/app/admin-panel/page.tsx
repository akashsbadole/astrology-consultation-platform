'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export default function AdminDashboardPage() {
  const { data: revenue, isLoading } = useQuery({
    queryKey: ['admin', 'revenue'],
    queryFn: () => api.adminGetRevenue(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-brass/30 border-t-brass" />
      </div>
    );
  }

  const r = revenue as Record<string, unknown> | undefined;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-semibold text-parchment">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-panel border border-brass/25 bg-parchment p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Total Consultations</p>
          <p className="mt-2 text-3xl font-bold text-midnight">{(r?.total_consultations as number) ?? 0}</p>
        </div>
        <div className="rounded-panel border border-brass/25 bg-parchment p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Total Billed</p>
          <p className="mt-2 text-3xl font-bold text-midnight">
            ₹{(((r?.total_billed_paise as number) ?? 0) / 100).toFixed(0)}
          </p>
        </div>
        <div className="rounded-panel border border-brass/25 bg-parchment p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Commission Collected</p>
          <p className="mt-2 text-3xl font-bold text-midnight">
            ₹{(((r?.total_commission_paise as number) ?? 0) / 100).toFixed(0)}
          </p>
        </div>
      </div>

      <div className="rounded-panel border border-brass/25 bg-parchment p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brass-dim">Revenue Summary</h2>
        {r ? (
          <div className="space-y-3">
            {Object.entries(r).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between border-b border-brass/10 pb-2 last:border-0">
                <span className="text-sm text-ink/70">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm font-semibold text-midnight">
                  {typeof val === 'number' ? val.toLocaleString() : String(val ?? '—')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink/60">No data available.</p>
        )}
      </div>
    </div>
  );
}
