import { supabase } from '../../lib/supabase';

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

const toCoHost = (row: any): CoHost => ({
  id: row.id,
  coHostId: row.co_host_id,
  coHostName: row.co_host?.full_name ?? '',
  coHostAvatar: row.co_host?.avatar_url ?? null,
  coHostEmail: row.co_host?.email ?? '',
  listingIds: Array.isArray(row.listing_ids) ? row.listing_ids : [],
  listingTitles: [],
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
    const { data, error } = await supabase
      .from('co_hosts')
      .select('*, co_host:profiles!co_host_id(full_name, avatar_url, email)')
      .eq('host_id', userId)
      .neq('status', 'TERMINATED')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(toCoHost);
  },

  invite: async (payload: InviteCoHostPayload): Promise<void> => {
    const userId = await getCurrentUserId();
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', payload.email);
    if (profileError) throw profileError;
    const coHostId =
      Array.isArray(profiles) && profiles.length > 0 ? profiles[0].id : null;
    const { error } = await supabase.from('co_hosts').insert({
      host_id: userId,
      co_host_id: coHostId,
      status: 'PENDING',
      permissions: payload.permissions,
      revenue_share_type: payload.revenueShareType,
      revenue_share_value: payload.revenueShareValue,
      listing_ids: payload.listingIds,
    });
    if (error) throw error;
  },

  updatePermissions: async (
    id: string,
    permissions: Partial<CoHostPermissions>,
  ): Promise<void> => {
    const { data: current, error: fetchError } = await supabase
      .from('co_hosts')
      .select('permissions')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    const merged = {
      ...((current?.permissions as CoHostPermissions) ?? {}),
      ...permissions,
    };
    const { error } = await supabase
      .from('co_hosts')
      .update({ permissions: merged, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  terminate: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('co_hosts')
      .update({ status: 'TERMINATED', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  getMarketplace: async (city?: string): Promise<CoHostCandidate[]> => {
    let query = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio, languages')
      .eq('is_host', true)
      .limit(20);
    if (city) query = query.ilike('bio', `%${city}%`);
    const { data, error } = await query;
    if (error) return [];
    return (Array.isArray(data) ? data : []).map(p => ({
      id: p.id,
      name: p.full_name ?? '',
      avatar: p.avatar_url ?? null,
      city: city ?? 'Gisenyi',
      languages: Array.isArray(p.languages) ? p.languages : [],
      avgRating: null,
      completedCoHostings: 0,
      availableNow: true,
      bio: p.bio ?? null,
    }));
  },
};
