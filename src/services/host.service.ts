import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';
import { summarizeStayPeriod } from '../utils/stays';
import { updateBookingStatus } from './booking.service';

export async function getDashboardSummary(hostId: string): Promise<{
  pendingRequests: number;
  checkInsToday: number;
  checkOutsToday: number;
  occupancyNights: number;
  occupancyTotal: number;
  revenueMonth: number;
  revenuePending: number;
  currency: string;
  unreadNotifications: number;
}> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kigali' });
  const start = today.slice(0, 7) + '-01';
  const end = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 1)).toISOString().slice(0, 10);
  const [bookingsRes, propertiesRes, notifsRes] = await Promise.all([
    supabase.from('bookings').select('*').eq('host_id', hostId),
    supabase.from('properties').select('id,status,currency').eq('owner_id', hostId),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', hostId).eq('is_read', false),
  ]);
  for (const result of [bookingsRes, propertiesRes, notifsRes]) if (result.error) throw result.error;
  const bookings = bookingsRes.data ?? [];
  const ids = (propertiesRes.data ?? []).filter(p => ['ACTIVE', 'PAUSED'].includes(p.status)).map(p => p.id);
  const allIds = (propertiesRes.data ?? []).map(p => p.id);
  const period = summarizeStayPeriod(bookings, ids, start, end);
  if (bookings.some(b => b.currency !== 'RWF')) throw new Error('Les statistiques multi-devises nécessitent une conversion configurée.');
  const revenue = summarizeStayPeriod(bookings.filter(b => b.currency === 'RWF'), allIds, start, end);
  const pending = summarizeStayPeriod(bookings.filter(b => b.status === 'pending' && b.currency === 'RWF').map(b => ({...b, status:'approved'})), allIds, start, end);
  return {
    pendingRequests: bookings.filter(b => b.status === 'pending').length,
    checkInsToday: bookings.filter(b => b.start_date === today && b.status === 'approved').length,
    checkOutsToday: bookings.filter(b => b.end_date === today && b.status === 'approved').length,
    occupancyNights: period.occupiedDays,
    occupancyTotal: period.availableDays,
    revenueMonth: revenue.revenue,
    revenuePending: pending.revenue,
    currency: 'RWF',
    unreadNotifications: notifsRes.count ?? 0,
  };
}

export async function getHostListings(
  hostId: string
): Promise<(Tables<'properties'> & { images: { url: string; is_cover: boolean }[] })[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*, property_images(url, is_cover)')
    .eq('owner_id', hostId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  return rows.map(row => ({
    ...row,
    images: Array.isArray(row.property_images) ? row.property_images : [],
  }));
}

export async function getPendingRequests(hostId: string): Promise<{
  id: string;
  type: 'reservation';
  guestName: string;
  propertyTitle: string;
  checkIn?: string;
  checkOut?: string;
  hoursAgo: number;
  amount?: number;
}[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, guest_id, start_date, end_date, total_price, created_at, property:properties(title)')
    .eq('host_id', hostId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  const guestIds = [...new Set(rows.map(b => b.guest_id))];
  const profiles = guestIds.length ? await supabase.from('public_profiles').select('id,full_name').in('id', guestIds) : {data: [], error: null};
  if (profiles.error) throw profiles.error;
  const names = new Map((profiles.data ?? []).map(p => [p.id, p.full_name]));
  return rows.map(b => ({
    id: b.id,
    type: 'reservation' as const,
    guestName: names.get(b.guest_id) ?? 'Utilisateur',
    propertyTitle: (b.property as any)?.title ?? '',
    checkIn: b.start_date ?? undefined,
    checkOut: b.end_date ?? undefined,
    hoursAgo: Math.floor((Date.now() - new Date(b.created_at).getTime()) / 3_600_000),
    amount: b.total_price ?? undefined,
  }));
}

export async function acceptRequest(bookingId: string): Promise<void> {
  await updateBookingStatus(bookingId, 'approved');
}

export async function declineRequest(bookingId: string, _reason?: string): Promise<void> {
  await updateBookingStatus(bookingId, 'rejected');
}

export async function getHostStats(hostId: string): Promise<{
  propertyCount: number;
  totalBookings: number;
  avgRating: number;
  totalRevenue: number;
  currency: string;
}> {
  const [propCountRes, bookingStatsRes, ratingRes] = await Promise.all([
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', hostId),
    supabase.from('bookings').select('total_price, status,currency').eq('host_id', hostId),
    supabase.from('properties').select('avg_rating').eq('owner_id', hostId),
  ]);

  for (const result of [propCountRes, bookingStatsRes, ratingRes]) if (result.error) throw result.error;
  const propertyCount = propCountRes.count ?? 0;

  const bookings = Array.isArray(bookingStatsRes.data) ? bookingStatsRes.data : [];
  const totalBookings = bookings.length;
  if (bookings.some(b => b.currency !== 'RWF')) throw new Error('Les statistiques multi-devises nécessitent une conversion configurée.');
  const totalRevenue = bookings
    .filter(b => b.currency === 'RWF' && (b.status === 'approved' || b.status === 'completed'))
    .reduce((sum, b) => sum + (b.total_price ?? 0), 0);

  const ratings = Array.isArray(ratingRes.data) ? ratingRes.data : [];
  const validRatings = ratings.map(r => r.avg_rating).filter((r): r is number => typeof r === 'number' && r > 0);
  const avgRating = validRatings.length > 0
    ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
    : 0;

  return { propertyCount, totalBookings, avgRating, totalRevenue, currency: 'RWF' };
}
