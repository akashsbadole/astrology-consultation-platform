'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { UserListItem } from '@/lib/types';

export default function AdminUsersPage() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const all: UserListItem[] = [];
      let page = 1;
      while (true) {
        const data = await api.adminListUsers(page);
        all.push(...data.items);
        if (page >= data.pages) break;
        page++;
      }
      return all;
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
        <p className="text-sm text-error">Failed to load users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-semibold text-parchment">User Management</h1>

      <div className="rounded-panel border border-brass/25 bg-parchment p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-brass-dim">All Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brass/20">
                <th className="pb-2 font-semibold text-midnight">Name</th>
                <th className="pb-2 font-semibold text-midnight">Email</th>
                <th className="pb-2 font-semibold text-midnight">Role</th>
                <th className="pb-2 font-semibold text-midnight">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brass/10">
              {users?.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5 text-midnight">{u.full_name || 'Unnamed'}</td>
                  <td className="py-2.5 text-midnight">{u.email}</td>
                  <td className="py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === 'admin'
                          ? 'bg-brass/15 text-brass-dim'
                          : u.role === 'astrologer'
                            ? 'bg-emerald-500/15 text-emerald-700'
                            : 'bg-midnight/10 text-ink/60'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        u.is_active ? 'bg-emerald-500' : 'bg-error'
                      }`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
