import { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../lib/store';
import { api, refreshSession } from '../lib/api';
import { useAppFonts } from '../theme/useAppFonts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function AuthGuard() {
  const { user, hydrated, setUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const ok = await refreshSession();
      if (cancelled) return;
      if (ok) {
        try {
          const me = await api.me();
          if (!cancelled) setUser(me);
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

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/(auth)/customer-login');
    } else if (user.role === 'admin') {
      router.replace('/(admin)/dashboard');
    } else if (user.role === 'astrologer') {
      router.replace('/(astrologer)/dashboard');
    } else {
      router.replace('/(dashboard)/home');
    }
  }, [user, hydrated]);

  return null;
}

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <Slot />
    </QueryClientProvider>
  );
}
