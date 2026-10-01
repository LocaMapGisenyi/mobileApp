import { supabase } from '../../lib/supabase';
import * as hostSvc from '../host.service';
import {summarizeStayPeriod} from '../../utils/stays';
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
  canSetPricing: boolean;
  id: string;
  title: string;
  type: string | null;
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
  pricePerMonth: number | null;
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

async function monthlyPeriods(){
  const userId=await getCurrentUserId();
  const [properties,bookings]=await Promise.all([supabase.from('properties').select('id,status,currency').eq('owner_id',userId),supabase.from('bookings').select('*').eq('host_id',userId)]);
  if(properties.error)throw properties.error;if(bookings.error)throw bookings.error;
  if((bookings.data??[]).some(b=>b.currency!=='RWF'))throw new Error('Les statistiques multi-devises nécessitent une conversion configurée.');
  const ids=(properties.data??[]).filter(p=>['ACTIVE','PAUSED'].includes(p.status)).map(p=>p.id);
  const allIds=(properties.data??[]).map(p=>p.id);
  const now=new Date();
  return Array.from({length:12},(_,index)=>{
    const first=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-11+index,1)).toISOString().slice(0,10);
    const last=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-10+index,1)).toISOString().slice(0,10);
    return {date:first,...summarizeStayPeriod(bookings.data??[],ids,first,last),revenue:summarizeStayPeriod(bookings.data??[],allIds,first,last).revenue};
  });
}

export const hostService = {
  getOverview: async (): Promise<HostStats> => {
    const userId = await getCurrentUserId();
    const [stats, summary, participants, properties] = await Promise.all([
      hostSvc.getHostStats(userId), hostSvc.getDashboardSummary(userId),
      supabase.from('conversation_participants').select('unread_count').eq('user_id',userId),
      supabase.from('properties').select('id').eq('owner_id',userId),
    ]);
    if(participants.error) throw participants.error;
    if(properties.error) throw properties.error;
    const ids=(properties.data??[]).map(p=>p.id);
    let pendingReviews=0;
    if(ids.length){
      const reviews=await supabase.from('reviews').select('id,review_replies(id)').in('property_id',ids);
      if(reviews.error)throw reviews.error;
      pendingReviews=(reviews.data??[]).filter(r=>!r.review_replies.length).length;
    }
    return {propertyCount:stats.propertyCount,totalBookings:stats.totalBookings,
      occupancyRate:summary.occupancyTotal?100*summary.occupancyNights/summary.occupancyTotal:0,
      averageRating:stats.avgRating,totalRevenue:{amount:stats.totalRevenue,currency:stats.currency},
      pendingReviews,unreadMessages:(participants.data??[]).reduce((n,p)=>n+p.unread_count,0)};
  },

  getPropertyStats: async (propertyId: string): Promise<PropertyStats> => {
    const userId=await getCurrentUserId();
    const [property,bookings]=await Promise.all([
      supabase.from('properties').select('id,avg_rating,review_count,currency').eq('id',propertyId).eq('owner_id',userId).single(),
      supabase.from('bookings').select('*').eq('property_id',propertyId).eq('host_id',userId),
    ]);
    if(property.error)throw property.error;if(bookings.error)throw bookings.error;
    const month=new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Kigali'}).slice(0,7);
    const end=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10);
    const period=summarizeStayPeriod(bookings.data??[],[propertyId],month+'-01',end);
    return {propertyId,bookingCount:bookings.data?.length??0,occupancyRate:period.occupancyRate,
      revenue:{amount:(bookings.data??[]).filter(b=>['approved','completed'].includes(b.status)).reduce((n,b)=>n+b.total_price,0),currency:property.data.currency},
      averageRating:property.data.avg_rating??0,reviewCount:property.data.review_count};
  },

  getRevenueData: async (): Promise<RevenueData[]> => (await monthlyPeriods()).map(p=>({date:p.date,amount:p.revenue,currency:'RWF'})),
  getOccupancyData: async (): Promise<OccupancyData[]> => (await monthlyPeriods()).map(p=>({date:p.date,rate:p.occupancyRate})),

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
      pricePerMonth: r.price_per_month,
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
    const userId=await getCurrentUserId();
    const owned=await hostSvc.getHostListings(userId);
    const assignments=await supabase.from('co_hosts').select('listing_ids,permissions').eq('co_host_id',userId).eq('status','ACTIVE');
    if(assignments.error)throw assignments.error;
    const ids=[...new Set((assignments.data??[]).filter(a=>a.permissions.calendar===true).flatMap(a=>a.listing_ids))].filter(id=>!owned.some(p=>p.id===id));
    const delegated=ids.length?await supabase.from('properties').select('id,title,property_type,status').in('id',ids):{data:[],error:null};
    if(delegated.error)throw delegated.error;
    return [...owned.filter(r=>r.status!=='ARCHIVED').map(r=>({id:r.id,title:r.title,type:r.property_type,canSetPricing:true})),...(delegated.data??[]).filter(r=>r.status!=='ARCHIVED').map(r=>({id:r.id,title:r.title,type:r.property_type,canSetPricing:false}))];
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
