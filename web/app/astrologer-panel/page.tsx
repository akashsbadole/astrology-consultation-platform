'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { api } from '@/lib/api';

export default function AstrologerDashboardPage() {
  const queryClient = useQueryClient();
  const [editingRate, setEditingRate] = useState(false);
  const [newRate, setNewRate] = useState('');

  const { data: astrologer, isLoading } = useQuery({
    queryKey: ['astrologer', 'me'],
    queryFn: async () => {
      const me = await api.me();
      const list = await api.listAstrologers({ page: 1 });
      const match = list.items.find((a) => a.id === me.id);
      return match ?? null;
    },
  });

  const { data: consultations } = useQuery({
    queryKey: ['consultations'],
    queryFn: async () => {
      const all: { id: string; astrologer_id: string; status: string; mode: string; total_billed_paise: number }[] = [];
      let page = 1;
      while (true) {
        const res = await api.listConsultations(page);
        all.push(...res.items);
        if (page >= res.pages) break;
        page++;
      }
      return all;
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: (isOnline: boolean) => api.updateAvailability(isOnline),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['astrologer', 'me'] }),
  });

  const rateMutation = useMutation({
    mutationFn: (rate: number) => api.updateRate(rate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['astrologer', 'me'] });
      setEditingRate(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-brass/30 border-t-brass" />
      </div>
    );
  }

  const active = consultations?.find((c) => c.status === 'active');
  const totalConsultations = consultations?.length ?? 0;
  const totalEarnings = consultations
    ?.filter((c) => c.status === 'ended')
    .reduce((sum, c) => sum + c.total_billed_paise, 0) ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-semibold text-parchment">Dashboard</h1>

      {active && (
        <Link
          href={`/(astrologer)/consultations/${active.id}`}
          className="block rounded-panel border border-brass/40 bg-parchment p-6 transition-opacity hover:opacity-95"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-brass">Active Consultation</p>
          <p className="mt-2 text-lg font-bold text-midnight">Mode: {active.mode}</p>
          <p className="mt-1 text-sm text-ink">Click to join</p>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-panel border border-brass/25 bg-parchment p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Consultations</p>
          <p className="mt-2 text-3xl font-bold text-midnight">{totalConsultations}</p>
        </div>
        <div className="rounded-panel border border-brass/25 bg-parchment p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Earnings</p>
          <p className="mt-2 text-3xl font-bold text-midnight">₹{(totalEarnings / 100).toFixed(0)}</p>
        </div>
        <div className="rounded-panel border border-brass/25 bg-parchment p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Rating</p>
          <p className="mt-2 text-3xl font-bold text-midnight">
            {astrologer?.avg_rating?.toFixed(1) ?? '—'}
          </p>
          {astrologer && (
            <p className="text-xs text-ink/60">from {astrologer.rating_count} reviews</p>
          )}
        </div>
      </div>

      <div className="rounded-panel border border-brass/25 bg-parchment p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Status</p>
            <p className="mt-1 text-lg font-bold text-midnight">
              {astrologer?.is_online ? 'Online' : 'Offline'}
            </p>
          </div>
          <button
            onClick={() => availabilityMutation.mutate(!astrologer?.is_online)}
            disabled={availabilityMutation.isPending}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
              astrologer?.is_online
                ? 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25'
                : 'bg-brass/15 text-brass-dim hover:bg-brass/25'
            }`}
          >
            {availabilityMutation.isPending ? 'Updating...' : astrologer?.is_online ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      <div className="rounded-panel border border-brass/25 bg-parchment p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brass-dim">Rate</p>
            {editingRate ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="w-28 rounded-lg border border-brass/40 bg-midnight px-3 py-1.5 text-midnight focus:outline-none focus:ring-2 focus:ring-brass/50"
                  placeholder="paise/min"
                />
                <button
                  onClick={() => {
                    const val = parseInt(newRate, 10);
                    if (val > 0) rateMutation.mutate(val);
                  }}
                  className="rounded-lg bg-brass px-3 py-1.5 text-sm font-semibold text-midnight hover:bg-brass/90"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingRate(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-ink/60 hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p className="mt-1 text-lg font-bold text-midnight">
                ₹{(astrologer?.rate_per_minute_paise ?? 0) / 100}/min
              </p>
            )}
          </div>
          {!editingRate && (
            <button
              onClick={() => {
                setNewRate(String(astrologer?.rate_per_minute_paise ?? 0));
                setEditingRate(true);
              }}
              className="rounded-lg bg-brass/15 px-4 py-2 text-sm font-semibold text-brass-dim hover:bg-brass/25"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
