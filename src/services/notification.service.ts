import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';

export async function getNotifications(
  userId: string,
  unreadOnly?: boolean,
): Promise<Tables<'notifications'>[]> {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    if (!Array.isArray(data)) return [];
    return data as Tables<'notifications'>[];
  } catch (err) {
    throw err;
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    throw err;
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
  } catch (err) {
    throw err;
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    throw err;
  }
}
