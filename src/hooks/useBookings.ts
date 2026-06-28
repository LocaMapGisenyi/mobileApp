import { useState, useEffect, useCallback } from 'react';
import type { Tables } from '../types/database';
import {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
} from '../services/booking.service';

interface BookingsState {
  bookings: Tables<'bookings'>[];
  loading: boolean;
  error: string | null;
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
  const [state, setState] = useState<BookingsState>({
    bookings: [],
    loading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    if (!userId) {
      setState({ bookings: [], loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const bookings = await getBookings(userId, role, status);
      setState({ bookings, loading: false, error: null });
    } catch (err) {
      setState({ bookings: [], loading: false, error: (err as Error).message });
    }
  }, [userId, role, status]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
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
