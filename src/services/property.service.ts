import { supabase } from '../lib/supabase';
import type { Tables, Insertable, Updatable } from '../types/database';

export async function getProperties(filters?: {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  propertyType?: string;
  amenities?: string[];
  status?: string;
}): Promise<Tables<'properties'>[]> {
  try {
    let query = supabase
      .from('properties')
      .select('*, property_images(url, is_cover, position)')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    } else {
      query = query.eq('status', 'ACTIVE');
    }

    if (filters?.city) query = query.eq('city', filters.city);
    if (filters?.minPrice !== undefined) query = query.gte('price_per_month', filters.minPrice);
    if (filters?.maxPrice !== undefined) query = query.lte('price_per_month', filters.maxPrice);
    if (filters?.bedrooms !== undefined) query = query.eq('bedrooms', filters.bedrooms);
    if (filters?.propertyType) query = query.eq('property_type', filters.propertyType);
    if (filters?.amenities?.length) query = query.contains('amenities', filters.amenities);

    const { data, error } = await query;
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw err;
  }
}

export async function getPropertyById(
  id: string
): Promise<(Tables<'properties'> & { images: Tables<'property_images'>[] }) | null> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (!data) return null;
    const { property_images, ...rest } = data as any;
    return { ...rest, images: Array.isArray(property_images) ? property_images : [] };
  } catch (err) {
    throw err;
  }
}

export async function getMyProperties(ownerId: string): Promise<Tables<'properties'>[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(url, is_cover)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw err;
  }
}

export async function createProperty(data: Insertable<'properties'>): Promise<Tables<'properties'>> {
  try {
    const { data: created, error } = await supabase
      .from('properties')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  } catch (err) {
    throw err;
  }
}

export async function updateProperty(
  id: string,
  updates: Updatable<'properties'>
): Promise<Tables<'properties'>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
}

export async function updatePropertyStatus(
  id: string,
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
): Promise<void> {
  try {
    const { error } = await supabase
      .from('properties')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  } catch (err) {
    throw err;
  }
}

export async function searchProperties(
  query: string,
  filters?: {
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    propertyType?: string[];
  }
): Promise<Tables<'properties'>[]> {
  try {
    let q = supabase
      .from('properties')
      .select('*, property_images(url, is_cover)')
      .eq('status', 'ACTIVE')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,city.ilike.%${query}%`);

    if (filters?.city) q = q.eq('city', filters.city);
    if (filters?.minPrice !== undefined) q = q.gte('price_per_month', filters.minPrice);
    if (filters?.maxPrice !== undefined) q = q.lte('price_per_month', filters.maxPrice);
    if (filters?.propertyType?.length) q = q.in('property_type', filters.propertyType);

    const { data, error } = await q;
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw err;
  }
}

export async function addPropertyImage(
  propertyId: string,
  url: string,
  position: number,
  isCover: boolean
): Promise<Tables<'property_images'>> {
  try {
    const { data, error } = await supabase
      .from('property_images')
      .insert({ property_id: propertyId, url, position, is_cover: isCover })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
}

export async function deletePropertyImage(imageId: string): Promise<void> {
  try {
    const { error } = await supabase.from('property_images').delete().eq('id', imageId);
    if (error) throw error;
  } catch (err) {
    throw err;
  }
}

export async function getCalendarDays(
  propertyId: string,
  month: string
): Promise<Tables<'calendar_days'>[]> {
  try {
    const { data, error } = await supabase
      .from('calendar_days')
      .select('*')
      .eq('property_id', propertyId)
      .gte('date', `${month}-01`)
      .lte('date', `${month}-31`);

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw err;
  }
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
  try {
    const records = dates.map((date) => ({ property_id: propertyId, date, ...patch }));

    const { error } = await supabase
      .from('calendar_days')
      .upsert(records, { onConflict: 'property_id,date' });

    if (error) throw error;
  } catch (err) {
    throw err;
  }
}

export async function toggleFavorite(
  userId: string,
  propertyId: string,
  isSaved: boolean
): Promise<void> {
  try {
    if (isSaved) {
      const { error } = await supabase
        .from('alerts')
        .insert({ user_id: userId, name: 'favorite', filters: { propertyId } });
      if (error) throw error;
    } else {
      const { data: existing, error: fetchError } = await supabase
        .from('alerts')
        .select('id')
        .eq('user_id', userId)
        .eq('name', 'favorite')
        .filter('filters->>propertyId', 'eq', propertyId);

      if (fetchError) throw fetchError;

      if (Array.isArray(existing) && existing.length > 0) {
        const ids = existing.map((r: any) => r.id);
        const { error: deleteError } = await supabase.from('alerts').delete().in('id', ids);
        if (deleteError) throw deleteError;
      }
    }
  } catch (err) {
    throw err;
  }
}
