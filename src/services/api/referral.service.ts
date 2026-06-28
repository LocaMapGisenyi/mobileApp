import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ReferralStatus =
  | 'LINK_CLICKED'
  | 'REGISTERED'
  | 'KYC_DONE'
  | 'LISTING_PUBLISHED'
  | 'FIRST_BOOKING_DONE'
  | 'BONUS_CREDITED'
  | 'EXPIRED'
  | 'FRAUD_DETECTED';

export interface ReferralCode {
  code: string;
  link: string;
  createdAt: string;
}

export interface ReferralEntry {
  id: string;
  refereeName: string;
  status: ReferralStatus;
  startedAt: string;
  creditedAt: string | null;
  bonusAmount: number;
  bonusCurrency: string;
  expiresAt: string;
}

export interface ReferralStats {
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  annualCap: number;
  annualUsed: number;
  entries: ReferralEntry[];
}

export interface ReferralCredits {
  balance: number;
  currency: string;
  nextExpiryAmount: number | null;
  nextExpiryDate: string | null;
  history: {
    id: string;
    amount: number;
    reason: string;
    date: string;
    expiresAt: string;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
};

// ─── Service ──────────────────────────────────────────────────────────────────
export const referralService = {
  getCode: async (): Promise<ReferralCode> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) {
      const code = `LOCA-${userId.substring(0, 6).toUpperCase()}`;
      const link = `https://locamap.rw/invite/${code}`;
      const { data: created, error: createError } = await supabase
        .from('referral_codes')
        .insert({ user_id: userId, code, link })
        .select()
        .single();
      if (createError) throw createError;
      return {
        code: created.code,
        link: created.link,
        createdAt: created.created_at,
      };
    }
    return { code: data.code, link: data.link, createdAt: data.created_at };
  },

  getStats: async (): Promise<ReferralStats> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('referral_entries')
      .select('*')
      .eq('referrer_id', userId)
      .order('started_at', { ascending: false });
    if (error) {
      return {
        totalReferrals: 0,
        qualifiedReferrals: 0,
        pendingReferrals: 0,
        annualCap: 20,
        annualUsed: 0,
        entries: [],
      };
    }
    const entries = Array.isArray(data) ? data : [];
    const nonFinal = ['BONUS_CREDITED', 'EXPIRED', 'FRAUD_DETECTED'];
    return {
      totalReferrals: entries.length,
      qualifiedReferrals: entries.filter(e => e.status === 'BONUS_CREDITED').length,
      pendingReferrals: entries.filter(e => !nonFinal.includes(e.status)).length,
      annualCap: 20,
      annualUsed: entries.filter(e => e.status === 'BONUS_CREDITED').length,
      entries: entries.map(e => ({
        id: e.id,
        refereeName: e.referee_name,
        status: e.status as ReferralStatus,
        startedAt: e.started_at,
        creditedAt: e.credited_at,
        bonusAmount: e.bonus_amount,
        bonusCurrency: e.bonus_currency,
        expiresAt: e.expires_at ?? '',
      })),
    };
  },

  getCredits: async (): Promise<ReferralCredits> => {
    const userId = await getCurrentUserId();
    const { data } = await supabase
      .from('referral_credits')
      .select('*')
      .eq('user_id', userId)
      .eq('used', false)
      .order('created_at', { ascending: false });
    const credits = Array.isArray(data) ? data : [];
    const balance = credits.reduce((s, c) => s + (c.amount ?? 0), 0);
    const nextExpiry = credits.find(c => c.expires_at != null);
    return {
      balance,
      currency: 'RWF',
      nextExpiryAmount: nextExpiry?.amount ?? null,
      nextExpiryDate: nextExpiry?.expires_at ?? null,
      history: credits.map(c => ({
        id: c.id,
        amount: c.amount,
        reason: c.reason,
        date: c.created_at,
        expiresAt: c.expires_at ?? '',
      })),
    };
  },
};
