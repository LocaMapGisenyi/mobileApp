import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';

export async function getProfile(userId: string): Promise<Tables<'profiles'> | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Tables<'profiles'>, 'id' | 'created_at'>>
): Promise<Tables<'profiles'>> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPayoutAccounts(userId: string): Promise<Tables<'payout_accounts'>[]> {
  const { data, error } = await supabase
    .from('payout_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function addPayoutAccount(
  userId: string,
  account: { type: string; account_number: string; account_name: string; is_default: boolean }
): Promise<Tables<'payout_accounts'>> {
  if (account.is_default) {
    const { error: unsetError } = await supabase
      .from('payout_accounts')
      .update({ is_default: false })
      .eq('user_id', userId);
    if (unsetError) throw unsetError;
  }

  const { data, error } = await supabase
    .from('payout_accounts')
    .insert({ user_id: userId, ...account })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePayoutAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from('payout_accounts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getNotificationPrefs(userId: string): Promise<Tables<'notification_preferences'> | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function updateNotificationPrefs(
  userId: string,
  prefs: Partial<Tables<'notification_preferences'>>
): Promise<Tables<'notification_preferences'>> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw error;
  return data;
}
