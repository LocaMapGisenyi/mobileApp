import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { HostBookingFilter } from '../types';
import { BOOKING_PAGE_SIZE, getHostBookings, type BookingWithProperty } from '../services/booking.service';

export function useHostBookings(hostId: string | null, filter: HostBookingFilter) {
  const version = useRef(0);
  const paging = useRef(false);
  const rows = useRef<BookingWithProperty[]>([]);
  const scope = useRef('');
  const [state, setState] = useState({ rows: [] as BookingWithProperty[], loading: true, loadingMore: false, error: false, hasMore: false });
  const load = useCallback(async (append = false) => {
    if (append && paging.current) return;
    const request = ++version.current;
    paging.current = true;
    setState(value => ({ ...value, loading: true, loadingMore: append, error: false }));
    try {
      const incoming = hostId ? await getHostBookings(hostId, filter, { offset: append ? rows.current.length : 0, limit: BOOKING_PAGE_SIZE }) : [];
      if (request !== version.current) return;
      rows.current = append ? [...rows.current, ...incoming.filter(row => !rows.current.some(old => old.id === row.id))] : incoming;
      setState({ rows: rows.current, loading: false, loadingMore: false, error: false, hasMore: incoming.length === BOOKING_PAGE_SIZE });
    } catch { if (request === version.current) setState(value => ({ ...value, loading: false, loadingMore: false, error: true })); }
    finally { if (request === version.current) paging.current = false; }
  }, [hostId, filter]);
  useFocusEffect(useCallback(() => {
    const next = `${hostId}:${filter}`;
    if (scope.current !== next) {
      scope.current = next; rows.current = [];
      setState({ rows: [], loading: true, loadingMore: false, error: false, hasMore: false });
    }
    void load();
    return () => { ++version.current; paging.current = false; };
  }, [hostId, filter, load]));
  return { ...state, refresh: () => load(), loadMore: () => load(true) };
}
