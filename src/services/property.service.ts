import { supabase } from '../lib/supabase';
import type { Tables, Insertable, Updatable } from '../types/database';
import { TtlCache } from '../lib/cache';
import { onAccountChange } from '../lib/accountScope';
const DISTRICTS_CACHE_TTL_MS=5*60_000;
const districtCache=new TtlCache<string[]>(DISTRICTS_CACHE_TTL_MS,1);
onAccountChange(()=>districtCache.clear());

const PUBLIC_PROPERTY_FIELDS='id,owner_id,title,description,property_type,accommodation_type,status,size,visitors_allowed,noise_after22,price_per_month,currency,deposit,min_duration_months,notice_period_days,bedrooms,bathrooms,max_guests,amenities,smoking_allowed,pets_allowed,address,city,district,country,latitude,longitude,avg_rating,review_count,created_at,updated_at,property_images(id,property_id,url,position,is_cover,created_at)' as const;
export type PropertyRow = Omit<Tables<'properties'>,'view_count'|'completion_score'|'occupancy_rate'|'revenue_month'> & {
  property_images?: Tables<'property_images'>[];
  images?: Tables<'property_images'>[];
  owner?: { id: string; full_name: string; avatar_url: string | null };
};

async function withOwners<T extends PropertyRow>(rows: T[]): Promise<T[]> {
  const ids = [...new Set(rows.map(row => row.owner_id))];
  if (!ids.length) return rows;
  const { data, error } = await supabase.from('public_profiles').select('id,full_name,avatar_url').in('id', ids);
  if (error) throw error;
  return rows.map(row => ({ ...row, owner: data?.find(owner => owner.id === row.owner_id) }));
}

export interface PropertySearchFilters {
  createdAfter?: string;
  city?: string; district?: string[]; minPrice?: number; maxPrice?: number;
  bedrooms?: number; maxBedrooms?: number; bathrooms?: number; propertyType?: string | string[];
  amenities?: string[]; status?: string; sortBy?: string; offset?: number; limit?: number;
  bounds?: { south: number; north: number; west: number; east: number };
}

