'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ConsultationOut } from '@/lib/types';

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

const modeBadge: Record<string, string> = {
  chat: 'bg-blue-900 text-blue-300',
  audio: 'bg-purple-900 text-purple-300',
  video: 'bg-orange-900 text-orange-300',
};

const statusBadge: Record<string, string> = {
  matching: 'bg-yellow-900 text-yellow-300',
  active: 'bg-green-900 text-green-300',
  ended: 'bg-gray-700 text-gray-300',
  expired: 'bg-red-900 text-red-300',
};

export default function ConsultationsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['consultations'],
    queryFn: async () => {
      const res = await fetch('/api/consultations', { credentials: 'include' });
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-midnight-deep p-6 space-y-6">
      <h1 className="text-3xl font-display text-parchment">Consultation History</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 bg-midnight rounded-panel animate-pulse" />)}
        </div>
      ) : error ? (
        <p className="text-error text-sm">Failed to load consultations.</p>
      ) : (
        <div className="space-y-3">
          {(data?.items ?? []).map((c: ConsultationOut & { astrologer_name?: string }) => (
            <Link
              key={c.id}
              href={`/consultations/${c.id}`}
              className="flex items-center justify-between rounded-panel bg-midnight border border-mist-faint p-4 hover:border-brass transition-colors"
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-parchment font-medium">{c.astrologer_name ?? 'Astrologer'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${modeBadge[c.mode] ?? ''}`}>
                      {c.mode}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusBadge[c.status] ?? ''}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-parchment font-medium">{formatPaise(c.total_billed_paise)}</p>
              </div>
            </Link>
          ))}
          {(data?.items ?? []).length === 0 && (
            <div className="text-center py-12">
              <p className="text-mist">No consultations yet.</p>
              <Link href="/astrologers" className="text-brass hover:underline mt-2 inline-block">
                Find an astrologer
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
