import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';

export async function getBookings(
  userId: string,
  role: 'guest' | 'host',
  status?: string
): Promise<Tables<'bookings'>[]> {
  try {
    let query = supabase
      .from('bookings')
      .select(
        'property:properties(title, city, property_images(url, is_cover)), guest:profiles!guest_id(full_name, avatar_url), *'
      );

    if (role === 'guest') {
      query = query.eq('guest_id', userId);
    } else {
      query = query.eq('host_id', userId);
    }

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw err;
  }
}

export async function getBookingById(id: string): Promise<Tables<'bookings'> | null> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, property:properties(*), guest:profiles!guest_id(*), host:profiles!host_id(*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export async function createBooking(data: {
  property_id: string;
  guest_id: string;
  host_id: string;
  start_date: string;
  end_date: string;
  guest_count: number;
  total_price: number;
  currency: string;
  message?: string;
}): Promise<Tables<'bookings'>> {
  try {
    const { data: created, error } = await supabase
      .from('bookings')
      .insert({ ...data, status: 'pending' })
      .select()
      .single();

    if (error) throw error;
    return created;
  } catch (err) {
    throw err;
  }
}

export async function updateBookingStatus(
  id: string,
  status: 'approved' | 'rejected' | 'cancelled' | 'completed'
): Promise<Tables<'bookings'>> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
}

export async function getAvailability(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<Tables<'calendar_days'>[]> {
  try {
    const { data, error } = await supabase
      .from('calendar_days')
      .select('*')
      .eq('property_id', propertyId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw err;
  }
}

export async function getBookingStats(
  userId: string,
  role: 'guest' | 'host'
): Promise<{ total: number; pending: number; approved: number; cancelled: number }> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('status')
      .eq(role === 'guest' ? 'guest_id' : 'host_id', userId);

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        const s = (row as any).status as string;
        if (s === 'pending') acc.pending += 1;
        else if (s === 'approved') acc.approved += 1;
        else if (s === 'cancelled') acc.cancelled += 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, cancelled: 0 }
    );
  } catch (err) {
    throw err;
  }
}
