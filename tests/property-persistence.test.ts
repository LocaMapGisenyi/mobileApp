import { beforeEach, expect, it, vi } from 'vitest';
const deps = vi.hoisted(() => ({ user: { id: 'a' as string | null }, listeners: [] as ((state: unknown, prev: unknown) => void)[], toggleFavorite: vi.fn(), getFavorites: vi.fn(), createProperty: vi.fn(), updateProperty: vi.fn(), updatePropertyStatus: vi.fn(), addPropertyImage: vi.fn(), getPropertyById: vi.fn(), deletePropertyImage: vi.fn(), updatePropertyImage: vi.fn(), uploadPhoto: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { getUser: vi.fn(async () => ({ data: { user: deps.user }, error: null })) } } }));
vi.mock('../src/lib/storage', () => ({ uploadPhoto: deps.uploadPhoto }));
vi.mock('../src/store/user', () => ({ useUserStore: { getState: () => ({ user: deps.user }), subscribe: (fn: typeof deps.listeners[number]) => deps.listeners.push(fn) } }));
vi.mock('../src/services/property.service', () => ({ toggleFavorite: deps.toggleFavorite, getFavorites: deps.getFavorites, createProperty: deps.createProperty, updateProperty: deps.updateProperty, updatePropertyStatus: deps.updatePropertyStatus, addPropertyImage: deps.addPropertyImage, getPropertyById: deps.getPropertyById, deletePropertyImage: deps.deletePropertyImage, updatePropertyImage: deps.updatePropertyImage }));
import { useFavoritesStore } from '../src/store/favorites';
import { useHostListingsStore } from '../src/store/hostListings';
import { createListingForm } from '../src/utils/hostListingForm';
const property: any = { id: 'p', title: 'Home', price: 200000, currency: 'RWF', images: [], location: { city: 'Gisenyi' } };
beforeEach(() => { vi.clearAllMocks(); deps.updatePropertyStatus.mockReset(); deps.updateProperty.mockReset(); deps.getPropertyById.mockReset(); deps.user.id = 'a'; useFavoritesStore.setState({ favoriteIds: [], favorites: [], error: null }); useHostListingsStore.setState({ hostListings: [], error: null, draftId: null, isLoading: false }); });
it('does not invent a favorite when the database rejects saving it', async () => {
  deps.toggleFavorite.mockRejectedValueOnce(new Error('Offline'));
  await useFavoritesStore.getState().addFavorite(property);
  expect(useFavoritesStore.getState().favoriteIds).toEqual([]);
  expect(useFavoritesStore.getState().error).toBe('Offline');
});
it('does not repopulate favorites after switching accounts during a save', async () => {
  let done!: () => void;
  deps.toggleFavorite.mockReturnValueOnce(new Promise<void>(resolve => { done = resolve; }));
  const save = useFavoritesStore.getState().addFavorite(property);
  await Promise.resolve();
  const prev = { user: { id: 'a' } }; deps.user.id = 'b';
  deps.listeners.forEach(fn => fn({ user: { id: 'b' } }, prev));
  done(); await save;
  expect(useFavoritesStore.getState().favoriteIds).toEqual([]);
});
it('retains the persisted draft id when photo upload fails so retry does not duplicate an announcement', async () => {
  deps.createProperty.mockResolvedValue({ id: 'server-draft' });
  deps.uploadPhoto.mockRejectedValueOnce(new Error('Upload interrupted'));
  const form: any = { title: 'Home', description: 'Description', price: 200000, currency: 'RWF', city: 'Gisenyi', district: 'Centre', address: 'Road', type: 'house', bedrooms: 1, bathrooms: 1, images: ['file:///photo.jpg'], amenities: [] };
  await expect(useHostListingsStore.getState().addListing(form, 'publish')).rejects.toThrow('Upload interrupted');
  expect((useHostListingsStore.getState() as any).draftId).toBe('server-draft');
});
it('rejects a late favorite completion even if the original account logs back in', async () => {
  let done!: () => void;
  deps.toggleFavorite.mockReturnValueOnce(new Promise<void>(resolve => { done = resolve; }));
  const save = useFavoritesStore.getState().addFavorite(property);
  await Promise.resolve();
  deps.user.id = 'b'; deps.listeners.forEach(fn => fn({ user: { id: 'b' } }, { user: { id: 'a' } }));
  deps.user.id = 'a'; deps.listeners.forEach(fn => fn({ user: { id: 'a' } }, { user: { id: 'b' } }));
  done(); await save;
  expect(useFavoritesStore.getState().favoriteIds).toEqual([]);
});
it('rejects a non-RWF form instead of relabeling its monthly amount', async () => {
  const form: any = { title: 'Home', price: 300, currency: 'USD', images: [] };
  deps.createProperty.mockResolvedValue({ id: 'wrong-currency' });
  await expect(useHostListingsStore.getState().addListing(form, 'draft')).rejects.toThrow('RWF');
});

