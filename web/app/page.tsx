'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CelestialMotif } from '@/components/CelestialMotif';
import { useAuthStore } from '@/lib/store';

export default function HomePage() {
  const { user, hydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'admin') {
      router.replace('/admin-panel');
    } else if (user.role === 'astrologer') {
      router.replace('/astrologer-panel');
    } else {
      router.replace('/dashboard');
    }
  }, [user, hydrated, router]);

  if (!hydrated || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-midnight to-midnight-deep">
        <div className="text-center">
          <CelestialMotif />
          <p className="mt-4 text-mist">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-midnight to-midnight-deep px-6">
      <div className="text-center">
        <CelestialMotif />
        <h1 className="mt-6 font-display text-3xl font-semibold text-parchment">
          Welcome, {user.full_name || user.email}
        </h1>
        <p className="mt-2 text-mist">Redirecting to your dashboard...</p>
      </div>
    </main>
  );
}
