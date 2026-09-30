import { supabase } from '../../lib/supabase';
import type { PublicProfile, Tables } from '../../types/database';

// ─── Types ────────────────────────────────────────────────────────────────────
export type CoHostStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type RevenueShareType = 'PERCENTAGE' | 'FIXED_PER_BOOKING' | 'FIXED_MONTHLY';

export interface CoHostPermissions {
  calendar: boolean;
  reservations: boolean;
  messages: boolean;
  pricing: boolean;
  revenue_view: boolean;
  reviews: boolean;
  guest_info: boolean;
}

export interface CoHost {
  received: boolean;
  id: string;
  coHostId: string;
  coHostName: string;
  coHostAvatar: string | null;
  coHostEmail: string;
  listingIds: string[];
  listingTitles: string[];
  status: CoHostStatus;
  permissions: CoHostPermissions;
  revenueShareType: RevenueShareType;
  revenueShareValue: number;
  startDate: string | null;
  contractUrl: string | null;
  probationEnd: string | null;
}

export interface CoHostCandidate {
  id: string;
  name: string;
  avatar: string | null;
  city: string;
  languages: string[];
  avgRating: number | null;
  completedCoHostings: number;
  availableNow: boolean;
  bio: string | null;
}

export interface InviteCoHostPayload {
  email: string;
  listingIds: string[];
  permissions: CoHostPermissions;
  revenueShareType: RevenueShareType;
  revenueShareValue: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
};

const toCoHost = (row: Tables<'co_hosts'> & { received?: boolean; co_host?: Pick<PublicProfile, 'full_name' | 'avatar_url'>; listing_titles?: string[] }): CoHost => ({
  received: Boolean(row.received),
  id: row.id,
  coHostId: row.co_host_id,
  coHostName: row.co_host?.full_name ?? '',
  coHostAvatar: row.co_host?.avatar_url ?? null,
  coHostEmail: '',
  listingIds: Array.isArray(row.listing_ids) ? row.listing_ids : [],
  listingTitles: row.listing_titles ?? [],
  status: row.status as CoHostStatus,
  permissions: row.permissions as CoHostPermissions,
  revenueShareType: row.revenue_share_type as RevenueShareType,
  revenueShareValue: row.revenue_share_value ?? 0,
  startDate: row.start_date ?? null,
  contractUrl: row.contract_url ?? null,
  probationEnd: row.probation_end ?? null,
});

// ─── Service ──────────────────────────────────────────────────────────────────
export const cohostService = {
  getCoHosts: async (): Promise<CoHost[]> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('co_hosts').select('*')
      .or(`host_id.eq.${userId},co_host_id.eq.${userId}`).neq('status', 'TERMINATED').order('created_at', { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    const ids = [...new Set(rows.map(row => row.host_id === userId ? row.co_host_id : row.host_id))];
    const { data: profiles, error: profileError } = ids.length ? await supabase.from('public_profiles').select('*').in('id', ids) : { data: [], error: null };
    if (profileError) throw profileError;
    return rows.map(row => toCoHost({ ...row, received: row.co_host_id === userId,
      co_host: profiles?.find(p => p.id === (row.host_id === userId ? row.co_host_id : row.host_id)),
      listing_titles: row.listing_ids.map(id => id.slice(0, 8)),
    }));
  },
  invite: async (payload: InviteCoHostPayload): Promise<void> => {
    const { error } = await supabase.rpc('invite_cohost', {
      p_email: payload.email, p_listing_ids: payload.listingIds, p_permissions: { ...payload.permissions },
      p_revenue_share_type: payload.revenueShareType, p_revenue_share_value: payload.revenueShareValue,
    });
    if (error) throw error;
  },
  updatePermissions: async (id: string, permissions: Partial<CoHostPermissions>): Promise<void> => {
    const { data: current, error: fetchError } = await supabase.from('co_hosts').select('permissions').eq('id', id).single();
    if (fetchError) throw fetchError;
    const merged = { ...current.permissions, ...permissions };
    const { error } = await supabase.rpc('set_cohost_permissions', { p_cohost_id: id, p_permissions: merged });
    if (error) throw error;
  },
  terminate: async (id: string): Promise<void> => {
    const { error } = await supabase.rpc('terminate_cohost', { p_cohost_id: id });
    if (error) throw error;
  },
  respond: async (id: string, accept: boolean): Promise<void> => {
    const { error } = await supabase.rpc('respond_cohost_invitation', { p_cohost_id: id, p_accept: accept });
    if (error) throw error;
  },
  getOwnedListings: async (): Promise<{id: string; title: string}[]> => {
    const id = await getCurrentUserId();
    const { data, error } = await supabase.from('properties').select('id,title').eq('owner_id', id);
    if (error) throw error;
    return data ?? [];
  },
  getMarketplace: async (_city?: string): Promise<CoHostCandidate[]> => {
    throw new Error('L’annuaire de co-hôtes est indisponible. Invitez un compte connu par email.');
  },
};
