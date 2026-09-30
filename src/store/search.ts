import { create } from 'zustand';
import { Property } from '../types';
import { propertyService } from '../services/api/property.service';
import { useUserStore } from './user';

let searchRequest = 0;
let detailRequest = 0;
const PAGE_SIZE = 40;

// Types pour les filtres de recherche avancée
export interface SearchFilters {
  query: string;
  createdAfter?: string;
  bounds?: { south: number; north: number; west: number; east: number };
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string[];
  bedrooms?: number;
  amenities?: string[];
  nearbyPointOfInterest?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'date_newest' | 'date_oldest';
}

// État du store de recherche
interface SearchState {
  // Données
  listings: Property[];
  filteredListings: Property[];
  selectedListing: Property | null;
  isLoading: boolean;
  error: string | null;

  // Filtres
  filters: SearchFilters;

  hasMore: boolean;
  loadMore: () => Promise<void>;
  // Vue
  viewMode: 'list' | 'map';
  showFiltersModal: boolean;

  // Actions
  setQuery: (query: string) => void;
  setFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  applyFilters: () => void;
  toggleViewMode: () => void;
  toggleFiltersModal: () => void;
  selectListing: (id: string | null) => void;
  fetchListings: () => Promise<void>;
  fetchListingById: (id: string) => Promise<Property | null>;
  clearError: () => void;
}

// Filtres par défaut
const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  sortBy: 'price_asc',
};

// Création du store
export const useSearchStore = create<SearchState>((set, get) => ({
  hasMore: false,
  loadMore: async () => { if (get().hasMore && !get().isLoading) await loadPage(true); },
  // État initial
  listings: [],
  filteredListings: [],
  selectedListing: null,
  isLoading: false,
  error: null,
  filters: DEFAULT_FILTERS,
  viewMode: 'list',
  showFiltersModal: false,

  // Actions
  setQuery: (query: string) => {
    set((state) => ({
      filters: { ...state.filters, query }
    }));
    void get().fetchListings();
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value }
    }));
  },

  setFilters: (filters: Partial<SearchFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters }
    }));
  },

  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS });
    void get().fetchListings();
  },

  applyFilters: () => { void get().fetchListings(); },

  toggleViewMode: () => {
    set((state) => ({
      viewMode: state.viewMode === 'list' ? 'map' : 'list'
    }));
  },

  toggleFiltersModal: () => {
    set((state) => ({
      showFiltersModal: !state.showFiltersModal
    }));
  },

  selectListing: (id: string | null) => {
    detailRequest++;
    if (!id) {
      set({ selectedListing: null });
      return;
    }

    // Si la propriété est déjà dans notre liste, utilisons-la
    const listingInState = get().listings.find((l) => l.id === id);
    if (listingInState) {
      set({ selectedListing: listingInState });
      return;
    }

    // Sinon, chargeons-la depuis l'API
    get().fetchListingById(id);
  },

  fetchListingById: async (id: string) => {
    const request = ++detailRequest;
    set({ error: null, selectedListing: null });
    try {
      const listing = await propertyService.getById(id);
      if (request === detailRequest) set({ selectedListing: listing });
      return listing;
    } catch (error) {
      if (request === detailRequest) set({ error: error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error), selectedListing: null });
      return null;
    }
  },
  fetchListings: async () => loadPage(false),

  clearError: () => {
    set({ error: null });
  }
}));
async function loadPage(append: boolean): Promise<void> {
  const request = ++searchRequest;
  const { filters, listings } = useSearchStore.getState();
  useSearchStore.setState({ isLoading: true, error: null });
  try {
    const incoming = await propertyService.search(filters.query, { ...filters, offset: append ? listings.length : 0, limit: PAGE_SIZE });
    if (request !== searchRequest) return;
    const combined = append ? [...listings, ...incoming.filter(item => !listings.some(existing => existing.id === item.id))] : incoming;
    useSearchStore.setState({ listings: combined, filteredListings: combined, hasMore: incoming.length === PAGE_SIZE, isLoading: false });
  } catch (error) {
    if (request === searchRequest) useSearchStore.setState({ isLoading: false, error: (error as { message?: string })?.message ?? String(error) });
  }
}
useUserStore.subscribe((state, previous) => {
  if (state.user.id !== previous.user.id) {
    searchRequest++; detailRequest++;
    useSearchStore.setState({ listings: [], filteredListings: [], selectedListing: null, isLoading: false, error: null, hasMore: false });
  }
});
