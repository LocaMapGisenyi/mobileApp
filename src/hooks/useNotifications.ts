import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notification.service';

export function useNotifications(userId: string | null): {
  notifications: Tables<'notifications'>[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refetch: () => Promise<void>;
} {
  const [notifications, setNotifications] = useState<Tables<'notifications'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getNotifications(userId);
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Tables<'notifications'>;
          setNotifications((prev) => [newNotif, ...prev]);
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await markNotificationRead(id);
    } catch (err) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)),
      );
      throw err;
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const prev = notifications;
    setNotifications((ns) => ns.map((n) => ({ ...n, is_read: true })));
    try {
      if (userId) await markAllNotificationsRead(userId);
    } catch (err) {
      setNotifications(prev);
      throw err;
    }
  }, [notifications, userId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    refetch: fetchNotifications,
  };
}
