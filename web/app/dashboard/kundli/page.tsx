'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function KundliPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    label: '',
    birth_date: '',
    birth_time: '',
    latitude: '',
    longitude: '',
    timezone_offset_hours: '5.5',
  });

  const myCharts = useQuery({
    queryKey: ['kundlis'],
    queryFn: () => api.getMyKundlis(),
  });

  const generate = useMutation({
    mutationFn: () => api.generateKundli({
      label: form.label || undefined,
      birth_date: form.birth_date,
      birth_time: form.birth_time,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      timezone_offset_hours: parseFloat(form.timezone_offset_hours),
    }),
    onSuccess: (kundli) => {
      router.push(`/kundli/${kundli.id}`);
    },
  });

  return (
    <div className="min-h-screen bg-midnight-deep p-6 space-y-8">
      <h1 className="text-3xl font-display text-parchment">Generate Kundli</h1>

      {/* Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); generate.mutate(); }}
        className="rounded-panel bg-midnight border border-mist-faint p-6 space-y-4"
      >
        <div>
          <label className="text-mist text-xs uppercase tracking-wider block mb-1">Label (optional)</label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. My birth chart"
            className="w-full bg-midnight-deep border border-mist-faint rounded-lg px-3 py-2 text-parchment text-sm placeholder:text-mist-faint"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-mist text-xs uppercase tracking-wider block mb-1">Birth Date</label>
            <input
              type="date"
              required
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              className="w-full bg-midnight-deep border border-mist-faint rounded-lg px-3 py-2 text-parchment text-sm"
            />
          </div>
          <div>
            <label className="text-mist text-xs uppercase tracking-wider block mb-1">Birth Time</label>
            <input
              type="time"
              required
              value={form.birth_time}
              onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
              className="w-full bg-midnight-deep border border-mist-faint rounded-lg px-3 py-2 text-parchment text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-mist text-xs uppercase tracking-wider block mb-1">Latitude</label>
            <input
              type="number"
              step="any"
              required
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              placeholder="28.6139"
              className="w-full bg-midnight-deep border border-mist-faint rounded-lg px-3 py-2 text-parchment text-sm placeholder:text-mist-faint"
            />
          </div>
          <div>
            <label className="text-mist text-xs uppercase tracking-wider block mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              required
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              placeholder="77.2090"
              className="w-full bg-midnight-deep border border-mist-faint rounded-lg px-3 py-2 text-parchment text-sm placeholder:text-mist-faint"
            />
          </div>
          <div>
            <label className="text-mist text-xs uppercase tracking-wider block mb-1">Timezone (hrs)</label>
            <input
              type="number"
              step="any"
              required
              value={form.timezone_offset_hours}
              onChange={(e) => setForm({ ...form, timezone_offset_hours: e.target.value })}
              className="w-full bg-midnight-deep border border-mist-faint rounded-lg px-3 py-2 text-parchment text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={generate.isPending}
          className="w-full bg-brass text-midnight-deep py-3 rounded-lg font-semibold hover:bg-brass-dim transition-colors disabled:opacity-50"
        >
          {generate.isPending ? 'Generating...' : 'Generate Kundli'}
        </button>
        {generate.error && <p className="text-error text-sm">Failed to generate kundli.</p>}
      </form>

      {/* Saved Charts */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-6">
        <h2 className="text-xl font-display text-brass mb-4">My Charts</h2>
        {myCharts.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-midnight-deep rounded-lg animate-pulse" />)}
          </div>
        ) : myCharts.error ? (
          <p className="text-error text-sm">Failed to load charts.</p>
        ) : (
          <div className="space-y-3">
            {(myCharts.data ?? []).map((c) => (
              <Link
                key={c.id}
                href={`/kundli/${c.id}`}
                className="flex items-center justify-between bg-midnight-deep rounded-lg p-4 hover:border-brass border border-transparent transition-colors"
              >
                <div>
                  <p className="text-parchment font-medium">{c.label || 'Birth Chart'}</p>
                  <p className="text-mist text-sm">{c.birth_date}</p>
                </div>
                <span className="text-brass text-sm">View →</span>
              </Link>
            ))}
            {(myCharts.data ?? []).length === 0 && (
              <p className="text-mist text-sm">No charts yet. Generate one above!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
