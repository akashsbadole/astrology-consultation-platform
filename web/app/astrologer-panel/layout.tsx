'use client';

import { AppShell } from '@/components/AppShell';

export default function AstrologerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="astrologer">{children}</AppShell>;
}
