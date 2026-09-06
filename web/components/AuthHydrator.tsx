'use client';

import { useEffect } from 'react';
import { api, refreshSession } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export function AuthHydrator({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const ok = await refreshSession();
      if (cancelled) return;
      if (ok) {
        try {
          const user = await api.me();
          if (!cancelled) setUser(user);
        } catch {
          if (!cancelled) setUser(null);
        }
      } else {
        if (!cancelled) setUser(null);
      }
    }

    hydrate();
    return () => { cancelled = true; };
  }, [setUser]);

  return <>{children}</>;
}
