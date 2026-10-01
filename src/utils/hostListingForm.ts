import type { NewListingFormData } from '../store/hostListings';
import type { ListingStatus } from '../services/api/host.service';
import { StackActions } from '@react-navigation/routers';

export function listingSaveAction(
  previousRoutes: readonly { name: string }[],
  propertyId: string,
  saveResult: 'draft' | 'publish',
) {
  const params = { propertyId, saveResult };
  return previousRoutes.some(route => route.name === 'HostListing')
    ? StackActions.popTo('HostListing', params)
    : StackActions.replace('HostListing', params);
}

export function createListingForm(): NewListingFormData {
  return {
    title: '',
    description: '',
    price: 0,
    currency: 'RWF',
    bedrooms: 1,
    bathrooms: 1,
    size: 0,
    amenities: [],
    type: 'apartment',
    accommodationType: 'entier',
    address: '',
    city: 'Gisenyi',
    district: '',
    images: [],
    maxGuests: 2,
    smokingAllowed: false,
    petsAllowed: false,
    minDurationMonths: 1,
    noticePeriodDays: 30,
    depositMonths: 1,
    visitorsAllowed: true,
    noiseAfter22: false,
  };
}

export function listingValidation(
  form: NewListingFormData,
  mode: 'draft' | 'publish',
): Record<string, string> {
  if (mode === 'draft') return {};
  const errors: Record<string, string> = {};
  if (form.title.trim().length < 10) errors.title = 'title';
  if (form.description.trim().length < 50) errors.description = 'description';
  if (!form.city.trim()) errors.city = 'city';
  if (!form.district.trim()) errors.district = 'district';
  if (form.address.trim().length < 5) errors.address = 'address';
  if (
    form.latitude == null ||
    form.longitude == null ||
    !Number.isFinite(form.latitude) ||
    !Number.isFinite(form.longitude) ||
    Math.abs(form.latitude) > 90 ||
    Math.abs(form.longitude) > 180
  )
    errors.location = 'location';
  if (!form.images.length) errors.images = 'images';
  if (!Number.isFinite(form.price) || form.price < 20000 || form.currency !== 'RWF')
    errors.price = 'price';
  return errors;
}

/** Commits UI state only after persistence; the lock closes before the first await. */
export function createListingAction() {
  let busy = false;
  return async function run<T>(
    persist: () => Promise<T>,
    committed?: (result: T) => void,
  ): Promise<T | undefined> {
    if (busy) return undefined;
    busy = true;
    try {
      const result = await persist();
      committed?.(result);
      return result;
    } finally {
      busy = false;
    }
  };
}

export function nextListingStatus(status: ListingStatus): 'PAUSED' | null {
  return status === 'ACTIVE' ? 'PAUSED' : null;
}
