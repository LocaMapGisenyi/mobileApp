import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '../services/notification.service';

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Tables<'notifications'>[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refetch = useCallback(async () => {
    if (!userId) return;
    const request = generation.current;
    setLoading(true);
    try {
      const [rows, unread] = await Promise.all([getNotifications(userId), getUnreadCount(userId)]);
      if (request !== generation.current) return;
      setNotifications(rows); setUnreadCount(unread); setError(null);
    } catch (failure) { if (request === generation.current) setError(failure instanceof Error ? failure.message : 'Notifications indisponibles.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, [userId]);
  useEffect(() => {
    ++generation.current; setNotifications([]); setUnreadCount(0); setError(null);
    if (!userId) return;
    void refetch();
    const channel = supabase.channel(`notifications-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => void refetch())
      .subscribe(status => {
        if (status === 'SUBSCRIBED') void refetch();
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setError('Connexion interrompue. Actualisez vos notifications.');
      });
    return () => { ++generation.current; void supabase.removeChannel(channel); };
  }, [userId, refetch]);
  const markRead = async (id: string) => {
    const request = generation.current;
    try { await markNotificationRead(id); if (request === generation.current) await refetch(); }
    catch (failure) { if (request === generation.current) setError(failure instanceof Error ? failure.message : 'Lecture non enregistrée.'); throw failure; }
  };
  const markAllRead = async () => {
    if (!userId) throw new Error('Connectez-vous pour accéder aux notifications.');
    const request = generation.current;
    try { await markAllNotificationsRead(userId); if (request === generation.current) await refetch(); }
    catch (failure) { if (request === generation.current) setError(failure instanceof Error ? failure.message : 'Lecture non enregistrée.'); throw failure; }
  };
  return { notifications, unreadCount, loading, error, markRead, markAllRead, refetch };
}
