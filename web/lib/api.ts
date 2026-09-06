const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

// Explicit, not relying on the backend's default — this is what tells the
// backend to set the refresh token as an httpOnly cookie instead of
// returning it in the JSON body (see backend/app/routers/auth.py point 4).
const PLATFORM_QUERY = 'platform=web';

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
  refresh_token: string | null; // always null on web — it's in the cookie instead
  token_type: string;
  user: UserPublic;
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// The access token lives in memory only (this module-level variable),
// never in localStorage — a page refresh loses it, and callers should
// call refreshSession() on app load to silently re-establish it from the
// httpOnly cookie. This is the deliberate trade-off that keeps an XSS
// payload from being able to read a usable long-lived credential.
let inMemoryAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
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

  if (auth && inMemoryAccessToken) {
    headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include', // sends/receives the httpOnly refresh_token cookie
  });

  if (res.status === 401 && auth && !retried) {
    const refreshed = await refreshSession();
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

export async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // the cookie IS the refresh token — no body needed
    });
    if (!res.ok) {
      setAccessToken(null);
      return false;
    }
    const data: TokenPair = await res.json();
    setAccessToken(data.access_token);
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
    setAccessToken(data.access_token);
    return data;
  },

  async register(email: string, password: string, fullName: string, role: Role): Promise<TokenPair> {
    const data = await request<TokenPair>(`/auth/register?${PLATFORM_QUERY}`, {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName, role }),
    });
    setAccessToken(data.access_token);
    return data;
  },

  async loginWithGoogle(idToken: string, role: Role): Promise<TokenPair> {
    const data = await request<TokenPair>(`/auth/google?${PLATFORM_QUERY}`, {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken, role }),
    });
    setAccessToken(data.access_token);
    return data;
  },

  async me(): Promise<UserPublic> {
    return request<UserPublic>('/auth/me', { method: 'GET', auth: true });
  },

  async logout(): Promise<void> {
    await request('/auth/logout', { method: 'POST' }).catch(() => {
      // Best-effort — clear the in-memory token regardless of network outcome.
    });
    setAccessToken(null);
  },
};
