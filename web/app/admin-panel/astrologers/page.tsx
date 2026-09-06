'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api } from '@/lib/api';
import type { AstrologerPublic } from '@/lib/types';

export default function AdminAstrologersPage() {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);

  const { data: astrologers, isLoading, error } = useQuery({
    queryKey: ['admin', 'astrologers', 'pending'],
    queryFn: () => api.adminListPendingAstrologers(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.adminApproveAstrologer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'astrologers', 'pending'] });
      setConfirmAction(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.adminRejectAstrologer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'astrologers', 'pending'] });
      setConfirmAction(null);
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
        <p className="text-sm text-error">Failed to load astrologers. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-semibold text-parchment">Astrologer Approvals</h1>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/80 backdrop-blur-sm">
          <div className="rounded-panel border border-brass/30 bg-parchment p-8 text-center shadow-xl">
            <p className="text-lg font-semibold text-midnight">
              {confirmAction.action === 'approve' ? 'Approve this astrologer?' : 'Reject this astrologer?'}
            </p>
            <p className="mt-2 text-sm text-ink/60">This action cannot be undone.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-lg px-4 py-2 text-sm text-ink/60 hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.action === 'approve') {
                    approveMutation.mutate(confirmAction.id);
                  } else {
                    rejectMutation.mutate(confirmAction.id);
                  }
                }}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className={`rounded-lg px-5 py-2 text-sm font-semibold text-midnight transition-opacity ${
                  confirmAction.action === 'approve'
                    ? 'bg-gradient-to-br from-brass to-[#B08A44] hover:opacity-90'
                    : 'bg-error text-parchment hover:opacity-90'
                }`}
              >
                {approveMutation.isPending || rejectMutation.isPending ? 'Processing...' : confirmAction.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {astrologers && astrologers.length > 0 ? (
        <div className="space-y-4">
          {astrologers.map((a: AstrologerPublic) => (
            <div
              key={a.id}
              className="rounded-panel border border-brass/25 bg-parchment p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-midnight">{a.full_name || 'Unnamed'}</p>
                  <p className="mt-1 text-sm text-ink/60">Status: {a.status}</p>
                  {a.bio && <p className="mt-1 text-sm text-ink/70">{a.bio}</p>}
                  <p className="mt-1 text-xs text-ink/50">{a.experience_years} years experience</p>
                  {a.specializations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {a.specializations.map((s) => (
                        <span key={s} className="rounded-full bg-brass/15 px-2.5 py-0.5 text-xs font-medium text-brass-dim">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setConfirmAction({ id: a.id, action: 'reject' })}
                    className="rounded-lg border border-error/30 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/10"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setConfirmAction({ id: a.id, action: 'approve' })}
                    className="rounded-lg bg-gradient-to-br from-brass to-[#B08A44] px-3 py-1.5 text-xs font-bold text-midnight hover:opacity-90"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-panel border border-brass/25 bg-parchment p-8 text-center">
          <p className="text-sm text-ink/60">No pending astrologers.</p>
        </div>
      )}
    </div>
  );
}
