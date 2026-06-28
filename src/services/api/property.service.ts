import { supabase } from '../../lib/supabase';
import * as propSvc from '../property.service';
import { Property, SearchFilters } from '../../types';

const toProperty = (row: any): Property => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  price: row.price_per_month,
  currency: row.currency,
  bedrooms: row.bedrooms,
  bathrooms: row.bathrooms,
  location: {
    city: row.city,
    district: row.district ?? undefined,
    address: row.address ?? undefined,
    country: row.country,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
  },
  amenities: row.amenities ?? [],
  images: Array.isArray(row.property_images)
    ? row.property_images.map((i: any) => i.url)
    : (row.images ?? []),
  rating: row.avg_rating ?? undefined,
  reviews: row.review_count ?? undefined,
  available: row.status === 'ACTIVE',
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  type: row.property_type,
  propertyType: row.property_type,
  verified: row.status === 'ACTIVE',
});

export const propertyService = {
  getAll: async (): Promise<Property[]> => {
    const rows = await propSvc.getProperties();
    return rows.map(toProperty);
  },

  getById: async (id: string): Promise<Property> => {
    const row = await propSvc.getPropertyById(id);
    if (!row) throw new Error('Property not found');
    return toProperty(row);
  },

  search: async (query: string, filters?: SearchFilters): Promise<Property[]> => {
    const rows = await propSvc.searchProperties(query, {
      city: filters?.district?.[0],
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
      propertyType: filters?.propertyType,
    });
    return rows.map(toProperty);
  },

  create: async (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const row = await propSvc.createProperty({
      owner_id: user.id,
      title: propertyData.title,
      description: propertyData.description ?? null,
      property_type: propertyData.type,
      price_per_month: propertyData.price,
      currency: propertyData.currency,
      city: propertyData.location.city,
      district: propertyData.location.district ?? null,
      address: propertyData.location.address ?? null,
      country: propertyData.location.country ?? 'Rwanda',
      latitude: propertyData.location.latitude ?? null,
      longitude: propertyData.location.longitude ?? null,
      amenities: propertyData.amenities ?? [],
      bedrooms: propertyData.bedrooms ?? 1,
      bathrooms: propertyData.bathrooms ?? 1,
    } as any);
    return toProperty(row);
  },

  update: async (id: string, propertyData: Partial<Property>): Promise<Property> => {
    const row = await propSvc.updateProperty(id, {
      title: propertyData.title,
      description: propertyData.description ?? null,
    } as any);
    return toProperty(row);
  },

  delete: async (id: string): Promise<void> => {
    await propSvc.updatePropertyStatus(id, 'ARCHIVED');
  },

  getByOwnerId: async (ownerId: string): Promise<Property[]> => {
    const rows = await propSvc.getMyProperties(ownerId);
    return rows.map(toProperty);
  },
};
