import { supabase } from '../../lib/supabase';
import * as hostSvc from '../host.service';
import * as propertySvc from '../property.service';

// ─── Calendar types ───────────────────────────────────────────────────────────
export type CalendarDayStatus = 'available' | 'booked' | 'blocked';
export type BlockReason = 'personal' | 'maintenance' | 'other';

export interface CalendarDay {
  date: string;
  status: CalendarDayStatus;
  priceOverride?: number;
  minNights?: number;
  blockReason?: BlockReason;
  reservationId?: string;
  guestName?: string;
  nights?: number;
  amount?: number;
}

export interface CalendarBulkPatch {
  dates: string[];
  status: CalendarDayStatus;
  priceOverride?: number;
  minNights?: number;
  blockReason?: BlockReason;
}

export interface DashboardSummary {
  pendingRequests: number;
  checkInsToday: number;
  checkOutsToday: number;
  occupancyNights: number;
  occupancyTotal: number;
  revenueMonth: number;
  revenuePending: number;
  currency: string;
  unreadNotifications: number;
}

export interface PendingRequest {
  id: string;
  type: 'reservation' | 'message';
  guestName: string;
  propertyTitle: string;
  checkIn?: string;
  checkOut?: string;
  hoursAgo: number;
  amount?: number;
  preview?: string;
}

export interface HostListing {
  id: string;
  title: string;
  type: string;
}

// ─── Listings management types ────────────────────────────────────────────────
export type ListingStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'PAUSED'
  | 'SUSPENDED'
  | 'ARCHIVED';

export interface ListingCard {
  id: string;
  title: string;
  city: string;
  propertyType: string;
  accommodationType: string;
  pricePerNight: number | null;
  currency: string;
  status: ListingStatus;
  completionScore: number;
  avgRating: number | null;
  reviewCount: number;
  coverPhotoUrl: string | null;
  occupancyRate: number | null;
  revenueMonth: number | null;
  viewCount: number | null;
}

export interface ListingStatusPatch {
  status: 'ACTIVE' | 'PAUSED';
}

// ─── Existing stats interfaces ────────────────────────────────────────────────
export interface HostStats {
  propertyCount: number;
  totalBookings: number;
  occupancyRate: number;
  averageRating: number;
  totalRevenue: {
    amount: number;
    currency: string;
  };
  pendingReviews: number;
  unreadMessages: number;
}

export interface PropertyStats {
  propertyId: string;
  bookingCount: number;
  occupancyRate: number;
  revenue: {
    amount: number;
    currency: string;
  };
  averageRating: number;
  reviewCount: number;
}

export interface RevenueData {
  date: string;
  amount: number;
  currency: string;
}

export interface OccupancyData {
  date: string;
  rate: number;
}

const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
};

export const hostService = {
  getOverview: async (): Promise<HostStats> => {
    const userId = await getCurrentUserId();
    const stats = await hostSvc.getHostStats(userId);
    return {
      propertyCount: stats.propertyCount,
      totalBookings: stats.totalBookings,
      occupancyRate: 0,
      averageRating: stats.avgRating,
      totalRevenue: { amount: stats.totalRevenue, currency: stats.currency },
      pendingReviews: 0,
      unreadMessages: 0,
    };
  },

  getPropertyStats: async (): Promise<PropertyStats> => ({
    propertyId: '', bookingCount: 0, occupancyRate: 0,
    revenue: { amount: 0, currency: 'RWF' }, averageRating: 0, reviewCount: 0,
  }),

  getRevenueData: async (): Promise<RevenueData[]> => [],
  getOccupancyData: async (): Promise<OccupancyData[]> => [],

  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const userId = await getCurrentUserId();
    return hostSvc.getDashboardSummary(userId);
  },

  getPendingRequests: async (): Promise<PendingRequest[]> => {
    const userId = await getCurrentUserId();
    return hostSvc.getPendingRequests(userId);
  },

  acceptRequest: async (id: string): Promise<void> => hostSvc.acceptRequest(id),
  declineRequest: async (id: string): Promise<void> => hostSvc.declineRequest(id),

  getListings: async (): Promise<ListingCard[]> => {
    const userId = await getCurrentUserId();
    const rows = await hostSvc.getHostListings(userId);
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      city: r.city,
      propertyType: r.property_type,
      accommodationType: r.accommodation_type ?? '',
      pricePerNight: r.price_per_month,
      currency: r.currency,
      status: r.status as ListingStatus,
      completionScore: r.completion_score,
      avgRating: r.avg_rating,
      reviewCount: r.review_count,
      coverPhotoUrl: r.images?.[0]?.url ?? null,
      occupancyRate: r.occupancy_rate,
      revenueMonth: r.revenue_month,
      viewCount: r.view_count,
    }));
  },

  updateListingStatus: async (id: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> => {
    await propertySvc.updatePropertyStatus(id, status);
  },

  archiveListing: async (id: string): Promise<void> => {
    await propertySvc.updatePropertyStatus(id, 'ARCHIVED');
  },

  getHostListings: async (): Promise<HostListing[]> => {
    const userId = await getCurrentUserId();
    const rows = await hostSvc.getHostListings(userId);
    return rows.map(r => ({ id: r.id, title: r.title, type: r.property_type }));
  },

  getCalendar: async (listingId: string, month: string): Promise<CalendarDay[]> => {
    const rows = await propertySvc.getCalendarDays(listingId, month);
    return rows.map(r => ({
      date: r.date,
      status: r.status as CalendarDayStatus,
      priceOverride: r.price_override ?? undefined,
      minNights: r.min_nights ?? undefined,
      blockReason: r.block_reason as BlockReason ?? undefined,
      reservationId: r.reservation_id ?? undefined,
    }));
  },

  bulkUpdateCalendar: async (listingId: string, patch: CalendarBulkPatch): Promise<void> => {
    await propertySvc.bulkUpdateCalendar(listingId, patch.dates, {
      status: patch.status,
      price_override: patch.priceOverride,
      min_nights: patch.minNights,
      block_reason: patch.blockReason,
    });
  },
};
