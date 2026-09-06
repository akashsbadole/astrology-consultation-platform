'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function KundliDetailPage() {
  const { id } = useParams<{ id: string }>();

  const kundli = useQuery({
    queryKey: ['kundli', id],
    queryFn: () => api.getKundli(id),
  });

  const dosha = useQuery({
    queryKey: ['kundli-dosha', id],
    queryFn: () => api.getKundliDosha(id),
  });

  if (kundli.isLoading) {
    return (
      <div className="min-h-screen bg-midnight-deep p-6 space-y-4">
        <div className="h-20 bg-midnight rounded-panel animate-pulse" />
        <div className="h-64 bg-midnight rounded-panel animate-pulse" />
      </div>
    );
  }

  if (kundli.error || !kundli.data) {
    return (
      <div className="min-h-screen bg-midnight-deep p-6">
        <p className="text-error">Failed to load kundli.</p>
      </div>
    );
  }

  const k = kundli.data;
  const chart = k.chart as Record<string, any>;
  const planets = (chart.planets ?? []) as { name: string; sign: string; degree: string; house: number }[];
  const ascendant = chart.ascendant as { sign: string; degree: string } | undefined;
  const houses = chart.houses as Record<string, string> | undefined;
  const nakshatra = chart.nakshatra as Record<string, string> | undefined;
  const dasha = chart.dasha as { planet: string; start: string; end: string }[] | undefined;

  return (
    <div className="min-h-screen bg-midnight-deep p-6 space-y-6">
      {/* Summary */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-6">
        <h1 className="text-2xl font-display text-parchment mb-2">{k.label || 'Birth Chart'}</h1>
        <p className="text-mist">{k.birth_date} at {k.birth_time}</p>
        <p className="text-mist">Lat: {k.latitude}, Lon: {k.longitude}</p>
      </div>

      {/* Planetary Positions */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-6">
        <h2 className="text-xl font-display text-brass mb-4">Planetary Positions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mist-faint">
                <th className="text-left text-mist py-2">Planet</th>
                <th className="text-left text-mist py-2">Sign</th>
                <th className="text-left text-mist py-2">Degree</th>
                <th className="text-left text-mist py-2">House</th>
              </tr>
            </thead>
            <tbody>
              {planets.map((p, i) => (
                <tr key={i} className="border-b border-mist-faint/30">
                  <td className="text-parchment py-2 font-medium">{p.name}</td>
                  <td className="text-parchment py-2">{p.sign}</td>
                  <td className="text-parchment py-2">{p.degree}</td>
                  <td className="text-parchment py-2">{p.house}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ascendant & Houses */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-6">
        <h2 className="text-xl font-display text-brass mb-4">Ascendant & Houses</h2>
        {ascendant && (
          <div className="mb-4">
            <p className="text-mist text-xs uppercase">Ascendant (Lagna)</p>
            <p className="text-parchment text-lg">{ascendant.sign} {ascendant.degree}</p>
          </div>
        )}
        {houses && (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(houses).map(([num, sign]) => (
              <div key={num} className="bg-midnight-deep rounded-lg p-3 text-center">
                <p className="text-mist text-xs">House {num}</p>
                <p className="text-parchment">{sign}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nakshatra */}
      {nakshatra && (
        <div className="rounded-panel bg-midnight border border-mist-faint p-6">
          <h2 className="text-xl font-display text-brass mb-4">Nakshatra</h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(nakshatra).map(([key, val]) => (
              <div key={key} className="bg-midnight-deep rounded-lg p-3">
                <p className="text-mist text-xs uppercase">{key}</p>
                <p className="text-parchment">{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Dasha */}
      {dasha && dasha.length > 0 && (
        <div className="rounded-panel bg-midnight border border-mist-faint p-6">
          <h2 className="text-xl font-display text-brass mb-4">Vimshottari Dasha</h2>
          <div className="space-y-2">
            {dasha.slice(0, 5).map((d, i) => (
              <div key={i} className="flex items-center justify-between bg-midnight-deep rounded-lg p-3">
                <span className="text-parchment font-medium">{d.planet}</span>
                <span className="text-mist text-sm">{d.start} — {d.end}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dosha */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-6">
        <h2 className="text-xl font-display text-brass mb-4">Dosha Analysis</h2>
        {dosha.isLoading ? (
          <div className="h-24 bg-midnight-deep rounded-lg animate-pulse" />
        ) : dosha.error ? (
          <p className="text-error text-sm">Failed to load dosha data.</p>
        ) : (
          <div className="space-y-3">
            {(Object.entries(dosha.data ?? {}) as [string, any][]).map(([key, val]) => (
              <div key={key} className="bg-midnight-deep rounded-lg p-4">
                <p className="text-mist text-xs uppercase tracking-wider mb-1">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="text-parchment">
                  {typeof val === 'boolean' ? (val ? 'Present' : 'Not present') : String(val)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match Link */}
      <Link
        href={`/kundli/match?id=${id}`}
        className="block text-center bg-brass text-midnight-deep py-3 rounded-lg font-semibold hover:bg-brass-dim transition-colors"
      >
        Match this chart
      </Link>
    </div>
  );
}
