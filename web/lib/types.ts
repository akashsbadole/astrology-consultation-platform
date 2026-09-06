export type Role = 'customer' | 'astrologer' | 'admin';

export type UserPublic = {
  id: string;
  email: string;
  role: Role;
  full_name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
};

export type AstrologerStatus = 'pending' | 'interview' | 'probation' | 'active' | 'suspended' | 'rejected';

export type AstrologerPublic = {
  id: string;
  user_id: string;
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

export type UserListItem = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  created_at: string | null;
};
