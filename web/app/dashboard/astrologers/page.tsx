'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

const specializations = ['Vedic', 'Numerology', 'Vastu', 'Tarot', 'KP', 'Nadi'];
const languages = ['Hindi', 'English', 'Tamil', 'Telugu', 'Bengali', 'Marathi'];

export default function AstrologerListPage() {
  const [specialization, setSpecialization] = useState('');
  const [language, setLanguage] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['astrologers', specialization, language, onlineOnly, page],
    queryFn: () => api.listAstrologers({ specialization, language, online_only: onlineOnly, page }),
  });

  return (
    <div className="min-h-screen bg-midnight-deep p-6 space-y-6">
      <h1 className="text-3xl font-display text-parchment">Find an Astrologer</h1>

      {/* Filters */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-mist text-xs uppercase tracking-wider block mb-1">Specialization</label>
          <select
            value={specialization}
            onChange={(e) => { setSpecialization(e.target.value); setPage(1); }}
            className="bg-midnight-deep border border-mist-faint rounded-lg px-3 py-2 text-parchment text-sm"
          >
            <option value="">All</option>
            {specializations.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-mist text-xs uppercase tracking-wider block mb-1">Language</label>
          <select
            value={language}
            onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
            className="bg-midnight-deep border border-mist-faint rounded-lg px-3 py-2 text-parchment text-sm"
          >
            <option value="">All</option>
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={onlineOnly}
            onChange={(e) => { setOnlineOnly(e.target.checked); setPage(1); }}
            className="accent-brass w-4 h-4"
          />
          <span className="text-parchment text-sm">Online now</span>
        </label>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-midnight rounded-panel animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-error text-sm">Failed to load astrologers.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.items ?? []).map((a) => (
              <Link
                key={a.id}
                href={`/astrologers/${a.id}`}
                className="rounded-panel bg-midnight border border-mist-faint p-5 hover:border-brass transition-colors block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-parchment font-semibold text-lg">{a.full_name ?? 'Astrologer'}</h3>
                    <p className="text-mist text-sm">{a.experience_years} yrs experience</p>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${a.is_online ? 'bg-green-400' : 'bg-gray-500'}`} />
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={s <= Math.round(a.avg_rating) ? 'text-brass' : 'text-mist-faint'}>
                      ★
                    </span>
                  ))}
                  <span className="text-mist text-xs ml-1">({a.rating_count})</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {a.specializations.map((s) => (
                    <span key={s} className="text-xs bg-midnight-deep text-brass border border-brass/30 rounded-full px-2 py-0.5">
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-parchment font-medium">{formatPaise(a.rate_per_minute_paise)}/min</p>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    p === page ? 'bg-brass text-midnight-deep' : 'bg-midnight border border-mist-faint text-parchment'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
