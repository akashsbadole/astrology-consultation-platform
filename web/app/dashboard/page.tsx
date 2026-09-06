'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

const quickActions = [
  { label: 'Consult an Astrologer', href: '/astrologers', icon: '🔮' },
  { label: 'Generate Kundli', href: '/kundli', icon: '⭐' },
  { label: 'My Wallet', href: '/wallet', icon: '💰' },
  { label: 'Kundli Matching', href: '/kundli/match', icon: '💑' },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const panchang = useQuery({
    queryKey: ['panchang', 'today'],
    queryFn: () => api.getPanchang(),
  });

  const consultations = useQuery({
    queryKey: ['consultations', 'recent'],
    queryFn: async () => {
      const res = await fetch('/api/consultations?limit=3', { credentials: 'include' });
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-midnight-deep p-6 space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-8">
        <h1 className="text-3xl font-display text-parchment">
          Welcome back, {user?.full_name ?? 'Guest'}
        </h1>
        <p className="mt-2 text-mist">What would you like to explore today?</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-panel bg-midnight border border-mist-faint p-6 flex flex-col items-center gap-3 hover:border-brass transition-colors"
          >
            <span className="text-4xl">{action.icon}</span>
            <span className="text-parchment text-sm font-medium text-center">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Today's Panchang */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-6">
        <h2 className="text-xl font-display text-brass mb-4">Today&apos;s Panchang</h2>
        {panchang.isLoading ? (
          <div className="h-24 bg-midnight-deep rounded-lg animate-pulse" />
        ) : panchang.error ? (
          <p className="text-error text-sm">Failed to load panchang data.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(panchang.data ?? {}).map(([key, val]) => (
              <div key={key} className="bg-midnight-deep rounded-lg p-4">
                <p className="text-mist text-xs uppercase tracking-wider">{key}</p>
                <p className="text-parchment text-lg mt-1">{String(val)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Consultations */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-6">
        <h2 className="text-xl font-display text-brass mb-4">Recent Consultations</h2>
        {consultations.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-midnight-deep rounded-lg animate-pulse" />
            ))}
          </div>
        ) : consultations.error ? (
          <p className="text-error text-sm">Failed to load consultations.</p>
        ) : (
          <div className="space-y-3">
            {(consultations.data?.items ?? []).slice(0, 3).map((c: any) => (
              <Link
                key={c.id}
                href={`/consultations/${c.id}`}
                className="flex items-center justify-between bg-midnight-deep rounded-lg p-4 hover:border-brass border border-transparent transition-colors"
              >
                <div>
                  <p className="text-parchment font-medium">{c.astrologer_name ?? 'Astrologer'}</p>
                  <p className="text-mist text-sm capitalize">{c.mode}</p>
                </div>
                <div className="text-right">
                  <p className="text-parchment">{formatPaise(c.total_billed_paise ?? 0)}</p>
                  <p className="text-mist text-xs capitalize">{c.status}</p>
                </div>
              </Link>
            ))}
            {(!consultations.data?.items || consultations.data.items.length === 0) && (
              <p className="text-mist text-sm">No consultations yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
