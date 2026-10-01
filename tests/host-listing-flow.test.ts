import { describe, expect, it, vi } from 'vitest';
import {
  createListingAction,
  createListingForm,
  listingValidation,
  listingSaveAction,
  nextListingStatus,
} from '../src/utils/hostListingForm';

vi.mock('../src/lib/supabase', () => ({ supabase: {} }));
vi.mock('../src/lib/storage', () => ({ uploadPhoto: vi.fn() }));
vi.mock('../src/store/user', () => ({
  useUserStore: { subscribe: vi.fn(), getState: () => ({ user: { id: 'host' } }) },
}));
import { toForm } from '../src/store/hostListings';
import type { PropertyRow } from '../src/services/property.service';
import { CommonActions, StackRouter } from '@react-navigation/routers';

describe('successful listing return', () => {
  const options = {
    routeNames: ['HostDashboard', 'HostListing', 'CreateListing'],
    routeParamList: {},
    routeGetIdList: {},
  };
  it.each(['draft', 'publish'] as const)(
    'replaces the creation route after %s so system back cannot reopen the editor',
    saveResult => {
      const router = StackRouter({});
      const state = router.getRehydratedState(
        {
          stale: true,
          routes: [
            { key: 'dashboard', name: 'HostDashboard' },
            { key: 'editor', name: 'CreateListing' },
          ],
        },
        options,
      );
      const saved = router.getStateForAction(
        state,
        listingSaveAction(state.routes.slice(0, state.index), 'new-property', saveResult),
        options,
      )!;
      expect(saved.routes.map(route => route.name)).toEqual(['HostDashboard', 'HostListing']);
      expect(saved.routes[saved.index].params).toEqual({ propertyId: 'new-property', saveResult });
      const back = router.getStateForAction(saved, CommonActions.goBack(), options)!;
      expect(back.routes.map(route => route.name)).toEqual(['HostDashboard']);
    },
  );
  it.each(['draft', 'publish'] as const)(
    'returns to the existing property route after %s without duplicating it',
    saveResult => {
      const router = StackRouter({});
      const state = router.getRehydratedState(
        {
          stale: true,
          routes: [
            { key: 'dashboard', name: 'HostDashboard' },
            { key: 'property', name: 'HostListing', params: { propertyId: 'existing-property' } },
            { key: 'editor', name: 'CreateListing' },
          ],
        },
        options,
      );
      const saved = router.getStateForAction(
        state,
        listingSaveAction(state.routes.slice(0, state.index), 'existing-property', saveResult),
        options,
      )!;
      expect(saved.routes.map(route => route.key)).toEqual(['dashboard', 'property']);
      expect(saved.routes[saved.index].params).toEqual({
        propertyId: 'existing-property',
        saveResult,
      });
    },
  );
});

describe('host listing submission', () => {
  it('allows an incomplete draft without publication requirements', () => {
    expect(listingValidation(createListingForm(), 'draft')).toEqual({});
  });
  it('checks every required section before publication', () => {
    const form = { ...createListingForm(), city: '', latitude: undefined, longitude: undefined };
    expect(Object.keys(listingValidation(form, 'publish')).sort()).toEqual([
      'address',
      'city',
      'description',
      'district',
      'images',
      'location',
      'price',
      'title',
    ]);
  });
  it('accepts a complete listing and rejects invalid map coordinates and non-finite prices', () => {
    const form = {
      ...createListingForm(),
      title: 'Maison avec jardin',
      description: 'Une maison lumineuse avec un grand jardin et une cuisine équipée.',
      address: 'Rue du lac',
      district: 'Rubavu',
      latitude: -1.7,
      longitude: 29.2,
      price: 200000,
      images: ['https://img/home'],
    };
    expect(listingValidation(form, 'publish')).toEqual({});
    expect(listingValidation({ ...form, latitude: 92, price: Infinity }, 'publish')).toMatchObject({
      location: 'location',
      price: 'price',
    });
  });
  it('retains photos, all rules and rental terms when reopening an existing property', () => {
    const row = {
      title: 'Maison',
      description: 'Description',
      currency: 'RWF',
      price_per_month: 200000,
      deposit: 400000,
      bedrooms: 2,
      bathrooms: 1,
      max_guests: 4,
      property_type: 'house',
      city: 'Gisenyi',
      district: 'Rubavu',
      address: 'Rue du lac',
      latitude: -1.7,
      longitude: 29.2,
      size: 90,
      amenities: ['wifi'],
      smoking_allowed: true,
      pets_allowed: true,
      visitors_allowed: false,
      noise_after22: true,
      min_duration_months: 6,
      notice_period_days: 60,
      accommodation_type: 'privee',
      images: [
        { url: 'https://img/second', position: 1, is_cover: false },
        { url: 'https://img/cover', position: 0, is_cover: true },
      ],
    } as PropertyRow;
    expect(toForm(row)).toMatchObject({
      images: ['https://img/cover', 'https://img/second'],
      smokingAllowed: true,
      petsAllowed: true,
      visitorsAllowed: false,
      noiseAfter22: true,
      minDurationMonths: 6,
      noticePeriodDays: 60,
      depositMonths: 2,
      accommodationType: 'privee',
      size: 90,
      maxGuests: 4,
    });
  });
});

describe('host listing mutations', () => {
  it.each(['archive', 'status'])('keeps data and success untouched when %s fails', async () => {
    const action = createListingAction();
    const state = { rows: ['property'], success: false };
    await expect(
      action(
        async () => {
          throw new Error('Offline');
        },
        () => {
          state.rows = [];
          state.success = true;
        },
      ),
    ).rejects.toThrow('Offline');
    expect(state).toEqual({ rows: ['property'], success: false });
    await action(
      async () => 'ok',
      () => {
        state.success = true;
      },
    );
    expect(state.success).toBe(true);
  });
  it('blocks a duplicate submission synchronously until the first resolves', async () => {
    const action = createListingAction();
    let resolve!: (id: string) => void;
    let requests = 0;
    const first = action(() => {
      requests++;
      return new Promise<string>(done => {
        resolve = done;
      });
    });
    expect(
      await action(async () => {
        requests++;
        return 'duplicate';
      }),
    ).toBeUndefined();
    expect(requests).toBe(1);
    resolve('saved-id');
    expect(await first).toBe('saved-id');
    expect(await action(async () => 'retry')).toBe('retry');
  });
  it('does not offer activation for listings awaiting moderation', () => {
    expect(nextListingStatus('ACTIVE')).toBe('PAUSED');
    for (const status of ['PAUSED', 'DRAFT', 'PENDING_REVIEW', 'SUSPENDED', 'ARCHIVED'] as const)
      expect(nextListingStatus(status)).toBeNull();
  });
});
