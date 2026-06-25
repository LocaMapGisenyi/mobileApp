import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Property } from '../types';

interface SavedState {
  savedItems: Property[];
  savedIds: string[];
  lastSorted: 'dateAdded' | 'price' | 'type';
  isLoading: boolean;
  error: string | null;

  toggleSave: (property: Property) => void;
  removeSaved: (propertyId: string) => void;
  isSaved: (propertyId: string) => boolean;
  sortBy: (criterion: 'dateAdded' | 'price' | 'type') => void;
  clearAll: () => void;
  clearError: () => void;
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      savedItems: [],
      savedIds: [],
      lastSorted: 'dateAdded',
      isLoading: false,
      error: null,

      toggleSave: (property: Property) => {
        const { savedItems, savedIds } = get();
        const isAlreadySaved = savedIds.includes(property.id);
        if (isAlreadySaved) {
          set({
            savedItems: savedItems.filter(p => p.id !== property.id),
            savedIds: savedIds.filter(id => id !== property.id),
          });
        } else {
          set({
            savedItems: [...savedItems, property],
            savedIds: [...savedIds, property.id],
          });
        }
      },

      removeSaved: (propertyId: string) => {
        const { savedItems, savedIds } = get();
        set({
          savedItems: savedItems.filter(p => p.id !== propertyId),
          savedIds: savedIds.filter(id => id !== propertyId),
        });
      },

      isSaved: (propertyId: string) => {
        return get().savedIds.includes(propertyId);
      },

      sortBy: (criterion) => {
        const { savedItems } = get();
        const sorted = [...savedItems].sort((a, b) => {
          if (criterion === 'price') return a.price - b.price;
          if (criterion === 'type') return a.type.localeCompare(b.type);
          return 0;
        });
        set({ savedItems: sorted, lastSorted: criterion });
      },

      clearAll: () => {
        set({ savedItems: [], savedIds: [] });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'saved-properties-storage',
      version: 2,
      migrate: () => ({ savedItems: [], savedIds: [], lastSorted: 'dateAdded' as const, isLoading: false, error: null }),
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ savedIds: state.savedIds }),
    }
  )
);
