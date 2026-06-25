import { create } from 'zustand';
import { Property } from '../types';
import { mockListings } from '../data/mockListings';

// Types pour les filtres de recherche avancée
export interface SearchFilters {
  query: string;
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
    get().applyFilters();
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
    get().applyFilters();
  },
  
  applyFilters: async () => {
    const { filters, listings } = get();
    const base = listings.length > 0 ? listings : mockListings;

    let result = [...base];

    if (filters.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.location?.city ?? '').toLowerCase().includes(q) ||
        (p.location?.district ?? '').toLowerCase().includes(q)
      );
    }
    if (filters.minPrice !== undefined) result = result.filter(p => p.price >= filters.minPrice!);
    if (filters.maxPrice !== undefined) result = result.filter(p => p.price <= filters.maxPrice!);
    if (filters.bedrooms !== undefined) result = result.filter(p => (p.bedrooms ?? 0) >= filters.bedrooms!);
    if (filters.propertyType?.length) result = result.filter(p => filters.propertyType!.includes(p.type));
    if (filters.amenities?.length) result = result.filter(p =>
      filters.amenities!.every(a => p.amenities?.includes(a))
    );

    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'price_asc': result.sort((a, b) => a.price - b.price); break;
        case 'price_desc': result.sort((a, b) => b.price - a.price); break;
        case 'date_newest': result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
        case 'date_oldest': result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      }
    }

    set({ filteredListings: result, isLoading: false });
  },
  
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
    const inState = get().listings.find(l => l.id === id);
    if (inState) { set({ selectedListing: inState }); return inState; }
    const fromMock = mockListings.find(l => l.id === id) ?? null;
    set({ selectedListing: fromMock, isLoading: false });
    return fromMock;
  },

  fetchListings: async () => {
    set({ isLoading: true, error: null });
    set({
      listings: mockListings,
      filteredListings: mockListings,
      isLoading: false,
    });
  },
  
  clearError: () => {
    set({ error: null });
  }
})); 