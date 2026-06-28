import { supabase } from '../../lib/supabase';
import * as profileSvc from '../profile.service';
import { User } from '../../types';

export const userService = {
  getCurrentUser: async (): Promise<User> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const profile = await profileSvc.getProfile(user.id);
    return {
      id: user.id,
      fullName: profile?.full_name ?? '',
      email: user.email ?? '',
      phoneNumber: profile?.phone_number ?? undefined,
      avatar: profile?.avatar_url ?? undefined,
      notifications: true,
    };
  },

  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const profile = await profileSvc.updateProfile(user.id, {
      full_name: userData.fullName,
      phone_number: userData.phoneNumber ?? null,
      avatar_url: userData.avatar ?? null,
    });
    return {
      id: user.id,
      fullName: profile.full_name,
      email: user.email ?? '',
      phoneNumber: profile.phone_number ?? undefined,
      avatar: profile.avatar_url ?? undefined,
    };
  },

  changePassword: async (_currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { message: 'Mot de passe mis à jour' };
  },

  // Avatar upload requires a server-side signed URL; return empty until wired up
  uploadAvatar: async (_formData: FormData): Promise<{ avatarUrl: string }> => {
    return { avatarUrl: '' };
  },

  updatePreferences: async (preferences: {
    preferredCurrency?: string;
    preferredLanguage?: string;
    notifications?: boolean;
  }): Promise<User> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    await profileSvc.updateProfile(user.id, {
      preferred_currency: preferences.preferredCurrency,
      preferred_language: preferences.preferredLanguage,
    } as any);
    return userService.getCurrentUser();
  },

  getSavedProperties: async (): Promise<string[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
      .from('alerts')
      .select('filters')
      .eq('user_id', user.id)
      .eq('name', 'favorite');
    return Array.isArray(data)
      ? data.map(a => (a.filters as any)?.propertyId).filter(Boolean)
      : [];
  },

  saveProperty: async (propertyId: string): Promise<{ message: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    await supabase
      .from('alerts')
      .insert({ user_id: user.id, name: 'favorite', filters: { propertyId }, frequency: 'instant' });
    return { message: 'Sauvegardé' };
  },

  unsaveProperty: async (propertyId: string): Promise<{ message: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', 'favorite')
      .filter('filters->>propertyId', 'eq', propertyId);
    if (Array.isArray(existing) && existing.length > 0) {
      await supabase.from('alerts').delete().in('id', existing.map(r => r.id));
    }
    return { message: 'Retiré' };
  },
};

// ─── Host account types ───────────────────────────────────────────────────────
export type KycStatus = 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type PayoutType = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'M_PESA' | 'BANK_TRANSFER';

export interface PayoutAccount {
  id: string;
  type: PayoutType;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
  isVerified: boolean;
}

export interface NotificationPrefs {
  reservations: boolean;
  messages: boolean;
  promotions: boolean;
  newsletter: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export interface HostProfileDetail {
  fullName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  languages: string[];
  kycStatus: KycStatus;
  avatarUrl: string | null;
}

// ─── Host account service ─────────────────────────────────────────────────────
export const hostAccountService = {
  getProfile: async (): Promise<HostProfileDetail> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const profile = await profileSvc.getProfile(user.id);
    return {
      fullName: profile?.full_name ?? '',
      email: user.email ?? '',
      phone: profile?.phone_number ?? null,
      bio: profile?.bio ?? null,
      languages: profile?.languages ?? [],
      kycStatus: (profile?.kyc_status as KycStatus) ?? 'NOT_VERIFIED',
      avatarUrl: profile?.avatar_url ?? null,
    };
  },

  updateProfile: async (data: Partial<HostProfileDetail>): Promise<HostProfileDetail> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    await profileSvc.updateProfile(user.id, {
      full_name: data.fullName,
      phone_number: data.phone ?? null,
      bio: data.bio ?? null,
      languages: data.languages,
    } as any);
    return hostAccountService.getProfile();
  },

  getKycStatus: async (): Promise<{ status: KycStatus }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: 'NOT_VERIFIED' };
    const profile = await profileSvc.getProfile(user.id);
    return { status: (profile?.kyc_status as KycStatus) ?? 'NOT_VERIFIED' };
  },

  getPayoutAccounts: async (): Promise<PayoutAccount[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const rows = await profileSvc.getPayoutAccounts(user.id);
    return rows.map(r => ({
      id: r.id,
      type: r.type as PayoutType,
      accountNumber: r.account_number,
      accountName: r.account_name,
      isDefault: r.is_default,
      isVerified: r.is_verified,
    }));
  },

  addPayoutAccount: async (data: Omit<PayoutAccount, 'id' | 'isVerified'>): Promise<PayoutAccount> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const row = await profileSvc.addPayoutAccount(user.id, {
      type: data.type,
      account_number: data.accountNumber,
      account_name: data.accountName,
      is_default: data.isDefault,
    });
    return {
      id: row.id,
      type: row.type as PayoutType,
      accountNumber: row.account_number,
      accountName: row.account_name,
      isDefault: row.is_default,
      isVerified: row.is_verified,
    };
  },

  deletePayoutAccount: async (id: string): Promise<void> => profileSvc.deletePayoutAccount(id),

  getNotificationPrefs: async (): Promise<NotificationPrefs> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { reservations: true, messages: true, promotions: false, newsletter: false, pushEnabled: true, emailEnabled: true, smsEnabled: false };
    }
    const prefs = await profileSvc.getNotificationPrefs(user.id);
    return prefs
      ? {
          reservations: prefs.reservations,
          messages: prefs.messages,
          promotions: prefs.promotions,
          newsletter: prefs.newsletter,
          pushEnabled: prefs.push_enabled,
          emailEnabled: prefs.email_enabled,
          smsEnabled: prefs.sms_enabled,
        }
      : { reservations: true, messages: true, promotions: false, newsletter: false, pushEnabled: true, emailEnabled: true, smsEnabled: false };
  },

  updateNotificationPrefs: async (patch: Partial<NotificationPrefs>): Promise<NotificationPrefs> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    await profileSvc.updateNotificationPrefs(user.id, {
      reservations: patch.reservations,
      messages: patch.messages,
      promotions: patch.promotions,
      newsletter: patch.newsletter,
      push_enabled: patch.pushEnabled,
      email_enabled: patch.emailEnabled,
      sms_enabled: patch.smsEnabled,
    } as any);
    return hostAccountService.getNotificationPrefs();
  },

  requestDataExport: async (): Promise<void> => {
    // No backend endpoint yet — silently succeeds
  },

  deleteAccount: async (): Promise<void> => {
    // Supabase client SDK cannot delete the authenticated user's own account;
    // sign out so the app state is cleared, deletion must be handled server-side.
    await supabase.auth.signOut().catch(() => {});
  },
};
