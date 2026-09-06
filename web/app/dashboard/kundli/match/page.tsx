'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MatchResult } from '@/lib/types';

function KundliMatchContent() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('id') ?? '';

  const [chartA, setChartA] = useState(preselected);
  const [chartB, setChartB] = useState('');

  const myCharts = useQuery({
    queryKey: ['kundlis'],
    queryFn: () => api.getMyKundlis(),
  });

  useEffect(() => {
    if (preselected) setChartA(preselected);
  }, [preselected]);

  const match = useMutation({
    mutationFn: () => api.matchKundlis(chartA, chartB),
  });

  const charts = myCharts.data ?? [];
  const result = match.data as MatchResult | undefined;

  function getScoreColor(score: number, max: number) {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'text-green-400';
    if (pct >= 50) return 'text-yellow-400';
    return 'text-error';
  }

  function getBarColor(score: number, max: number) {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'bg-green-400';
    if (pct >= 50) return 'bg-yellow-400';
    return 'bg-error';
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display text-parchment">Kundli Matching</h1>

      <div className="rounded-panel bg-midnight border border-mist-faint p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-mist text-xs uppercase tracking-wider block mb-1">Chart A</label>
            <select
              value={chartA}
              onChange={(e) => setChartA(e.target.value)}
              className="w-full bg-midnight-deep border border-mist-faint rounded-lg px-3 py-2 text-parchment text-sm"
            >
              <option value="">Select chart</option>
              {charts.map((c) => (
                <option key={c.id} value={c.id}>{c.label || c.birth_date}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-mist text-xs uppercase tracking-wider block mb-1">Chart B</label>
            <select
              value={chartB}
              onChange={(e) => setChartB(e.target.value)}
              className="w-full bg-midnight-deep border border-mist-faint rounded-lg px-3 py-2 text-parchment text-sm"
            >
              <option value="">Select chart</option>
              {charts.map((c) => (
                <option key={c.id} value={c.id}>{c.label || c.birth_date}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => match.mutate()}
          disabled={!chartA || !chartB || match.isPending}
          className="w-full bg-brass text-midnight-deep py-3 rounded-lg font-semibold hover:bg-brass-dim transition-colors disabled:opacity-50"
        >
          {match.isPending ? 'Matching...' : 'Match Charts'}
        </button>
        {match.error && <p className="text-error text-sm">Failed to match charts.</p>}
      </div>

      {result && (
        <div className="rounded-panel bg-midnight border border-mist-faint p-6 space-y-6">
          <div className="text-center">
            <p className="text-mist text-sm uppercase tracking-wider">Total Score</p>
            <p className={`text-5xl font-display ${getScoreColor(result.total_score, result.max_score)}`}>
              {result.total_score}
            </p>
            <p className="text-mist text-sm">out of {result.max_score}</p>
            <p className="text-parchment mt-3">{result.recommendation}</p>
          </div>

          <div className="space-y-4">
            {result.kootas.map((k) => (
              <div key={k.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-parchment text-sm font-medium">{k.name}</span>
                  <span className={`text-sm font-semibold ${getScoreColor(k.score, k.max_score)}`}>
                    {k.score}/{k.max_score}
                  </span>
                </div>
                <div className="w-full h-2 bg-midnight-deep rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getBarColor(k.score, k.max_score)}`}
                    style={{ width: `${(k.score / k.max_score) * 100}%` }}
                  />
                </div>
                <p className="text-mist text-xs mt-1">{k.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KundliMatchPage() {
  return (
    <Suspense fallback={<div className="text-mist p-6">Loading...</div>}>
      <KundliMatchContent />
    </Suspense>
  );
}
