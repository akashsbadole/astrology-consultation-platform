import type {
  AstrologerPublic,
  ConsultationOut,
  KundliDetail,
  KundliSummary,
  MatchResult,
  OrderOut,
  ProductOut,
  ReviewOut,
  TransactionOut,
  UserListItem,
  UserPublic,
  WalletBalance,
} from './types';
import { clearSessionCookie, setSessionCookie } from './session';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const PLATFORM_QUERY = 'platform=web';

export type Role = 'customer' | 'astrologer' | 'admin';

export type TokenPair = {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  user: UserPublic;
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

let inMemoryAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
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
    credentials: 'include',
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

/**
 * Single-flight refresh: concurrent callers share ONE in-flight refresh call.
 *
 * This matters more than it looks: the backend rotates refresh tokens on every
 * /auth/refresh and treats a re-presented (already-rotated) token as theft —
 * revoking EVERY active token for that user. In dev, React StrictMode
 * double-invokes the AuthHydrator effect, and without this guard two
 * concurrent refreshes fire with the same cookie: the second one trips replay
 * detection, kills the whole session server-side, and the app bounces back to
 * /login right after a successful login.
 */
let refreshInFlight: Promise<boolean> | null = null;

export async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        setAccessToken(null);
        clearSessionCookie();
        return false;
      }
      const data: TokenPair = await res.json();
      setAccessToken(data.access_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export const api = {
  // ─── Auth ────────────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<TokenPair> {
    const data = await request<TokenPair>(`/auth/login?${PLATFORM_QUERY}`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(data.access_token);
    setSessionCookie(data.user);
    return data;
  },

  async register(email: string, password: string, fullName: string, role: Role): Promise<TokenPair> {
    const data = await request<TokenPair>(`/auth/register?${PLATFORM_QUERY}`, {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName, role }),
    });
    setAccessToken(data.access_token);
    setSessionCookie(data.user);
    return data;
  },

  async loginWithGoogle(idToken: string, role: Role): Promise<TokenPair> {
    const data = await request<TokenPair>(`/auth/google?${PLATFORM_QUERY}`, {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken, role }),
    });
    setAccessToken(data.access_token);
    setSessionCookie(data.user);
    return data;
  },

  async sendOtp(phone: string): Promise<{ message: string }> {
    return request<{ message: string }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  async verifyOtp(phone: string, code: string): Promise<TokenPair> {
    const data = await request<TokenPair>(`/auth/otp/verify?${PLATFORM_QUERY}`, {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
    setAccessToken(data.access_token);
    setSessionCookie(data.user);
    return data;
  },

  async me(): Promise<UserPublic> {
    return request<UserPublic>('/auth/me', { method: 'GET', auth: true });
  },

  async logout(): Promise<void> {
    await request('/auth/logout', { method: 'POST' }).catch(() => {});
    setAccessToken(null);
    clearSessionCookie();
  },

  // ─── Astrologers ─────────────────────────────────────────────────────────
  async listAstrologers(params?: {
    specialization?: string;
    language?: string;
    online_only?: boolean;
    page?: number;
  }): Promise<{ items: AstrologerPublic[]; total: number; page: number; pages: number }> {
    // The backend returns a bare array and paginates with limit/offset (no
    // total count), so translate the page-based contract here.
    const page = params?.page ?? 1;
    const perPage = 20; // backend default limit
    const qs = new URLSearchParams();
    if (params?.specialization) qs.set('specialization', params.specialization);
    if (params?.language) qs.set('language', params.language);
    if (params?.online_only) qs.set('online_only', 'true');
    qs.set('limit', String(perPage));
    qs.set('offset', String((page - 1) * perPage));

    const rows = await request<AstrologerPublic[]>(`/astrologers?${qs.toString()}`, { auth: true });
    return {
      items: rows,
      total: rows.length,
      page,
      // Unknown server-side total: a full page implies at least one more.
      pages: page + (rows.length === perPage ? 1 : 0),
    };
  },

  async getAstrologer(id: string): Promise<AstrologerPublic> {
    return request(`/astrologers/${id}`, { auth: true });
  },

  async getAstrologerReviews(id: string, page = 1): Promise<{ items: ReviewOut[]; total: number }> {
    return request(`/astrologers/${id}/reviews?page=${page}`, { auth: true });
  },

  async applyAsAstrologer(data: {
    bio?: string;
    experience_years: number;
    specializations: string[];
    languages: string[];
  }): Promise<AstrologerPublic> {
    return request('/astrologers/apply', { method: 'POST', auth: true, body: JSON.stringify(data) });
  },

  async updateAvailability(is_online: boolean): Promise<void> {
    await request('/astrologers/me/availability', {
      method: 'PATCH',
      auth: true,
      body: JSON.stringify({ is_online }),
    });
  },

  async updateRate(rate_per_minute_paise: number): Promise<void> {
    await request('/astrologers/me/rate', {
      method: 'PATCH',
      auth: true,
      body: JSON.stringify({ rate_per_minute_paise }),
    });
  },

  // ─── Consultations ───────────────────────────────────────────────────────
  async requestConsultation(astrologer_id: string, mode: 'chat' | 'audio' | 'video'): Promise<ConsultationOut> {
    return request('/consultations/request', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ astrologer_id, mode }),
    });
  },

  async acceptConsultation(id: string): Promise<ConsultationOut> {
    return request(`/consultations/${id}/accept`, { method: 'POST', auth: true });
  },

  async endConsultation(id: string): Promise<ConsultationOut> {
    return request(`/consultations/${id}/end`, { method: 'POST', auth: true });
  },

  async getConsultation(id: string): Promise<ConsultationOut> {
    return request(`/consultations/${id}`, { auth: true });
  },

  async listConsultations(page = 1): Promise<{ items: ConsultationOut[]; total: number; pages: number }> {
    return request(`/consultations?page=${page}`, { auth: true });
  },

  // ─── Wallet ──────────────────────────────────────────────────────────────
  async getWalletBalance(): Promise<WalletBalance> {
    return request('/wallet/balance', { auth: true });
  },

  async getWalletTransactions(page = 1): Promise<{ items: TransactionOut[]; total: number }> {
    return request(`/wallet/transactions?page=${page}`, { auth: true });
  },

  async createRechargeOrder(amount_paise: number): Promise<{ order_id: string; amount_paise: number; razorpay_key_id: string }> {
    return request('/wallet/recharge/order', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ amount_paise }),
    });
  },

  // ─── Kundli ──────────────────────────────────────────────────────────────
  async generateKundli(data: {
    label?: string;
    birth_date: string;
    birth_time: string;
    latitude: number;
    longitude: number;
    timezone_offset_hours: number;
  }): Promise<KundliDetail> {
    return request('/kundli/generate', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(data),
    });
  },

  async getMyKundlis(): Promise<KundliSummary[]> {
    return request('/kundli/me', { auth: true });
  },

  async getKundli(id: string): Promise<KundliDetail> {
    return request(`/kundli/${id}`, { auth: true });
  },

  async getKundliDosha(id: string): Promise<Record<string, unknown>> {
    return request(`/kundli/${id}/dosha`, { auth: true });
  },

  async matchKundlis(chart_a_id: string, chart_b_id: string): Promise<MatchResult> {
    return request('/kundli/match', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ chart_a_id, chart_b_id }),
    });
  },

  // ─── Store ───────────────────────────────────────────────────────────────
  async listProducts(category?: string): Promise<ProductOut[]> {
    const qs = category ? `?category=${category}` : '';
    return request(`/store/products${qs}`, { auth: true });
  },

  async getProduct(id: string): Promise<ProductOut> {
    return request(`/store/products/${id}`, { auth: true });
  },

  async checkout(items: { product_id: string; quantity: number }[], payment_method: 'wallet' | 'razorpay'): Promise<OrderOut> {
    return request('/store/checkout', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ items, payment_method }),
    });
  },

  async getMyOrders(): Promise<OrderOut[]> {
    return request('/store/orders', { auth: true });
  },

  // ─── Content ─────────────────────────────────────────────────────────────
  async getPanchang(): Promise<Record<string, unknown>> {
    return request('/panchang/today', { auth: true });
  },

  async getHoroscope(sign: string, period: string): Promise<{ sign: string; period: string; text: string }> {
    return request(`/horoscope/${sign}/${period}`, { auth: true });
  },

  // ─── Admin ───────────────────────────────────────────────────────────────
  async adminListPendingAstrologers(): Promise<AstrologerPublic[]> {
    return request('/admin/astrologers/pending', { auth: true });
  },

  async adminApproveAstrologer(id: string): Promise<AstrologerPublic> {
    return request(`/admin/astrologers/${id}/approve`, { method: 'PATCH', auth: true });
  },

  async adminRejectAstrologer(id: string): Promise<AstrologerPublic> {
    return request(`/admin/astrologers/${id}/reject`, { method: 'PATCH', auth: true });
  },

  async adminGetRevenue(): Promise<Record<string, unknown>> {
    return request('/admin/analytics/revenue', { auth: true });
  },

  async adminListUsers(page = 1): Promise<{ items: UserListItem[]; total: number; pages: number }> {
    return request(`/admin/users?page=${page}`, { auth: true });
  },
};
