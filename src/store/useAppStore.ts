import { create } from 'zustand';
import { Property, SearchFilters, User } from '../types';

interface AppState {
  // État d'authentification
  isAuthenticated: boolean;
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  
  // État des propriétés
  properties: Property[];
  filteredProperties: Property[];
  selectedProperty: Property | null;
  propertiesLoading: boolean;
  propertiesError: string | null;
  
  // Filtres de recherche
  searchFilters: SearchFilters;
  
  // Actions d'authentification
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  
  // Actions de propriétés
  fetchProperties: () => Promise<void>;
  selectProperty: (propertyId: string) => void;
  addToFavorites: (propertyId: string) => void;
  removeFromFavorites: (propertyId: string) => void;
  
  // Actions de filtre
  setSearchFilters: (filters: SearchFilters) => void;
  applyFilters: () => void;
}

// Mock data pour les propriétés
const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Villa moderne à Gisenyi',
    description: 'Belle villa avec vue sur le lac Kivu, entièrement meublée.',
    price: 800,
    currency: 'USD',
    location: {
      address: '123 Rue du Lac',
      city: 'Gisenyi',
      coordinates: {
        latitude: -1.7011,
        longitude: 29.2569,
      },
    },
    bedrooms: 3,
    bathrooms: 2,
    size: 120,
    images: ['https://example.com/image1.jpg'],
    amenities: ['Wifi', 'Parking', 'Sécurité'],
    available: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    type: 'apartment',
    contactInfo: {
      name: 'John Doe',
      phone: '+250123456789',
      email: 'john@example.com',
    },
  },
  {
    id: '2',
    title: 'Appartement au centre-ville',
    description: 'Appartement confortable au centre de Gisenyi.',
    price: 500,
    currency: 'USD',
    location: {
      address: '56 Avenue Centrale',
      city: 'Gisenyi',
      coordinates: {
        latitude: -1.6998,
        longitude: 29.2567,
      },
    },
    bedrooms: 2,
    bathrooms: 1,
    size: 75,
    images: ['https://example.com/image2.jpg'],
    amenities: ['Wifi', 'Eau chaude'],
    available: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    type: 'apartment',
    contactInfo: {
      name: 'Jane Smith',
      phone: '+250987654321',
      email: 'jane@example.com',
    },
  },
];

// Création du store
export const useAppStore = create<AppState>((set, get) => ({
  // État initial
  isAuthenticated: false,
  user: null,
  authLoading: false,
  authError: null,
  
  properties: [],
  filteredProperties: [],
  selectedProperty: null,
  propertiesLoading: false,
  propertiesError: null,
  
  searchFilters: {},
  
  // Actions d'authentification (mockées)
  login: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (email === 'test@example.com' && password === 'password') {
        const mockUser: User = {
          id: '1',
          name: 'Test User',
          fullName: 'Test User',
          email: 'test@example.com',
          favorites: [],
        };
        
        set({ 
          isAuthenticated: true, 
          user: mockUser, 
          authLoading: false 
        });
      } else {
        set({ 
          authError: 'Identifiants invalides', 
          authLoading: false 
        });
      }
    } catch (error) {
      set({ 
        authError: 'Erreur de connexion', 
        authLoading: false 
      });
    }
  },
  
  logout: () => {
    set({ 
      isAuthenticated: false, 
      user: null 
    });
  },
  
  // Actions de propriétés
  fetchProperties: async () => {
    set({ propertiesLoading: true, propertiesError: null });
    try {
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      set({ 
        properties: mockProperties, 
        filteredProperties: mockProperties, 
        propertiesLoading: false 
      });
    } catch (error) {
      set({ 
        propertiesError: 'Erreur lors du chargement des propriétés', 
        propertiesLoading: false 
      });
    }
  },
  
  selectProperty: (propertyId) => {
    const property = get().properties.find(p => p.id === propertyId) || null;
    set({ selectedProperty: property });
  },
  
  addToFavorites: (propertyId) => {
    const user = get().user;
    if (user) {
      const updatedUser = {
        ...user,
        favorites: [...(user.favorites || []), propertyId],
      };
      set({ user: updatedUser });
    }
  },
  
  removeFromFavorites: (propertyId) => {
    const user = get().user;
    if (user) {
      const updatedUser = {
        ...user,
        favorites: (user.favorites || []).filter(id => id !== propertyId),
      };
      set({ user: updatedUser });
    }
  },
  
  // Actions de filtre
  setSearchFilters: (filters) => {
    set({ searchFilters: { ...get().searchFilters, ...filters } });
  },
  
  applyFilters: () => {
    const { properties, searchFilters } = get();
    
    let filtered = [...properties];
    
    // Appliquer les filtres
    if (searchFilters.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= (searchFilters.minPrice || 0));
    }
    
    if (searchFilters.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= (searchFilters.maxPrice || Infinity));
    }
    
    if (searchFilters.bedrooms !== undefined) {
      filtered = filtered.filter(p => (p.bedrooms || 0) >= (searchFilters.bedrooms || 0));
    }

    if (searchFilters.bathrooms !== undefined) {
      filtered = filtered.filter(p => (p.bathrooms || 0) >= (searchFilters.bathrooms || 0));
    }
    
    if (searchFilters.minSize !== undefined) {
      filtered = filtered.filter(p => (p.size || 0) >= (searchFilters.minSize || 0));
    }

    if (searchFilters.maxSize !== undefined) {
      filtered = filtered.filter(p => (p.size || 0) <= (searchFilters.maxSize || Infinity));
    }
    
    if (searchFilters.amenities && searchFilters.amenities.length > 0) {
      filtered = filtered.filter(p => 
        searchFilters.amenities?.every(amenity => (p.amenities || []).includes(amenity))
      );
    }
    
    set({ filteredProperties: filtered });
  },
})); 