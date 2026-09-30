import { supabase } from '../../lib/supabase';
import * as propSvc from '../property.service';
import type { Updatable } from '../../types/database';
import { uploadPhoto } from '../../lib/storage';
import { Property, SearchFilters } from '../../types';

export const toProperty = (row: propSvc.PropertyRow): Property => {
  const images = row.property_images ?? row.images ?? [];
  const latitude = row.latitude == null ? undefined : Number(row.latitude);
  const longitude = row.longitude == null ? undefined : Number(row.longitude);
  return {
    id: row.id, title: row.title, description: row.description ?? undefined,
    price: Number(row.price_per_month), currency: row.currency,
    bedrooms: row.bedrooms, bathrooms: row.bathrooms, size: row.size ?? undefined,
    visitorsAllowed: row.visitors_allowed, noiseAfter22: row.noise_after22,
    location: { city: row.city, district: row.district ?? undefined, address: row.address ?? undefined,
      country: row.country, latitude, longitude,
      coordinates: latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined },
    owner: { id: row.owner_id, name: row.owner?.full_name ?? 'Hôte', avatar: row.owner?.avatar_url ?? undefined },
    amenities: row.amenities ?? [],
    images: [...images].sort((a, b) => Number(b.is_cover ?? false) - Number(a.is_cover ?? false) || a.position - b.position).map(image => typeof image === 'string' ? image : image.url),
    rating: row.avg_rating == null ? undefined : Number(row.avg_rating), reviews: row.review_count, reviewCount: row.review_count,
    available: row.status === 'ACTIVE', createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    type: row.property_type ?? 'house', propertyType: row.property_type ?? undefined,
    status: row.status, deposit: Number(row.deposit), minDurationMonths: row.min_duration_months,
    noticePeriodDays: row.notice_period_days, accommodationType: row.accommodation_type ?? undefined,
    maxGuests: row.max_guests, smokingAllowed: row.smoking_allowed, petsAllowed: row.pets_allowed,
  };
};

function propertyPatch(property: Partial<Property>): Updatable<'properties'> {
  if (property.currency !== undefined && property.currency !== 'RWF') throw new Error('Le loyer mensuel doit être saisi en RWF.');
  const fields = { title: property.title, description: property.description, price_per_month: property.price, currency: property.currency,
    property_type: property.type, bedrooms: property.bedrooms, bathrooms: property.bathrooms, amenities: property.amenities,
    size: property.size, deposit: property.deposit, min_duration_months: property.minDurationMonths, notice_period_days: property.noticePeriodDays,
    accommodation_type: property.accommodationType, max_guests: property.maxGuests, smoking_allowed: property.smokingAllowed,
    pets_allowed: property.petsAllowed, visitors_allowed: property.visitorsAllowed, noise_after22: property.noiseAfter22,
    city: property.location?.city, district: property.location?.district, address: property.location?.address, country: property.location?.country,
    latitude: property.location?.coordinates?.latitude ?? property.location?.latitude, longitude: property.location?.coordinates?.longitude ?? property.location?.longitude };
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}
async function persistImages(id: string, images: string[]): Promise<void> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Not authenticated');
  const current = await propSvc.getPropertyById(id);
  const old = current?.images ?? [];
  const desired: string[] = [];
  for (const [position, uri] of [...new Set(images)].entries()) {
    const url = /^https:\/\//.test(uri) ? uri : await uploadPhoto(uri, /\.png$/i.test(uri) ? 'image/png' : /\.webp$/i.test(uri) ? 'image/webp' : 'image/jpeg', user.id, 'properties');
    desired.push(url);
    const existing = old.find(image => image.url === url);
    if (!existing) await propSvc.addPropertyImage(id, url, position, position === 0);
    else if (existing.position !== position || existing.is_cover !== (position === 0)) await propSvc.updatePropertyImage(existing.id, position, position === 0);
  }
  for (const image of old) if (!desired.includes(image.url)) await propSvc.deletePropertyImage(image.id);
}

export const propertyService = {
  getAll: async (filters?: propSvc.PropertySearchFilters): Promise<Property[]> => {
    const rows = await propSvc.getProperties(filters);
    return rows.map(toProperty);
  },

  getById: async (id: string): Promise<Property> => {
    const row = await propSvc.getPropertyById(id);
    if (!row) throw new Error('Property not found');
    return toProperty(row);
  },

  search: async (query: string, filters?: SearchFilters & propSvc.PropertySearchFilters): Promise<Property[]> => {
    const rows = await propSvc.searchProperties(query, { ...filters, propertyType: filters?.propertyType ?? filters?.type });
    return rows.map(toProperty);
  },

  create: async (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> => {
    if (propertyData.currency !== 'RWF') throw new Error('Le loyer mensuel doit être saisi en RWF.');
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error('Not authenticated');
    const row = await propSvc.createProperty({
      owner_id: user.id,
      title: propertyData.title,
      description: propertyData.description ?? null,
      property_type: propertyData.type,
      price_per_month: propertyData.price,
      currency: 'RWF',
      status: 'DRAFT',
      city: propertyData.location.city,
      district: propertyData.location.district ?? null,
      address: propertyData.location.address ?? null,
      country: propertyData.location.country ?? 'Rwanda',
      latitude: propertyData.location.coordinates?.latitude ?? propertyData.location.latitude ?? null,
      longitude: propertyData.location.coordinates?.longitude ?? propertyData.location.longitude ?? null,
      amenities: propertyData.amenities ?? [],
      bedrooms: propertyData.bedrooms ?? 1,
      bathrooms: propertyData.bathrooms ?? 1,
    });
    if (propertyData.images.length) {
      try { await persistImages(row.id, propertyData.images); }
      catch (error) { throw Object.assign(new Error((error as Error).message), { propertyId: row.id }); }
      return propertyService.getById(row.id);
    }
    return toProperty(row);
  },

  update: async (id: string, propertyData: Partial<Property>): Promise<Property> => {
    const row = await propSvc.updateProperty(id, propertyPatch(propertyData));
    if (propertyData.images) { await persistImages(id, propertyData.images); return propertyService.getById(id); }
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
