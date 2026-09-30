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
    const { data, error } = await supabase.rpc('get_or_create_referral_code');
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Code de parrainage indisponible.');
    return { code: row.code, link: row.link ?? '', createdAt: row.created_at };
  },

  redeemCode: async (code: string): Promise<void> => {
    const { error } = await supabase.rpc('redeem_referral_code', { p_code: code });
    if (error) throw error;
  },

  getStats: async (): Promise<ReferralStats> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('referral_entries')
      .select('*')
      .eq('referrer_id', userId)
      .order('started_at', { ascending: false });
    if (error) throw error;
    const entries = Array.isArray(data) ? data : [];
    const nonFinal = ['BONUS_CREDITED', 'EXPIRED', 'FRAUD_DETECTED'];
    return {
      totalReferrals: entries.length,
      qualifiedReferrals: entries.filter(e => e.status === 'BONUS_CREDITED').length,
      pendingReferrals: entries.filter(e => !nonFinal.includes(e.status)).length,
      annualCap: 20,
      annualUsed: entries.filter(e => e.status === 'BONUS_CREDITED' && e.credited_at && new Date(e.credited_at).getFullYear() === new Date().getFullYear()).length,
      entries: entries.map(e => ({
        id: e.id,
        refereeName: e.referee_name ?? '',
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
    const { data, error } = await supabase
      .from('referral_credits')
      .select('*')
      .eq('user_id', userId)
      .eq('used', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const credits = (Array.isArray(data) ? data : []).filter(c => !c.expires_at || new Date(c.expires_at).getTime() > Date.now());
    const balance = credits.reduce((s, c) => s + (c.amount ?? 0), 0);
    const nextExpiry = [...credits].filter(c => c.expires_at).sort((a,b) => a.expires_at!.localeCompare(b.expires_at!))[0];
    return {
      balance,
      currency: 'RWF',
      nextExpiryAmount: nextExpiry?.amount ?? null,
      nextExpiryDate: nextExpiry?.expires_at ?? null,
      history: credits.map(c => ({
        id: c.id,
        amount: c.amount,
        reason: c.reason ?? '',
        date: c.created_at,
        expiresAt: c.expires_at ?? '',
      })),
    };
  },
};
