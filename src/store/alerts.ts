import { create } from 'zustand';
import { PropertyType, Amenity } from '../types';
import { supabase } from '../lib/supabase';
import { useUserStore } from './user';
import { getNotificationPrefs, updateNotificationPrefs } from '../services/profile.service';
import type { Tables } from '../types/database';
export interface Alert {
  id: string; name: string; enabled: boolean;
  criteria: { propertyTypes?: PropertyType[]; minPrice?: number; maxPrice?: number; minBedrooms?: number; maxBedrooms?: number; amenities?: Amenity[]; districts?: string[] };
}
interface AlertState {
  alerts: Alert[]; notificationsEnabled: boolean; isLoading: boolean; error: string | null;
  fetchAlerts: () => Promise<void>; createAlert: (alert: Omit<Alert, 'id'>) => Promise<void>;
  updateAlert: (id: string, alert: Partial<Alert>) => Promise<void>; removeAlert: (id: string) => Promise<void>;
  toggleAlertStatus: (id: string) => Promise<void>; toggleNotifications: () => Promise<void>;
  renameAlert: (id: string, name: string) => Promise<void>;
}
let revision = 0;
let accountGeneration = 0;
const fromRow = (row: Tables<'alerts'>): Alert => {
  const filters = row.filters as { enabled?: boolean; criteria?: Alert['criteria'] };
  return { id: row.id, name: row.name, enabled: filters.enabled ?? true, criteria: filters.criteria ?? {} };
};
const currentUser = () => { const id = useUserStore.getState().user.id; if (!id) throw new Error('Connectez-vous pour enregistrer une alerte.'); return id; };
export const useAlertsStore = create<AlertState>((set, get) => ({
  alerts: [], notificationsEnabled: false, isLoading: false, error: null,
  fetchAlerts: async () => {
    const request = ++revision;
    const id = useUserStore.getState().user.id;
    if (!id) { set({ alerts: [], notificationsEnabled: false, isLoading: false }); return; }
    set({ isLoading: true, error: null });
    try {
      const [{ data, error }, prefs] = await Promise.all([supabase.from('alerts').select('*').eq('user_id', id).order('created_at', { ascending: false }), getNotificationPrefs(id)]);
      if (error) throw error;
      if (request === revision && id === useUserStore.getState().user.id) set({ alerts: (data ?? []).map(fromRow), notificationsEnabled: prefs?.push_enabled ?? false, isLoading: false });
    } catch (error) { if (request === revision) set({ error: (error as Error).message, isLoading: false }); }
  },
  createAlert: async alert => {
    const id = currentUser(); const account = accountGeneration; revision++;
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.from('alerts').insert({ user_id: id, name: alert.name, filters: { enabled: alert.enabled, criteria: alert.criteria } }).select().single();
      if (error) throw error;
      if (account === accountGeneration && id === useUserStore.getState().user.id) { revision++; set(state => ({ alerts: [fromRow(data), ...state.alerts], isLoading: false })); }
    } catch (error) { if (account === accountGeneration && id === useUserStore.getState().user.id) set({ error: (error as Error).message, isLoading: false }); throw error; }
  },
  updateAlert: async (alertId, patch) => {
    const id = currentUser(); const account = accountGeneration; const existing = get().alerts.find(alert => alert.id === alertId); if (!existing) return;
    const alert = { ...existing, ...patch }; revision++;
    try {
      const { data, error } = await supabase.from('alerts').update({ name: alert.name, filters: { enabled: alert.enabled, criteria: alert.criteria } }).eq('id', alertId).eq('user_id', id).select().single();
      if (error) throw error;
      if (account === accountGeneration && id === useUserStore.getState().user.id) { revision++; set(state => ({ alerts: state.alerts.map(item => item.id === alertId ? fromRow(data) : item), error: null })); }
    } catch (error) { if (account === accountGeneration && id === useUserStore.getState().user.id) set({ error: (error as Error).message }); }
  },
  removeAlert: async alertId => {
    const id = currentUser(); const account = accountGeneration; revision++;
    try { const { error } = await supabase.from('alerts').delete().eq('id', alertId).eq('user_id', id); if (error) throw error;
      if (account === accountGeneration && id === useUserStore.getState().user.id) { revision++; set(state => ({ alerts: state.alerts.filter(item => item.id !== alertId), error: null })); }
    } catch (error) { if (account === accountGeneration && id === useUserStore.getState().user.id) set({ error: (error as Error).message }); }
  },
  toggleAlertStatus: async id => { const alert = get().alerts.find(item => item.id === id); if (alert) await get().updateAlert(id, { enabled: !alert.enabled }); },
  renameAlert: async (id, name) => get().updateAlert(id, { name }),
  toggleNotifications: async () => {
    const id = currentUser(); const account = accountGeneration; const enabled = !get().notificationsEnabled;
    try { await updateNotificationPrefs(id, { push_enabled: enabled }); if (account === accountGeneration && id === useUserStore.getState().user.id) set({ notificationsEnabled: enabled, error: null }); }
    catch (error) { if (account === accountGeneration && id === useUserStore.getState().user.id) set({ error: (error as Error).message }); }
  },
}));
useUserStore.subscribe((state, previous) => { if (state.user.id !== previous.user.id) { accountGeneration++; revision++; useAlertsStore.setState({ alerts: [], notificationsEnabled: false, isLoading: false, error: null }); } });
