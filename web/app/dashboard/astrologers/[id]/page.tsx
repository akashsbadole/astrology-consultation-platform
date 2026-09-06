'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ConsultationMode } from '@/lib/types';

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export default function AstrologerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mode, setMode] = useState<ConsultationMode>('chat');

  const astrologer = useQuery({
    queryKey: ['astrologer', id],
    queryFn: () => api.getAstrologer(id),
  });

  const reviews = useQuery({
    queryKey: ['astrologer-reviews', id],
    queryFn: () => api.getAstrologerReviews(id),
  });

  const consultMutation = useMutation({
    mutationFn: () => api.requestConsultation(id, mode),
    onSuccess: (consultation) => {
      router.push(`/consultations/${consultation.id}`);
    },
  });

  if (astrologer.isLoading) {
    return (
      <div className="min-h-screen bg-midnight-deep p-6 space-y-4">
        <div className="h-48 bg-midnight rounded-panel animate-pulse" />
        <div className="h-32 bg-midnight rounded-panel animate-pulse" />
      </div>
    );
  }

  if (astrologer.error || !astrologer.data) {
    return (
      <div className="min-h-screen bg-midnight-deep p-6">
        <p className="text-error">Failed to load astrologer details.</p>
      </div>
    );
  }

  const a = astrologer.data;

  return (
    <div className="min-h-screen bg-midnight-deep p-6 space-y-6">
      {/* Profile Card */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display text-parchment">{a.full_name ?? 'Astrologer'}</h1>
            <p className="text-mist text-sm">{a.experience_years} years experience</p>
          </div>
          <span className={`w-3 h-3 rounded-full ${a.is_online ? 'bg-green-400' : 'bg-gray-500'}`} />
        </div>
        {a.bio && <p className="text-mist mb-4">{a.bio}</p>}
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={s <= Math.round(a.avg_rating) ? 'text-brass' : 'text-mist-faint'}>★</span>
          ))}
          <span className="text-mist text-xs ml-1">({a.rating_count} reviews)</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {a.specializations.map((s) => (
            <span key={s} className="text-xs bg-midnight-deep text-brass border border-brass/30 rounded-full px-2 py-0.5">{s}</span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {a.languages.map((l) => (
            <span key={l} className="text-xs bg-midnight-deep text-parchment-dim border border-mist-faint rounded-full px-2 py-0.5">{l}</span>
          ))}
        </div>
        <p className="text-brass text-xl font-semibold">{formatPaise(a.rate_per_minute_paise)}/min</p>
      </div>

      {/* Start Consultation */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-6">
        <h2 className="text-xl font-display text-brass mb-4">Start Consultation</h2>
        <div className="flex gap-3 mb-4">
          {(['chat', 'audio', 'video'] as ConsultationMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                mode === m
                  ? 'bg-brass text-midnight-deep'
                  : 'bg-midnight-deep border border-mist-faint text-parchment hover:border-brass'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={() => consultMutation.mutate()}
          disabled={consultMutation.isPending}
          className="w-full bg-brass text-midnight-deep py-3 rounded-lg font-semibold hover:bg-brass-dim transition-colors disabled:opacity-50"
        >
          {consultMutation.isPending ? 'Connecting...' : `Start ${mode} consultation`}
        </button>
        {consultMutation.error && (
          <p className="text-error text-sm mt-2">Failed to start consultation. Please try again.</p>
        )}
      </div>

      {/* Reviews */}
      <div className="rounded-panel bg-midnight border border-mist-faint p-6">
        <h2 className="text-xl font-display text-brass mb-4">Reviews</h2>
        {reviews.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-midnight-deep rounded-lg animate-pulse" />)}
          </div>
        ) : reviews.error ? (
          <p className="text-error text-sm">Failed to load reviews.</p>
        ) : (
          <div className="space-y-4">
            {(reviews.data?.items ?? []).map((r) => (
              <div key={r.id} className="bg-midnight-deep rounded-lg p-4">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={s <= r.rating ? 'text-brass' : 'text-mist-faint'}>★</span>
                  ))}
                  <span className="text-mist text-xs ml-2">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.comment && <p className="text-mist text-sm mt-1">{r.comment}</p>}
              </div>
            ))}
            {(reviews.data?.items ?? []).length === 0 && (
              <p className="text-mist text-sm">No reviews yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
