import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';
import { dateDay } from '../utils/stays';
import { kigaliDate } from '../utils/hostBookings';
import type { HostBookingFilter } from '../types';

export type BookingWithProperty = Tables<'bookings'> & {property?: {title: string; city: string} | null};
export const BOOKING_PAGE_SIZE=30;
const BOOKING_FIELDS='id,property_id,guest_id,host_id,start_date,end_date,guest_count,status,total_price,currency,message,created_at,updated_at' as const;

export async function getHostBookings(
  hostId: string, filter: HostBookingFilter = 'all', page = { offset: 0, limit: BOOKING_PAGE_SIZE }, today = kigaliDate(),
): Promise<BookingWithProperty[]> {
  dateDay(today);
  let query = supabase.from('bookings').select(`${BOOKING_FIELDS},property:properties(title,city)`).eq('host_id', hostId);
  switch (filter) {
    case 'requests': query = query.eq('status', 'pending'); break;
    case 'upcoming': query = query.eq('status', 'approved').gt('start_date', today); break;
    case 'current': query = query.eq('status', 'approved').lte('start_date', today).gt('end_date', today); break;
    case 'arrivals': query = query.eq('status', 'approved').eq('start_date', today); break;
    case 'departures': query = query.eq('status', 'approved').eq('end_date', today); break;
    case 'history': query = query.or(`status.in.(rejected,cancelled,completed),and(status.eq.approved,end_date.lte.${today})`); break;
  }
  const offset = Math.max(0, Math.trunc(page.offset));
  const limit = Math.max(1, Math.min(100, Math.trunc(page.limit)));
  const { data, error } = await query.order('start_date', { ascending: filter !== 'history' }).order('id', { ascending: false }).range(offset, offset + limit - 1);
  if (error) throw error;
  return data ?? [];
}

export type HostBookingDetail = BookingWithProperty & { guestName: string | null };
export async function getHostBookingDetail(id: string, hostId: string): Promise<HostBookingDetail | null> {
  const { data, error } = await supabase.from('bookings')
    .select(`${BOOKING_FIELDS},property:properties(title,city)`).eq('id', id).eq('host_id', hostId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const guest = await supabase.from('public_profiles').select('full_name').eq('id', data.guest_id).maybeSingle();
  if (guest.error) throw guest.error;
  return { ...data, guestName: guest.data?.full_name ?? null };
}
export interface BookingQuote {total_price: number; currency: string; days: number; deposit: number}
export async function quoteBooking(input: {property_id: string; start_date: string; end_date: string; guest_count: number}): Promise<BookingQuote> {
  if (dateDay(input.end_date) <= dateDay(input.start_date) || !Number.isInteger(input.guest_count) || input.guest_count < 1) throw new Error('Vérifiez les dates et le nombre de personnes.');
  const {data, error} = await supabase.rpc('quote_booking', {p_property_id: input.property_id, p_start_date: input.start_date, p_end_date: input.end_date, p_guest_count: input.guest_count});
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.total_price !== 'number' || typeof data.currency !== 'string' || typeof data.days !== 'number' || typeof data.deposit !== 'number') throw new Error('Devis indisponible.');
  return {total_price:data.total_price,currency:data.currency,days:data.days,deposit:data.deposit};
}

export async function getBookings(
  userId: string,
  role: 'guest' | 'host',
  status?: string,
  page={offset:0,limit:BOOKING_PAGE_SIZE}
): Promise<BookingWithProperty[]> {

    let query = supabase
      .from('bookings')
      .select(
        `${BOOKING_FIELDS},property:properties(title,city)`
      );

    if (role === 'guest') {
      query = query.eq('guest_id', userId);
    } else {
      query = query.eq('host_id', userId);
    }

    if (status) {
      if (!['pending', 'approved', 'rejected', 'cancelled', 'completed'].includes(status)) throw new Error('Statut de réservation invalide');
      query = query.eq('status', status as Tables<'bookings'>['status']);
    }

    const offset=Math.max(0,Math.trunc(page.offset));
    const limit=Math.max(1,Math.min(100,Math.trunc(page.limit)));
    const { data, error } = await query.order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+limit-1);
    if (error) throw error;
    return Array.isArray(data) ? data : [];

}

export async function getBookingById(id: string): Promise<Tables<'bookings'> | null> {

    const { data, error } = await supabase
      .from('bookings')
      .select(BOOKING_FIELDS)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;

}

export async function createBooking(data: {
  property_id: string;
  guest_id?: string;
  host_id?: string;
  start_date: string;
  end_date: string;
  guest_count: number;
  total_price?: number;
  expected_total?: number;
  currency?: string;
  message?: string;
}): Promise<Tables<'bookings'>> {

    const { data: created, error } = await supabase.rpc('create_booking', {
      p_property_id: data.property_id,
      p_start_date: data.start_date,
      p_end_date: data.end_date,
      p_guest_count: data.guest_count,
      p_message: data.message?.trim() || null,
      ...(data.expected_total !== undefined ? {p_expected_total: data.expected_total} : {}),
    });

    if (error) throw error;
    if (!created) throw new Error('La réservation n’a pas été créée');
    return created;

}

export async function updateBookingStatus(
  id: string,
  status: 'approved' | 'rejected' | 'cancelled' | 'completed'
): Promise<Tables<'bookings'>> {

    const { data, error } = await supabase.rpc('update_booking_status', { p_booking_id: id, p_status: status });

    if (error) throw error;
    if (!data) throw new Error('La réservation n’a pas été mise à jour');
    return data;

}

export async function getAvailability(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<Tables<'calendar_days'>[]> {

    const { data, error } = await supabase
      .from('calendar_days')
      .select('*')
      .eq('property_id', propertyId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;
    return Array.isArray(data) ? data : [];

}

export async function getBookingStats(
  userId: string,
  role: 'guest' | 'host'
): Promise<{ total: number; pending: number; approved: number; cancelled: number }> {

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

}