it('removes a photo deleted while resuming a persisted draft', async () => {
  const server: any = { id: 'draft', owner_id: 'a', title: 'Home', currency: 'RWF', price_per_month: 200000, city: 'Gisenyi', created_at: '2026-09-01', updated_at: '2026-09-01', images: [{ id: 'old-photo', url: 'https://img/old', position: 0, is_cover: true }] };
  deps.updateProperty.mockResolvedValue(server);
  deps.getPropertyById.mockResolvedValue(server);
  const form: any = { title: 'Home', price: 200000, currency: 'RWF', images: [] };
  await useHostListingsStore.getState().addListing(form, 'draft', 'draft');
  expect(deps.deletePropertyImage).toHaveBeenCalledWith('old-photo');
});

it('pauses an active listing before saving incomplete draft fields', async () => {
  const transitions: string[] = [];
  const server = { id: 'active', owner_id: 'a', title: 'Maison', status: 'ACTIVE', currency: 'RWF', price_per_month: 200000, city: 'Gisenyi', created_at: '2026-09-01', updated_at: '2026-09-01', images: [] };
  deps.getPropertyById.mockImplementation(async () => ({ ...server }));
  deps.updatePropertyStatus.mockImplementation(async (_id, status) => { server.status = status; transitions.push(status); });
  deps.updateProperty.mockImplementation(async (_id, data) => {
    if (server.status === 'ACTIVE' && data.status === 'DRAFT') throw new Error('Invalid moderation transition');
    Object.assign(server, data); transitions.push(data.status); return { ...server };
  });
  await expect(useHostListingsStore.getState().addListing(createListingForm(), 'draft', 'active')).resolves.toBe('active');
  expect(transitions).toEqual(['PAUSED', 'DRAFT']);
  expect(server.title).toBe('Brouillon');
});

it('aborts field and photo writes when pausing the active listing fails', async () => {
  deps.getPropertyById.mockResolvedValue({ id: 'active', status: 'ACTIVE', images: [] });
  deps.updatePropertyStatus.mockRejectedValueOnce(new Error('Pause unavailable'));
  await expect(useHostListingsStore.getState().addListing({ ...createListingForm(), images: ['file:///home.jpg'] }, 'draft', 'active')).rejects.toThrow('Pause unavailable');
  expect(deps.updateProperty).not.toHaveBeenCalled();
  expect(deps.uploadPhoto).not.toHaveBeenCalled();
  expect(deps.addPropertyImage).not.toHaveBeenCalled();
});

it('does not save another account’s fields after a delayed pause completes', async () => {
  let finishPause!: () => void;
  deps.getPropertyById.mockResolvedValue({ id: 'active', status: 'ACTIVE', images: [] });
  deps.updatePropertyStatus.mockImplementation(() => new Promise<void>(resolve => { finishPause = resolve; }));
  const saving = useHostListingsStore.getState().addListing(createListingForm(), 'draft', 'active');
  await vi.waitFor(() => expect(deps.updatePropertyStatus).toHaveBeenCalled());
  deps.user.id = 'b';
  deps.listeners.forEach(listener => listener({ user: { id: 'b' } }, { user: { id: 'a' } }));
  finishPause();
  await expect(saving).rejects.toThrow('Le compte a changé.');
  expect(deps.updateProperty).not.toHaveBeenCalled();
  expect(useHostListingsStore.getState().hostListings).toEqual([]);
});
