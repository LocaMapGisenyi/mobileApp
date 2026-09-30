import { create } from 'zustand';
import { Property } from '../types';
import { getFavorites, toggleFavorite } from '../services/property.service';
import { toProperty } from '../services/api/property.service';
import { useUserStore } from './user';

interface FavoritesState {
  favoriteIds: string[]; favorites: Property[]; savedIds: string[]; savedItems: Property[];
  isLoading: boolean; error: string | null; lastSorted: 'dateAdded' | 'price' | 'type';
  fetchFavorites: () => Promise<void>; fetchSaved: () => Promise<void>;
  addFavorite: (property: Property) => Promise<void>; removeFavorite: (id: string) => Promise<void>;
  toggleSave: (property: Property) => Promise<void>; removeSaved: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean; isSaved: (id: string) => boolean;
  sortBy: (criterion: 'dateAdded' | 'price' | 'type') => void;
  clearAll: () => Promise<void>; clearError: () => void;
}
let revision = 0;
let accountGeneration = 0;
const pending = new Set<string>();
const stateFor = (properties: Property[]) => ({ favorites: properties, favoriteIds: properties.map(p => p.id), savedItems: properties, savedIds: properties.map(p => p.id) });
export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ...stateFor([]), isLoading: false, error: null, lastSorted: 'dateAdded',
  fetchFavorites: async () => {
    const id = useUserStore.getState().user.id;
    const request = ++revision;
    if (!id) { set({ ...stateFor([]), isLoading: false }); return; }
    set({ isLoading: true, error: null });
    try {
      const rows = await getFavorites(id);
      if (id === useUserStore.getState().user.id && request === revision) set({ ...stateFor(rows.map(toProperty)), isLoading: false });
    } catch (error) { if (id === useUserStore.getState().user.id && request === revision) set({ isLoading: false, error: (error as Error).message }); }
  },
  fetchSaved: async () => get().fetchFavorites(),
  addFavorite: async property => save(property.id, true, property),
  removeFavorite: async id => save(id, false),
  removeSaved: async id => get().removeFavorite(id),
  toggleSave: async property => save(property.id, !get().isFavorite(property.id), property),
  isFavorite: id => get().favoriteIds.includes(id), isSaved: id => get().favoriteIds.includes(id),
  sortBy: criterion => {
    const items = [...get().favorites];
    if (criterion === 'price') items.sort((a, b) => a.price - b.price);
    if (criterion === 'type') items.sort((a, b) => a.type.localeCompare(b.type));
    set({ ...stateFor(items), lastSorted: criterion });
    if (criterion === 'dateAdded') void get().fetchFavorites();
  },
  clearAll: async () => { for (const id of [...get().favoriteIds]) await get().removeFavorite(id); },
  clearError: () => set({ error: null }),
}));
async function save(propertyId: string, saved: boolean, property?: Property) {
  const id = useUserStore.getState().user.id;
  const account = accountGeneration;
  if (!id) { useFavoritesStore.setState({ error: 'Connectez-vous pour enregistrer ce logement.' }); return; }
  const key = `${id}:${propertyId}`;
  if (pending.has(key)) return;
  pending.add(key); revision++;
  useFavoritesStore.setState({ error: null, isLoading: false });
  try {
    await toggleFavorite(id, propertyId, saved);
    if (account !== accountGeneration || id !== useUserStore.getState().user.id) return;
    // Invalidate any refresh started while this mutation was pending.
    revision++;
    const rest = useFavoritesStore.getState().favorites.filter(p => p.id !== propertyId);
    useFavoritesStore.setState(stateFor(saved && property ? [property, ...rest] : rest));
  } catch (error) { if (account === accountGeneration && id === useUserStore.getState().user.id) useFavoritesStore.setState({ error: (error as Error).message }); }
  finally { pending.delete(key); }
}
useUserStore.subscribe((state, previous) => {
  if (state.user.id !== previous.user.id) { accountGeneration++; revision++; pending.clear(); useFavoritesStore.setState({ ...stateFor([]), error: null, isLoading: false }); }
});
