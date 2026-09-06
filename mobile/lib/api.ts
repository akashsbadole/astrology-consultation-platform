import { secureStorage } from './secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const PLATFORM_QUERY = 'platform=mobile';

export type Role = 'customer' | 'astrologer' | 'admin';

export type UserPublic = {
  id: string;
  email: string;
  role: Role;
  full_name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserPublic;
};

export type AstrologerStatus = 'pending' | 'interview' | 'probation' | 'active' | 'suspended' | 'rejected';

export type AstrologerPublic = {
  id: string;
  full_name: string | null;
  bio: string | null;
  experience_years: number;
  specializations: string[];
  languages: string[];
  rate_per_minute_paise: number;
  is_online: boolean;
  avg_rating: number;
  rating_count: number;
  status: AstrologerStatus;
};

export type ConsultationMode = 'chat' | 'audio' | 'video';
export type ConsultationStatus = 'matching' | 'active' | 'ended' | 'expired';

export type ConsultationOut = {
  id: string;
  astrologer_id: string;
  mode: ConsultationMode;
  status: ConsultationStatus;
  is_free_session: boolean;
  total_billed_paise: number;
  started_at: string | null;
  ended_at: string | null;
};

export type ChatMessage = {
  id: string;
  consultation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

export type TransactionType = 'recharge' | 'consultation_debit' | 'store_purchase' | 'astrologer_payout' | 'referral_bonus' | 'refund';

export type WalletBalance = { balance_paise: number };

export type TransactionOut = {
  id: string;
  amount_paise: number;
  type: TransactionType;
  reference_id: string | null;
  created_at: string;
};

export type KundliSummary = {
  id: string;
  label: string | null;
  birth_date: string;
  created_at: string;
};

export type KundliDetail = {
  id: string;
  label: string | null;
  birth_date: string;
  birth_time: string;
  latitude: number;
  longitude: number;
  chart: Record<string, unknown>;
};

export type ProductCategory = 'gemstone' | 'rudraksha' | 'yantra' | 'puja_service';
export type OrderStatus = 'pending_payment' | 'paid' | 'fulfilled' | 'cancelled';

export type ProductOut = {
  id: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  price_paise: number;
  stock_quantity: number;
  image_url: string | null;
};

export type OrderOut = {
  id: string;
  status: OrderStatus;
  total_paise: number;
  items: Record<string, unknown>[];
};

export type ReviewOut = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type MatchResult = {
  total_score: number;
  max_score: number;
  kootas: {
    name: string;
    score: number;
    max_score: number;
    description: string;
  }[];
  recommendation: string;
};

export class ApiError extends Error {
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
      body?.error?.message ?? body?.detail ?? 'Something went wrong.'
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

export async function refreshSession(): Promise<boolean> {
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
  // ─── Auth ────────────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<TokenPair> {
    const data = await request<TokenPair>(`/auth/login?${PLATFORM_QUERY}`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await secureStorage.saveTokens(data.access_token, data.refresh_token);
    return data;
  },

  async register(email: string, password: string, fullName: string, role: Role): Promise<TokenPair> {
    const data = await request<TokenPair>(`/auth/register?${PLATFORM_QUERY}`, {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName, role }),
    });
    await secureStorage.saveTokens(data.access_token, data.refresh_token);
    return data;
  },

  async loginWithGoogle(idToken: string, role: Role): Promise<TokenPair> {
    const data = await request<TokenPair>(`/auth/google?${PLATFORM_QUERY}`, {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken, role }),
    });
    await secureStorage.saveTokens(data.access_token, data.refresh_token);
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
    await secureStorage.saveTokens(data.access_token, data.refresh_token);
    return data;
  },

  async me(): Promise<UserPublic> {
    return request<UserPublic>('/auth/me', { auth: true });
  },

  async logout(): Promise<void> {
    const refreshToken = await secureStorage.getRefreshToken();
    if (refreshToken) {
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {});
    }
    await secureStorage.clear();
  },

  // ─── Astrologers ─────────────────────────────────────────────────────────
  async listAstrologers(params?: {
    specialization?: string;
    language?: string;
    online_only?: boolean;
    page?: number;
  }): Promise<{ items: AstrologerPublic[]; total: number; page: number; pages: number }> {
    const qs = new URLSearchParams();
    if (params?.specialization) qs.set('specialization', params.specialization);
    if (params?.language) qs.set('language', params.language);
    if (params?.online_only) qs.set('online_only', 'true');
    if (params?.page) qs.set('page', String(params.page));
    const query = qs.toString();
    return request(`/astrologers${query ? `?${query}` : ''}`, { auth: true });
  },

  async getAstrologer(id: string): Promise<AstrologerPublic> {
    return request(`/astrologers/${id}`, { auth: true });
  },

  async getAstrologerReviews(id: string, page = 1): Promise<{ items: ReviewOut[]; total: number }> {
    return request(`/astrologers/${id}/reviews?page=${page}`, { auth: true });
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
  async requestConsultation(astrologer_id: string, mode: ConsultationMode): Promise<ConsultationOut> {
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

  async getConsultationMessages(consultationId: string): Promise<ChatMessage[]> {
    return request(`/consultations/${consultationId}/messages`, { auth: true });
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
};
