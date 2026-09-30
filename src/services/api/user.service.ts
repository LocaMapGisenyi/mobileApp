import { supabase } from '../../lib/supabase';
import * as profileSvc from '../profile.service';
import { User } from '../../types';
import { uploadPhoto } from '../../lib/storage';

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

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error('Connectez-vous pour modifier le mot de passe.');
    const { error: verificationError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (verificationError) throw verificationError;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return { message: 'Mot de passe mis à jour' };
  },

  uploadAvatar: async (formData: FormData): Promise<{ avatarUrl: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Connectez-vous pour changer votre photo.');
    const native = formData as unknown as { _parts?: [string, { uri?: string; type?: string }][] };
    const file = typeof formData.get === 'function' ? formData.get('avatar') ?? formData.get('file') : native._parts?.find(([key]) => key === 'avatar' || key === 'file')?.[1];
    if (!file || typeof file === 'string') throw new Error('Sélectionnez une image.');
    const input = file as { uri?: string; type?: string };
    const temporaryUri = !input.uri && typeof URL.createObjectURL === 'function' && file instanceof Blob ? URL.createObjectURL(file) : null;
    try {
      const uri = input.uri ?? temporaryUri;
      if (!uri) throw new Error('Image illisible.');
      const avatarUrl = await uploadPhoto(uri, input.type || 'image/jpeg', user.id, 'avatars');
      await profileSvc.updateProfile(user.id, { avatar_url: avatarUrl });
      return { avatarUrl };
    } finally { if (temporaryUri) URL.revokeObjectURL(temporaryUri); }
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
    });
    if (preferences.notifications !== undefined) await profileSvc.updateNotificationPrefs(user.id, { push_enabled: preferences.notifications });
    return userService.getCurrentUser();
  },

  getSavedProperties: async (): Promise<string[]> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Connectez-vous pour consulter vos favoris.');
    const { data, error } = await supabase.from('favorites').select('property_id').eq('user_id', user.id);
    if (error) throw error;
    return (data ?? []).map(row => row.property_id);
  },
  saveProperty: async (propertyId: string): Promise<{ message: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Connectez-vous pour enregistrer vos favoris.');
    const { error } = await supabase.from('favorites').upsert({ user_id: user.id, property_id: propertyId }, { onConflict: 'user_id,property_id', ignoreDuplicates: true });
    if (error) throw error;
    return { message: 'Sauvegardé' };
  },
  unsaveProperty: async (propertyId: string): Promise<{ message: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Connectez-vous pour modifier vos favoris.');
    const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('property_id', propertyId);
    if (error) throw error;
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
  alertMatches: boolean;
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
      throw new Error('Connectez-vous pour consulter vos préférences.');
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
          alertMatches: prefs.alert_matches,
        }
      : { reservations: true, messages: true, promotions: false, newsletter: false, pushEnabled: true, emailEnabled: true, smsEnabled: false, alertMatches: true };
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
      alert_matches: patch.alertMatches,
    } as any);
    return hostAccountService.getNotificationPrefs();
  },

  requestDataExport: async (): Promise<AccountExport> => {
    const { data, error } = await supabase.functions.invoke<AccountExport>('account-export', { body: {} });
    if (error) throw error;
    if (!data?.exportedAt || !data.user || !data.data) throw new Error('Export incomplet. Réessayez.');
    return data;
  },

  deleteAccount: async (): Promise<void> => {
    const { data, error } = await supabase.functions.invoke<{ deleted: boolean }>('account-delete', { body: { confirmation: 'DELETE' } });
    if (error) throw error;
    if (!data?.deleted) throw new Error('La suppression du compte n’a pas été confirmée.');
  },
};

export interface AccountExport { exportedAt: string; user: unknown; data: Record<string, unknown> }
export const guestAccountService = {
  async getPaymentPreference() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Connectez-vous pour consulter vos préférences.');
    const { data, error } = await supabase.from('user_payment_preferences').select('*').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async savePaymentPreference(provider: string, accountLabel: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Connectez-vous pour enregistrer vos préférences.');
    const { error } = await supabase.from('user_payment_preferences').upsert({ user_id: user.id, provider, account_label: accountLabel.slice(0, 80) });
    if (error) throw error;
  },
  async deletePaymentPreference() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Connectez-vous pour modifier vos préférences.');
    const { error } = await supabase.from('user_payment_preferences').delete().eq('user_id', user.id);
    if (error) throw error;
  },
};
