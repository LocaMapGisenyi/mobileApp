import { create } from 'zustand';
import { Property } from '../types';
import { useUserStore } from './user';
import { supabase } from '../lib/supabase';
import { uploadPhoto } from '../lib/storage';
import * as propertyApi from '../services/property.service';
import { toProperty } from '../services/api/property.service';

export interface NewListingFormData {
  title: string; description: string; price: number; currency: string; bedrooms: number; bathrooms: number;
  size: number; amenities: string[]; type: string; address: string; city: string; district: string;
  latitude?: number; longitude?: number; images: string[]; imageMimeTypes?: Record<string, string>;
  maxGuests: number; smokingAllowed: boolean; petsAllowed: boolean; accommodationType?: string;
  minDurationMonths?: number; noticePeriodDays?: number; depositMonths?: number;
  visitorsAllowed?: boolean; noiseAfter22?: boolean;
}
interface HostListingsState {
  hostListings: Property[]; isLoading: boolean; error: string | null; draftId: string | null;
  addListing: (data: NewListingFormData, mode?: 'draft' | 'publish', id?: string) => Promise<string>;
  updateListing: (id: string, data: Partial<NewListingFormData>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  getHostListings: () => Property[]; fetchHostListings: () => Promise<void>;
  resetDraft: () => void;
}
let accountGeneration = 0;
const uploaded = new Map<string, string>();
const types: Record<string, string> = { appartement: 'apartment', maison: 'house', chambre: 'room' };
export const useHostListingsStore = create<HostListingsState>((set, get) => ({
  hostListings: [], isLoading: false, error: null, draftId: null,
  resetDraft: () => { set({ draftId: null }); uploaded.clear(); },
  addListing: async (form, mode = 'draft', existingId) => {
    if (form.currency !== 'RWF') throw new Error('Saisissez le loyer mensuel en RWF. Aucune conversion automatique ne sera appliquée.');
    if (get().isLoading) throw new Error('Enregistrement en cours.');
    const accountId = useUserStore.getState().user.id;
    const account = accountGeneration;
    const ensureAccount = () => { if (account !== accountGeneration || accountId !== useUserStore.getState().user.id) throw new Error('Le compte a changé.'); };
    set({ isLoading: true, error: null });
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      ensureAccount();
      if (error) throw error;
      if (!user || user.id !== accountId) throw new Error('Connectez-vous pour enregistrer une annonce.');
      const data = {
        owner_id: user.id, title: form.title.trim() || 'Brouillon', description: form.description,
        property_type: types[form.type] ?? form.type, status: 'DRAFT' as const, price_per_month: form.price,
        currency: 'RWF', city: form.city, district: form.district, address: form.address, country: 'Rwanda',
        latitude: form.latitude ?? null, longitude: form.longitude ?? null,
        bedrooms: form.bedrooms, bathrooms: form.bathrooms, amenities: form.amenities,
        accommodation_type: form.accommodationType, max_guests: form.maxGuests,
        smoking_allowed: form.smokingAllowed, pets_allowed: form.petsAllowed,
        min_duration_months: form.minDurationMonths ?? 1, notice_period_days: form.noticePeriodDays ?? 30,
        deposit: (form.depositMonths ?? 1) * form.price,
        size: form.size > 0 ? form.size : null, visitors_allowed: form.visitorsAllowed ?? true, noise_after22: form.noiseAfter22 ?? false,
      };
      const id = existingId ?? get().draftId;
      if (id) {
        const previous = await propertyApi.getPropertyById(id);
        ensureAccount();
        // ACTIVE cannot transition directly to DRAFT. Pause before writing
        // incomplete edits; publishing still goes through administrative review.
        if (previous?.status === 'ACTIVE') {
          await propertyApi.updatePropertyStatus(id, 'PAUSED');
          ensureAccount();
        }
      }
      ensureAccount();
      const row = id ? await propertyApi.updateProperty(id, data) : await propertyApi.createProperty(data);
      ensureAccount();
      set({ draftId: row.id });
      const current = id ? await propertyApi.getPropertyById(row.id) : null;
      ensureAccount();
      const currentImages = current?.images ?? [];
      const existing = new Set(currentImages.map(image => image.url));
      const desired: string[] = [];
      for (const [position, uri] of form.images.entries()) {
        ensureAccount();
        let url = uploaded.get(uri) ?? uri;
        if (!/^https:\/\//i.test(uri)) {
          if (!uploaded.has(uri)) {
            const mimeType = form.imageMimeTypes?.[uri] ?? (/\.png(?:\?|$)/i.test(uri) ? 'image/png' : /\.webp(?:\?|$)/i.test(uri) ? 'image/webp' : 'image/jpeg');
            url = await uploadPhoto(uri, mimeType, user.id, 'properties');
            ensureAccount();
            uploaded.set(uri, url);
          }
        }
        ensureAccount();
        desired.push(url);
        if (!existing.has(url)) {
          await propertyApi.addPropertyImage(row.id, url, position, position === 0);
          ensureAccount();
          existing.add(url);
        } else {
          const photo = currentImages.find(image => image.url === url);
          if (photo && (photo.position !== position || photo.is_cover !== (position === 0))) await propertyApi.updatePropertyImage(photo.id, position, position === 0);
          ensureAccount();
        }
      }
      for (const photo of currentImages) {
        ensureAccount();
        if (!desired.includes(photo.url)) await propertyApi.deletePropertyImage(photo.id);
        ensureAccount();
      }
      if (mode === 'publish') {
        ensureAccount();
        if (!form.images.length) throw new Error('Ajoutez au moins une photo.');
        await propertyApi.updateProperty(row.id, { status: 'PENDING_REVIEW' });
      }
      ensureAccount();
      const complete = await propertyApi.getPropertyById(row.id);
      ensureAccount();
      if (complete) set(state => ({ hostListings: [toProperty(complete), ...state.hostListings.filter(item => item.id !== row.id)] }));
      set({ isLoading: false });
      return row.id;
    } catch (error) {
      if (account === accountGeneration && accountId === useUserStore.getState().user.id) set({ isLoading: false, error: (error as Error).message });
      throw error;
    }
  },
  updateListing: async (id, data) => {
    const row = await propertyApi.getPropertyById(id);
    if (!row) throw new Error('Logement introuvable');
    await get().addListing({ ...toForm(row), ...data }, 'draft', id);
  },
  deleteListing: async id => { await propertyApi.updatePropertyStatus(id, 'ARCHIVED'); await get().fetchHostListings(); },
  getHostListings: () => get().hostListings,
  fetchHostListings: async () => {
    const userId = useUserStore.getState().user.id;
    const account = accountGeneration;
    if (!userId) { set({ hostListings: [] }); return; }
    set({ isLoading: true, error: null });
    try { const rows = await propertyApi.getMyProperties(userId); if (account === accountGeneration && userId === useUserStore.getState().user.id) set({ hostListings: rows.map(toProperty), isLoading: false }); }
    catch (error) { if (account === accountGeneration && userId === useUserStore.getState().user.id) set({ error: (error as Error).message, isLoading: false }); }
  },
}));
export function toForm(row: propertyApi.PropertyRow): NewListingFormData {
  if (row.currency !== 'RWF') throw new Error('Cette annonce utilise une autre devise. Un nouveau prix en RWF doit être défini avant sa modification.');
  return { title: row.title, description: row.description ?? '', price: Number(row.price_per_month), currency: 'RWF',
    bedrooms: row.bedrooms, bathrooms: row.bathrooms, size: row.size ?? 0, visitorsAllowed: row.visitors_allowed, noiseAfter22: row.noise_after22, amenities: row.amenities ?? [], type: row.property_type ?? 'house',
    address: row.address ?? '', city: row.city, district: row.district ?? '', latitude: row.latitude ?? undefined, longitude: row.longitude ?? undefined,
    images: toProperty(row).images, maxGuests: row.max_guests, smokingAllowed: row.smoking_allowed, petsAllowed: row.pets_allowed,
    accommodationType: row.accommodation_type ?? 'entier', minDurationMonths: row.min_duration_months, noticePeriodDays: row.notice_period_days,
    depositMonths: row.price_per_month ? row.deposit / row.price_per_month : 1 };
}
useUserStore.subscribe((state, previous) => {
  if (state.user.id !== previous.user.id) { accountGeneration++; uploaded.clear(); useHostListingsStore.setState({ hostListings: [], draftId: null, isLoading: false, error: null }); }
});
