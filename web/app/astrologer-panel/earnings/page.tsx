'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { TransactionOut } from '@/lib/types';

export default function AstrologerEarningsPage() {
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['wallet', 'transactions'],
    queryFn: async () => {
      const all: TransactionOut[] = [];
      let page = 1;
      while (true) {
        const data = await api.getWalletTransactions(page);
        all.push(...data.items);
        if (page * 20 >= data.total) break;
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
        <p className="text-sm text-error">Failed to load earnings. Please try again.</p>
      </div>
    );
  }

  const payouts = transactions?.filter((t) => t.type === 'astrologer_payout') ?? [];
  const totalPayout = payouts.reduce((sum, t) => sum + t.amount_paise, 0);
  const consultations = transactions?.filter((t) => t.type === 'consultation_debit') ?? [];
  const totalBilled = consultations.reduce((sum, t) => sum + Math.abs(t.amount_paise), 0);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-semibold text-parchment">Earnings</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-panel border border-brass/25 bg-parchment p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Total Billed</p>
          <p className="mt-2 text-3xl font-bold text-midnight">₹{(totalBilled / 100).toFixed(0)}</p>
        </div>
        <div className="rounded-panel border border-brass/25 bg-parchment p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Commission</p>
          <p className="mt-2 text-3xl font-bold text-midnight">₹{((totalBilled * 0.2) / 100).toFixed(0)}</p>
        </div>
        <div className="rounded-panel border border-brass/25 bg-parchment p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Paid Out</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">₹{(totalPayout / 100).toFixed(0)}</p>
        </div>
      </div>

      {payouts.length > 0 ? (
        <div className="rounded-panel border border-brass/25 bg-parchment p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brass-dim">Payout History</h2>
          <div className="divide-y divide-brass/15">
            {payouts.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-midnight">Payout</p>
                  <p className="text-xs text-ink/50">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <p className="text-sm font-bold text-emerald-700">+₹{(t.amount_paise / 100).toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-panel border border-brass/25 bg-parchment p-8 text-center">
          <p className="text-sm text-ink/60">No payouts yet.</p>
        </div>
      )}
    </div>
  );
}
