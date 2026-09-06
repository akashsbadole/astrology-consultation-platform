'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import type { Role } from '@/lib/types';

const customerLinks = [
  { href: '/dashboard', label: 'Home' },
  { href: '/dashboard/astrologers', label: 'Astrologers' },
  { href: '/dashboard/kundli', label: 'Kundli' },
  { href: '/dashboard/kundli/match', label: 'Matching' },
  { href: '/dashboard/wallet', label: 'Wallet' },
  { href: '/dashboard/consultations', label: 'Consultations' },
  { href: '/dashboard/store', label: 'Store' },
  { href: '/dashboard/horoscope', label: 'Horoscope' },
];

const astrologerLinks = [
  { href: '/astrologer-panel', label: 'Dashboard' },
  { href: '/astrologer-panel/consultations', label: 'Consultations' },
  { href: '/astrologer-panel/earnings', label: 'Earnings' },
];

const adminLinks = [
  { href: '/admin-panel', label: 'Dashboard' },
  { href: '/admin-panel/astrologers', label: 'Astrologers' },
  { href: '/admin-panel/revenue', label: 'Revenue' },
  { href: '/admin-panel/users', label: 'Users' },
];

const roleLogoutPath: Record<Role, string> = {
  customer: '/login',
  astrologer: '/astrologer/login',
  admin: '/admin/login',
};

const roleBrand: Record<Role, string> = {
  customer: 'AstroConnect',
  astrologer: 'AstroGuru',
  admin: 'Admin Panel',
};

export function AppShell({ children, role }: { children: React.ReactNode; role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const links = role === 'customer' ? customerLinks : role === 'astrologer' ? astrologerLinks : adminLinks;

  async function handleLogout() {
    await api.logout();
    logout();
    router.push(roleLogoutPath[role]);
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-midnight to-midnight-deep">
      <aside className="hidden w-64 shrink-0 border-r border-brass/20 bg-ink/50 md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-brass/20 px-6">
          <Link href="/" className="font-display text-lg font-semibold text-brass">
            {roleBrand[role]}
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {links.map((link) => {
            const active = link.href === '/dashboard' || link.href === '/astrologer-panel' || link.href === '/admin-panel'
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brass/15 text-brass'
                    : 'text-mist hover:bg-brass/10 hover:text-parchment'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-brass/20 px-3 py-4">
          <p className="truncate px-3 text-xs text-mist">{user?.full_name || user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-mist hover:bg-brass/10 hover:text-parchment"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
