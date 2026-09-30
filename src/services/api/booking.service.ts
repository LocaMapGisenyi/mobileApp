import { supabase } from '../../lib/supabase';
import * as bookSvc from '../booking.service';
import type { Tables } from '../../types/database';

export interface Booking {
  id: string;
  propertyId: string;
  guestId: string;
  startDate: Date;
  endDate: Date;
  guestCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  totalPrice: number;
  currency: string;
  message?: string;
  createdAt: Date;
}

export interface Availability {
  date: Date;
  available: boolean;
}

const toBooking = (row: Tables<'bookings'>): Booking => ({
  id: row.id,
  propertyId: row.property_id,
  guestId: row.guest_id,
  startDate: new Date(row.start_date),
  endDate: new Date(row.end_date),
  guestCount: row.guest_count,
  status: row.status as Booking['status'],
  totalPrice: row.total_price,
  currency: row.currency,
  message: row.message ?? undefined,
  createdAt: new Date(row.created_at),
});

export const bookingService = {
  getAll: async (status?: string): Promise<Booking[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const rows = await bookSvc.getBookings(user.id, 'guest', status);
    return rows.map(toBooking);
  },

  getById: async (id: string): Promise<Booking> => {
    const row = await bookSvc.getBookingById(id);
    if (!row) throw new Error('Booking not found');
    return toBooking(row);
  },

  create: async (bookingData: Omit<Booking, 'id' | 'status' | 'totalPrice' | 'createdAt'>): Promise<Booking> => {
    const row = await bookSvc.createBooking({
      property_id: bookingData.propertyId,
      start_date: bookingData.startDate.toISOString().split('T')[0],
      end_date: bookingData.endDate.toISOString().split('T')[0],
      guest_count: bookingData.guestCount,
      message: bookingData.message,
    });
    return toBooking(row);
  },

  updateStatus: async (id: string, status: 'approved' | 'rejected' | 'cancelled'): Promise<Booking> => {
    const row = await bookSvc.updateBookingStatus(id, status);
    return toBooking(row);
  },

  getStats: async (): Promise<{ total: number; pending: number; approved: number; cancelled: number }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { total: 0, pending: 0, approved: 0, cancelled: 0 };
    return bookSvc.getBookingStats(user.id, 'guest');
  },

  getAvailability: async (propertyId: string, startDate: Date, endDate: Date): Promise<Availability[]> => {
    const rows = await bookSvc.getAvailability(
      propertyId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
    );
    return rows.map(r => ({ date: new Date(r.date), available: r.status === 'available' }));
  },

  setAvailability: async (): Promise<void> => {
    throw new Error('Modifiez les disponibilités depuis le calendrier de l’annonce.');
  },
};