function searchQuery(text: string, filters: PropertySearchFilters = {}, countOnly = false) {
  let query = supabase.from('properties').select(countOnly ? 'id' : PUBLIC_PROPERTY_FIELDS, { count: 'exact', head: countOnly })
    .eq('status', (filters.status ?? 'ACTIVE') as Tables<'properties'>['status']).eq('currency', 'RWF');
  // Remove PostgREST filter operators before interpolating free text.
  const term = text.replace(/[%,().*\\"']/g, ' ').trim();
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,city.ilike.%${term}%,district.ilike.%${term}%`);
  if (filters.createdAfter) query = query.gte('created_at', filters.createdAfter);
  if (filters.city) query = query.eq('city', filters.city);
  if (filters.district?.length) query = query.in('district', filters.district);
  if (filters.minPrice !== undefined) query = query.gte('price_per_month', filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte('price_per_month', filters.maxPrice);
  if (filters.bedrooms !== undefined) query = query.gte('bedrooms', filters.bedrooms);
  if (filters.maxBedrooms !== undefined) query = query.lte('bedrooms', filters.maxBedrooms);
  if (filters.bathrooms !== undefined) query = query.gte('bathrooms', filters.bathrooms);
  if (filters.propertyType?.length) query = query.in('property_type', Array.isArray(filters.propertyType) ? filters.propertyType : [filters.propertyType]);
  if (filters.amenities?.length) query = query.contains('amenities', filters.amenities);
  if (filters.bounds) query = query.gte('latitude', filters.bounds.south).lte('latitude', filters.bounds.north).gte('longitude', filters.bounds.west).lte('longitude', filters.bounds.east);
  const sort = filters.sortBy ?? 'date_newest';
  query = query.order(sort.startsWith('price') ? 'price_per_month' : 'created_at', { ascending: sort === 'price_asc' || sort === 'date_oldest' }).order('id');
  if (!countOnly) query = query.range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 40) - 1);
  return query;
}

export async function getPropertyDistricts(): Promise<string[]> {
  const cached=districtCache.get('districts');if(cached)return [...cached];
  const { data, error } = await supabase.from('properties').select('district').eq('status', 'ACTIVE').eq('currency', 'RWF').not('district', 'is', null).order('district').limit(1000);
  if (error) throw error;
  const districts=[...new Set((data ?? []).map(row => row.district).filter((district): district is string => !!district))];
  districtCache.set('districts',districts);return [...districts];
}

export async function countProperties(text: string, filters?: PropertySearchFilters): Promise<number> {
  const { count, error } = await searchQuery(text, filters, true);
  if (error) throw error;
  return count ?? 0;
}


export async function getProperties(filters?: PropertySearchFilters): Promise<PropertyRow[]> {
  return searchProperties('', filters);
}

export async function getPropertyById(
  id: string
): Promise<(PropertyRow & { images: Tables<'property_images'>[] }) | null> {
  const { data, error } = await supabase
    .from('properties')
    .select(PUBLIC_PROPERTY_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;
  const { property_images, ...rest } = data;
  const [row] = await withOwners([{ ...rest, property_images, images: Array.isArray(property_images) ? property_images : [] }]);
  return row as PropertyRow & { images: Tables<'property_images'>[] };
}

export async function getMyProperties(ownerId: string): Promise<Tables<'properties'>[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*, property_images(*)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return withOwners(Array.isArray(data) ? data : []);
}

export async function createProperty(data: Insertable<'properties'>): Promise<Tables<'properties'>> {
  districtCache.clear();
  const { data: created, error } = await supabase
    .from('properties')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return created;
}

export async function updateProperty(
  id: string,
  updates: Updatable<'properties'>
): Promise<Tables<'properties'>> {
  districtCache.clear();
  const { data, error } = await supabase
    .from('properties')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePropertyStatus(
  id: string,
  status: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
): Promise<void> {
  const { error } = await supabase
    .from('properties')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function searchProperties(text: string, filters?: PropertySearchFilters): Promise<PropertyRow[]> {
  const { data, error } = await searchQuery(text, filters);
  if (error) throw error;
  return withOwners((data ?? []) as unknown as PropertyRow[]);
}

export async function addPropertyImage(
  propertyId: string,
  url: string,
  position: number,
  isCover: boolean
): Promise<Tables<'property_images'>> {
  const { data, error } = await supabase
    .from('property_images')
    .insert({ property_id: propertyId, url, position, is_cover: isCover })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePropertyImage(imageId: string, position: number, isCover: boolean): Promise<void> {
  const { error } = await supabase.from('property_images').update({ position, is_cover: isCover }).eq('id', imageId);
  if (error) throw error;
}

export async function deletePropertyImage(imageId: string): Promise<void> {
  const { error } = await supabase.from('property_images').delete().eq('id', imageId);
  if (error) throw error;
}

export async function getCalendarDays(
  propertyId: string,
  month: string
): Promise<Tables<'calendar_days'>[]> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid calendar month');
  const [year, monthNumber] = month.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('calendar_days')
    .select('*')
    .eq('property_id', propertyId)
    .gte('date', `${month}-01`)
    .lt('date', nextMonth);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function bulkUpdateCalendar(
  propertyId: string,
  dates: string[],
  patch: {
    status: 'available' | 'booked' | 'blocked';
    price_override?: number;
    min_nights?: number;
    block_reason?: 'personal' | 'maintenance' | 'other';
  }
): Promise<void> {
  const records = dates.map((date) => ({ property_id: propertyId, date, ...patch }));

  const { error } = await supabase
    .from('calendar_days')
    .upsert(records, { onConflict: 'property_id,date' });

  if (error) throw error;
}

export async function getFavorites(userId: string): Promise<PropertyRow[]> {
  const { data, error } = await supabase.from('favorites').select('property_id,created_at').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  if (!data?.length) return [];
  const { data: rows, error: propertyError } = await supabase.from('properties').select('*, property_images(*)').in('id', data.map(item => item.property_id));
  if (propertyError) throw propertyError;
  const properties = await withOwners(rows ?? []);
  return data.flatMap(item => properties.filter(property => property.id === item.property_id));
}

export async function toggleFavorite(userId: string, propertyId: string, isSaved: boolean): Promise<void> {
  const result = isSaved
    ? await supabase.from('favorites').upsert({ user_id: userId, property_id: propertyId }, { onConflict: 'user_id,property_id', ignoreDuplicates: true })
    : await supabase.from('favorites').delete().eq('user_id', userId).eq('property_id', propertyId);
  if (result.error) throw result.error;
}
