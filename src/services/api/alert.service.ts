import { supabase } from '../../lib/supabase';
import * as notifSvc from '../notification.service';
import { SearchFilters } from '../../types';

export interface Alert {
  id: string;
  name: string;
  filters: SearchFilters;
  frequency: 'daily' | 'weekly' | 'instant';
  createdAt: Date;
  userId: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'message' | 'system' | 'booking';
  read: boolean;
  createdAt: Date;
  relatedId?: string;
}

const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
};

export const alertService = {
  getAlerts: async (): Promise<Alert[]> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(a => ({
      id: a.id,
      name: a.name,
      filters: (a.filters as SearchFilters) ?? {},
      frequency: a.frequency as 'daily' | 'weekly' | 'instant',
      createdAt: new Date(a.created_at),
      userId: a.user_id,
    }));
  },

  createAlert: async (alertData: Omit<Alert, 'id' | 'createdAt' | 'userId'>): Promise<Alert> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        user_id: userId,
        name: alertData.name,
        filters: alertData.filters,
        frequency: alertData.frequency,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      filters: data.filters as SearchFilters,
      frequency: data.frequency as 'daily' | 'weekly' | 'instant',
      createdAt: new Date(data.created_at),
      userId: data.user_id,
    };
  },

  updateAlert: async (id: string, alertData: Partial<Alert>): Promise<Alert> => {
    const { data, error } = await supabase
      .from('alerts')
      .update({ name: alertData.name, filters: alertData.filters, frequency: alertData.frequency })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      filters: data.filters as SearchFilters,
      frequency: data.frequency as 'daily' | 'weekly' | 'instant',
      createdAt: new Date(data.created_at),
      userId: data.user_id,
    };
  },

  deleteAlert: async (id: string): Promise<void> => {
    const { error } = await supabase.from('alerts').delete().eq('id', id);
    if (error) throw error;
  },

  getNotifications: async (): Promise<Notification[]> => {
    const userId = await getCurrentUserId();
    const rows = await notifSvc.getNotifications(userId);
    return rows.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type as Notification['type'],
      read: n.is_read,
      createdAt: new Date(n.created_at),
      relatedId: n.related_id ?? undefined,
    }));
  },

  markAsRead: async (id: string): Promise<void> => notifSvc.markNotificationRead(id),

  markAllRead: async (): Promise<void> => {
    const userId = await getCurrentUserId();
    await notifSvc.markAllNotificationsRead(userId);
  },
};
