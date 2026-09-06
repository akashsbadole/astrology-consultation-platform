'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const zodiacSigns = [
  { key: 'aries', label: 'Aries', emoji: '♈' },
  { key: 'taurus', label: 'Taurus', emoji: '♉' },
  { key: 'gemini', label: 'Gemini', emoji: '♊' },
  { key: 'cancer', label: 'Cancer', emoji: '♋' },
  { key: 'leo', label: 'Leo', emoji: '♌' },
  { key: 'virgo', label: 'Virgo', emoji: '♍' },
  { key: 'libra', label: 'Libra', emoji: '♎' },
  { key: 'scorpio', label: 'Scorpio', emoji: '♏' },
  { key: 'sagittarius', label: 'Sagittarius', emoji: '♐' },
  { key: 'capricorn', label: 'Capricorn', emoji: '♑' },
  { key: 'aquarius', label: 'Aquarius', emoji: '♒' },
  { key: 'pisces', label: 'Pisces', emoji: '♓' },
];

const periods = ['daily', 'weekly', 'monthly', 'yearly'] as const;

export default function HoroscopePage() {
  const [sign, setSign] = useState('aries');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  const horoscope = useQuery({
    queryKey: ['horoscope', sign, period],
    queryFn: () => api.getHoroscope(sign, period),
  });

  return (
    <div className="min-h-screen bg-midnight-deep p-6 space-y-6">
      <h1 className="text-3xl font-display text-parchment">Horoscope</h1>

      {/* Zodiac Sign Selector */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3">
        {zodiacSigns.map((z) => (
          <button
            key={z.key}
            onClick={() => setSign(z.key)}
            className={`flex flex-col items-center gap-1 p-3 rounded-panel transition-colors ${
              sign === z.key
                ? 'bg-brass text-midnight-deep'
                : 'bg-midnight border border-mist-faint text-parchment hover:border-brass'
            }`}
          >
            <span className="text-2xl">{z.emoji}</span>
            <span className="text-xs">{z.label}</span>
          </button>
        ))}
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-full text-sm capitalize transition-colors ${
              period === p
                ? 'bg-brass text-midnight-deep'
                : 'bg-midnight border border-mist-faint text-parchment hover:border-brass'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Horoscope Content */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-6">
        {horoscope.isLoading ? (
          <div className="space-y-3">
            <div className="h-6 bg-midnight-deep rounded w-1/3 animate-pulse" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-midnight-deep rounded w-full animate-pulse" />
            ))}
          </div>
        ) : horoscope.error ? (
          <p className="text-error text-sm">Failed to load horoscope.</p>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{zodiacSigns.find((z) => z.key === sign)?.emoji}</span>
              <div>
                <h2 className="text-xl font-display text-brass capitalize">{sign}</h2>
                <p className="text-mist text-sm capitalize">{period} Horoscope</p>
              </div>
            </div>
            <p className="text-parchment leading-relaxed whitespace-pre-wrap">
              {horoscope.data?.text ?? 'No horoscope available.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
