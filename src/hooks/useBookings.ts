import { useState, useEffect, useCallback, useRef } from 'react';
import type { Tables } from '../types/database';
import {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  type BookingWithProperty,
  BOOKING_PAGE_SIZE,
} from '../services/booking.service';

interface BookingsState {
  bookings: BookingWithProperty[];
  loading: boolean;
  error: string | null;
  hasMore:boolean;
}

interface BookingState {
  booking: Tables<'bookings'> | null;
  loading: boolean;
  error: string | null;
}

interface BookingActionsState {
  loading: boolean;
  error: string | null;
}

export function useBookings(
  userId: string | null,
  role: 'guest' | 'host',
  status?: string
) {
  const generation = useRef(0);
  const currentRows=useRef<BookingWithProperty[]>([]);
  const paging=useRef(false);
  const [state, setState] = useState<BookingsState>({
    bookings: [],
    loading: false,
    error: null,
    hasMore:false,
  });

  const fetch = useCallback(async (append=false) => {
    if(append && paging.current)return;
    paging.current=true;
    const request = ++generation.current;
    if (!userId) {
      currentRows.current=[];paging.current=false;
      setState({ bookings: [], loading: false, error: null,hasMore:false });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const incoming = await getBookings(userId, role, status,{offset:append?currentRows.current.length:0,limit:BOOKING_PAGE_SIZE});
      if(request===generation.current){
        const bookings=append?[...currentRows.current,...incoming.filter(row=>!currentRows.current.some(old=>old.id===row.id))]:incoming;
        currentRows.current=bookings;
        setState({bookings,loading:false,error:null,hasMore:incoming.length===BOOKING_PAGE_SIZE});
      }
    } catch (err) {
      if (request === generation.current) setState(previous=>({...previous,loading:false,error:(err as Error).message}));
    } finally {
      if(request===generation.current)paging.current=false;
    }
  }, [userId, role, status]);

  useEffect(() => {
    currentRows.current=[];paging.current=false;
    setState({bookings: [], loading: true, error: null,hasMore:false});
    void fetch();
    return () => { ++generation.current; };
  }, [fetch]);

  const loadMore=useCallback(()=>fetch(true),[fetch]);
  return { ...state, refetch: fetch,loadMore };
}

export function useBooking(id: string | null) {
  const [state, setState] = useState<BookingState>({
    booking: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!id) {
      setState({ booking: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    (async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const booking = await getBookingById(id);
        if (!cancelled) setState({ booking, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ booking: null, loading: false, error: (err as Error).message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}

export function useBookingActions() {
  const [state, setState] = useState<BookingActionsState>({
    loading: false,
    error: null,
  });

  const handleCreate = useCallback(
    async (data: {
      property_id: string;
      guest_id: string;
      host_id: string;
      start_date: string;
      end_date: string;
      guest_count: number;
      total_price: number;
      currency: string;
      message?: string;
    }): Promise<Tables<'bookings'>> => {
      setState({ loading: true, error: null });
      try {
        const booking = await createBooking(data);
        setState({ loading: false, error: null });
        return booking;
      } catch (err) {
        const message = (err as Error).message;
        setState({ loading: false, error: message });
        throw err;
      }
    },
    []
  );

  const handleUpdateStatus = useCallback(
    async (
      id: string,
      status: 'approved' | 'rejected' | 'cancelled' | 'completed'
    ): Promise<void> => {
      setState({ loading: true, error: null });
      try {
        await updateBookingStatus(id, status);
        setState({ loading: false, error: null });
      } catch (err) {
        const message = (err as Error).message;
        setState({ loading: false, error: message });
        throw err;
      }
    },
    []
  );

  return {
    createBooking: handleCreate,
    updateStatus: handleUpdateStatus,
    loading: state.loading,
    error: state.error,
  };
}
