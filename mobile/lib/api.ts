import { secureStorage } from './secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

// Explicit, not relying on the backend's default — see backend/app/routers/auth.py
// point 4 for why this matters (it's what tells the backend to return the
// refresh token in the JSON body instead of setting a web cookie).
const PLATFORM_QUERY = 'platform=mobile';

export type Role = 'customer' | 'astrologer' | 'admin';

export type UserPublic = {
  id: string;
  email: string;
  role: Role;
  full_name: string | null;
  avatar_url: string | null;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserPublic;
};

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean; retried?: boolean } = {}
): Promise<T> {
  const { auth, retried, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (auth) {
    const token = await secureStorage.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401 && auth && !retried) {
    // Access token expired — try one silent refresh, then retry the original call once.
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, { ...options, retried: true });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      body?.error?.code ?? body?.detail ?? 'UNKNOWN_ERROR',
      body?.error?.message ?? body?.detail ?? 'Something went wrong. Please try again.'
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = await secureStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      await secureStorage.clear();
      return false;
    }
    const data: TokenPair = await res.json();
    await secureStorage.saveTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  async login(email: string, password: string): Promise<TokenPair> {
    const data = await request<TokenPair>(`/auth/login?${PLATFORM_QUERY}`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await secureStorage.saveTokens(data.access_token, data.refresh_token!);
    return data;
  },

  async register(email: string, password: string, fullName: string, role: Role): Promise<TokenPair> {
    const data = await request<TokenPair>(`/auth/register?${PLATFORM_QUERY}`, {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName, role }),
    });
    await secureStorage.saveTokens(data.access_token, data.refresh_token!);
    return data;
  },

  async loginWithGoogle(idToken: string, role: Role): Promise<TokenPair> {
    const data = await request<TokenPair>(`/auth/google?${PLATFORM_QUERY}`, {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken, role }),
    });
    await secureStorage.saveTokens(data.access_token, data.refresh_token!);
    return data;
  },

  async me(): Promise<UserPublic> {
    return request<UserPublic>('/auth/me', { method: 'GET', auth: true });
  },

  async logout(): Promise<void> {
    const refreshToken = await secureStorage.getRefreshToken();
    if (refreshToken) {
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {
        // Best-effort — clear local tokens regardless of network outcome.
      });
    }
    await secureStorage.clear();
  },
};

export { ApiError };
