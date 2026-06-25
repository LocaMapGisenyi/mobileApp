import api from './config';

// ─── Calendar types ───────────────────────────────────────────────────────────
export type CalendarDayStatus = 'available' | 'booked' | 'blocked';
export type BlockReason = 'personal' | 'maintenance' | 'other';

export interface CalendarDay {
  date: string;           // ISO date string "YYYY-MM-DD"
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
  // 30-day stats
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

// Service pour les appels API liés aux statistiques et fonctionnalités des hôtes
export const hostService = {
  // Récupérer les statistiques globales de l'hôte
  getOverview: async (): Promise<HostStats> => {
    try {
      const response = await api.get('/host/stats/overview');
      return response;
    } catch (error) {
      console.error('Error fetching host statistics overview:', error);
      throw error;
    }
  },

  // Récupérer les statistiques d'une propriété spécifique
  getPropertyStats: async (propertyId: string, period?: 'week' | 'month' | 'year'): Promise<PropertyStats> => {
    try {
      const response = await api.get(`/host/stats/properties/${propertyId}`, {
        params: { period }
      });
      return response;
    } catch (error) {
      console.error(`Error fetching statistics for property ${propertyId}:`, error);
      throw error;
    }
  },

  // Récupérer les données de revenus
  getRevenueData: async (startDate: Date, endDate: Date): Promise<RevenueData[]> => {
    try {
      const response = await api.get('/host/stats/revenue', {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });
      return response;
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      throw error;
    }
  },

  // Récupérer les données d'occupation
  getOccupancyData: async (startDate: Date, endDate: Date): Promise<OccupancyData[]> => {
    try {
      const response = await api.get('/host/stats/occupancy', {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });
      return response;
    } catch (error) {
      console.error('Error fetching occupancy data:', error);
      throw error;
    }
  },

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get('/host/dashboard');
    return response;
  },

  getPendingRequests: async (): Promise<PendingRequest[]> => {
    const response = await api.get('/host/requests/pending');
    return response;
  },

  acceptRequest: async (id: string): Promise<void> => {
    await api.post(`/host/requests/${id}/accept`);
  },

  declineRequest: async (id: string, reason?: string): Promise<void> => {
    await api.post(`/host/requests/${id}/decline`, { reason });
  },

  // ─── Listings management ──────────────────────────────────────────────────
  getListings: async (): Promise<ListingCard[]> => {
    const response = await api.get('/host/listings');
    return response;
  },

  updateListingStatus: async (id: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> => {
    await api.patch(`/host/listings/${id}/status`, { status });
  },

  archiveListing: async (id: string): Promise<void> => {
    await api.delete(`/host/listings/${id}`);
  },

  // ─── Calendar ──────────────────────────────────────────────────────────────
  getHostListings: async (): Promise<HostListing[]> => {
    const response = await api.get('/host/listings/simple');
    return response;
  },

  getCalendar: async (listingId: string, month: string): Promise<CalendarDay[]> => {
    const response = await api.get(`/host/calendar/${listingId}`, {
      params: { month },
    });
    return response;
  },

  bulkUpdateCalendar: async (listingId: string, patch: CalendarBulkPatch): Promise<void> => {
    await api.patch(`/host/calendar/${listingId}/bulk`, patch);
  },
}; 