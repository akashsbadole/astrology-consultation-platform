import { create } from 'zustand';
import type { UserPublic } from '../lib/api';

type AuthState = {
  user: UserPublic | null;
  hydrated: boolean;
  setUser: (user: UserPublic | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user, hydrated: true }),
  logout: () => set({ user: null }),
}));

export function isAdmin(user: UserPublic | null): boolean {
  return user?.role === 'admin';
}

export function isAstrologer(user: UserPublic | null): boolean {
  return user?.role === 'astrologer';
}

export function isCustomer(user: UserPublic | null): boolean {
  return user?.role === 'customer';
}
