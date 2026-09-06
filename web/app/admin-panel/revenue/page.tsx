'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export default function AdminRevenuePage() {
  const { data: revenue, isLoading, error } = useQuery({
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

  if (error) {
    return (
      <div className="rounded-panel border border-error/30 bg-parchment p-8 text-center">
        <p className="text-sm text-error">Failed to load revenue data.</p>
      </div>
    );
  }

  const r = revenue as Record<string, number> | undefined;
  const totalBilled = r?.total_billed_paise ?? 0;
  const totalCommission = r?.total_commission_paise ?? 0;
  const totalPaid = r?.total_paid_paise ?? 0;
  const totalConsultations = r?.total_consultations ?? 0;

  const maxVal = Math.max(totalBilled, totalCommission * 5, totalPaid, 1);

  const bars = [
    { label: 'Total Billed', value: totalBilled, color: 'bg-brass' },
    { label: 'Commission', value: totalCommission, color: 'bg-brass/70' },
    { label: 'Paid Out', value: totalPaid, color: 'bg-brass/50' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-semibold text-parchment">Revenue Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-panel border border-brass/25 bg-parchment p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Consultations</p>
          <p className="mt-2 text-3xl font-bold text-midnight">{totalConsultations}</p>
        </div>
        <div className="rounded-panel border border-brass/25 bg-parchment p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Total Billed</p>
          <p className="mt-2 text-3xl font-bold text-midnight">₹{(totalBilled / 100).toFixed(0)}</p>
        </div>
        <div className="rounded-panel border border-brass/25 bg-parchment p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Commission</p>
          <p className="mt-2 text-3xl font-bold text-midnight">₹{(totalCommission / 100).toFixed(0)}</p>
        </div>
        <div className="rounded-panel border border-brass/25 bg-parchment p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Payouts</p>
          <p className="mt-2 text-3xl font-bold text-midnight">₹{(totalPaid / 100).toFixed(0)}</p>
        </div>
      </div>

      <div className="rounded-panel border border-brass/25 bg-parchment p-6">
        <h2 className="mb-6 text-xs font-semibold uppercase tracking-wide text-brass-dim">Revenue Breakdown</h2>
        <div className="space-y-5">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-midnight">{bar.label}</span>
                <span className="text-sm font-bold text-midnight">₹{(bar.value / 100).toFixed(0)}</span>
              </div>
              <div className="h-7 overflow-hidden rounded-lg bg-midnight/10">
                <div
                  className={`h-full rounded-lg ${bar.color} transition-all`}
                  style={{ width: `${Math.max((bar.value / maxVal) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
