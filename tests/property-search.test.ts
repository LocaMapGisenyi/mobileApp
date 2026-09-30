import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ getProperties: vi.fn(), getPropertyById: vi.fn(), searchProperties: vi.fn(), getMyProperties: vi.fn(), updateProperty: vi.fn() }));
vi.mock('../src/services/property.service', () => api);
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { getUser: vi.fn() }, from: vi.fn() } }));
vi.mock('../src/store/user', () => ({ useUserStore: { getState: () => ({ user: { id: 'a' } }), subscribe: vi.fn() } }));
import { propertyService } from '../src/services/api/property.service';
import { useSearchStore } from '../src/store/search';
const row = { id: 'p', owner_id: 'host', title: 'Lake home', price_per_month: 200000, currency: 'RWF', latitude: 0, longitude: 29, status: 'ACTIVE', city: 'Gisenyi', property_type: 'house', created_at: '2026-09-01', updated_at: '2026-09-01', images: [{ url: 'https://img/second', position: 2 }, { url: 'https://img/cover', position: 0, is_cover: true }] };
beforeEach(() => { vi.clearAllMocks(); api.getProperties.mockResolvedValue([row]); api.searchProperties.mockResolvedValue([row]); api.getPropertyById.mockResolvedValue(row); useSearchStore.setState({ listings: [], filteredListings: [], selectedListing: null, error: null, filters: { query: '', sortBy: 'price_asc' } }); });
describe('property data boundary', () => {
  it('keeps monthly RWF price and supplies owner, zero coordinates and ordered URL images', async () => {
    const result = await propertyService.getById('p');
    expect(result.price).toBe(200000);
    expect(result.location.coordinates).toEqual({ latitude: 0, longitude: 29 });
    expect(result.owner?.id).toBe('host');
    expect(result.images).toEqual(['https://img/cover', 'https://img/second']);
  });
  it('loads backend listings and preserves them when refresh fails', async () => {
    await useSearchStore.getState().fetchListings();
    expect(useSearchStore.getState().filteredListings.map(p => p.id)).toEqual(['p']);
    api.getProperties.mockRejectedValueOnce(new Error('Offline'));
    api.searchProperties.mockRejectedValueOnce(new Error('Offline'));
    await useSearchStore.getState().fetchListings();
    expect(useSearchStore.getState().listings.map(p => p.id)).toEqual(['p']);
    expect(useSearchStore.getState().error).toBe('Offline');
  });
  it('ignores a stale refresh that finishes after a newer request', async () => {
    let finish!: (rows: unknown[]) => void;
    api.getProperties.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    api.searchProperties.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const first = useSearchStore.getState().fetchListings();
    await useSearchStore.getState().fetchListings();
    finish([{ ...row, id: 'stale' }]);
    await first;
    expect(useSearchStore.getState().listings.map(p => p.id)).toEqual(['p']);
  });
  it('fetches a detail that was never loaded in the search cache', async () => {
    expect((await useSearchStore.getState().fetchListingById('p'))?.id).toBe('p');
  });
});

it('updates the monthly price without erasing an omitted description', async () => {
  api.updateProperty.mockImplementation(async (_id, patch) => ({ ...row, ...patch }));
  const result = await propertyService.update('p', { price: 250000 });
  expect(result.price).toBe(250000);
  expect(api.updateProperty.mock.calls[0][1]).not.toHaveProperty('description');
});
it('does not reopen a selected property after the user dismisses it', async () => {
  let resolve!: (value: unknown) => void;
  api.getPropertyById.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const pending = useSearchStore.getState().fetchListingById('p');
  useSearchStore.getState().selectListing(null);
  resolve(row);
  await pending;
  expect(useSearchStore.getState().selectedListing).toBeNull();
});
