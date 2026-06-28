import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';

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
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [bookingsRes, checkInsRes, checkOutsRes, notifsRes, revenueRes] = await Promise.all([
    supabase.from('bookings').select('status').eq('host_id', hostId),
    supabase.from('bookings').select('id').eq('host_id', hostId).eq('start_date', today).eq('status', 'approved'),
    supabase.from('bookings').select('id').eq('host_id', hostId).eq('end_date', today).eq('status', 'approved'),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', hostId).eq('is_read', false),
    supabase.from('bookings').select('total_price, status').eq('host_id', hostId).gte('created_at', monthStart),
  ]);

  const bookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
  const pendingRequests = bookings.filter(b => b.status === 'pending').length;

  const checkInsToday = Array.isArray(checkInsRes.data) ? checkInsRes.data.length : 0;
  const checkOutsToday = Array.isArray(checkOutsRes.data) ? checkOutsRes.data.length : 0;

  const unreadNotifications = notifsRes.count ?? 0;

  const revenueBookings = Array.isArray(revenueRes.data) ? revenueRes.data : [];
  const revenueMonth = revenueBookings
    .filter(b => b.status === 'approved' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.total_price ?? 0), 0);
  const revenuePending = revenueBookings
    .filter(b => b.status === 'pending')
    .reduce((sum, b) => sum + (b.total_price ?? 0), 0);

  return {
    pendingRequests,
    checkInsToday,
    checkOutsToday,
    occupancyNights: 0,
    occupancyTotal: 0,
    revenueMonth,
    revenuePending,
    currency: 'RWF',
    unreadNotifications,
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
    .select('id, start_date, end_date, total_price, created_at, guest:profiles!guest_id(full_name), property:properties(title)')
    .eq('host_id', hostId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  return rows.map(b => ({
    id: b.id,
    type: 'reservation' as const,
    guestName: (b.guest as any)?.full_name ?? 'Inconnu',
    propertyTitle: (b.property as any)?.title ?? '',
    checkIn: b.start_date ?? undefined,
    checkOut: b.end_date ?? undefined,
    hoursAgo: Math.floor((Date.now() - new Date(b.created_at).getTime()) / 3_600_000),
    amount: b.total_price ?? undefined,
  }));
}

export async function acceptRequest(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', bookingId);

  if (error) throw error;
}

export async function declineRequest(bookingId: string, reason?: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (error) throw error;
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
    supabase.from('bookings').select('total_price, status').eq('host_id', hostId),
    supabase.from('properties').select('avg_rating').eq('owner_id', hostId),
  ]);

  const propertyCount = propCountRes.count ?? 0;

  const bookings = Array.isArray(bookingStatsRes.data) ? bookingStatsRes.data : [];
  const totalBookings = bookings.length;
  const totalRevenue = bookings
    .filter(b => b.status === 'approved' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.total_price ?? 0), 0);

  const ratings = Array.isArray(ratingRes.data) ? ratingRes.data : [];
  const validRatings = ratings.map(r => r.avg_rating).filter((r): r is number => typeof r === 'number' && r > 0);
  const avgRating = validRatings.length > 0
    ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
    : 0;

  return { propertyCount, totalBookings, avgRating, totalRevenue, currency: 'RWF' };
}
