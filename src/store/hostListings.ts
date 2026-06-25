import { create } from 'zustand';
import { Property } from '../types';
import { useSearchStore } from './search';

export interface NewListingFormData {
  title: string;
  description: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  amenities: string[];
  type: string;
  address: string;
  city: string;
  district: string;
  latitude?: number;
  longitude?: number;
  images: string[];
  maxGuests: number;
  smokingAllowed: boolean;
  petsAllowed: boolean;
}

interface HostListingsState {
  hostListings: Property[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addListing: (listingData: NewListingFormData) => void;
  updateListing: (id: string, updatedData: Partial<NewListingFormData>) => void;
  deleteListing: (id: string) => void;
  getHostListings: () => Property[];
}

// Utiliser l'ID de l'hôte actuel pour filtrer les annonces
// (Dans une version réelle, ce serait basé sur l'utilisateur authentifié)
const CURRENT_HOST_ID = 'owner1';

export const useHostListingsStore = create<HostListingsState>((set, get) => ({
  hostListings: [],
  isLoading: false,
  error: null,

  addListing: (listingData) => {
    // Générer un nouvel ID unique
    const newId = `listing-${Date.now()}`;

    // Créer un nouvel objet Property à partir des données du formulaire
    const newListing: Property = {
      id: newId,
      title: listingData.title,
      description: listingData.description,
      price: listingData.price,
      currency: listingData.currency,
      bedrooms: listingData.bedrooms,
      bathrooms: listingData.bathrooms,
      size: listingData.size,
      amenities: listingData.amenities,
      location: {
        city: listingData.city,
        district: listingData.district,
        address: listingData.address,
        coordinates: listingData.latitude && listingData.longitude 
          ? {
              latitude: listingData.latitude,
              longitude: listingData.longitude,
            }
          : undefined
      },
      owner: {
        id: CURRENT_HOST_ID,
        name: 'Jean Mugabo', // Dans un cas réel, on récupérerait le nom de l'utilisateur connecté
        phone: '+250788123456',
        email: 'jmugabo@example.com'
      },
      available: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      type: listingData.type,
      images: listingData.images,
    };

    // Ajouter à l'état local des annonces de l'hôte
    set(state => ({
      hostListings: [...state.hostListings, newListing]
    }));

    // Ajouter également à la liste générale des propriétés dans le store de recherche
    const searchStore = useSearchStore.getState();
    const allListings = [...searchStore.listings, newListing];
    useSearchStore.setState({
      listings: allListings,
      filteredListings: allListings
    });

    return newId;
  },

  updateListing: (id, updatedData) => {
    set(state => {
      const updatedHostListings = state.hostListings.map(listing => {
        if (listing.id === id) {
          // Mettre à jour les propriétés spécifiées
          const updatedListing: Property = {
            ...listing,
            ...(updatedData.title && { title: updatedData.title }),
            ...(updatedData.description && { description: updatedData.description }),
            ...(updatedData.price && { price: updatedData.price }),
            ...(updatedData.currency && { currency: updatedData.currency }),
            ...(updatedData.bedrooms && { bedrooms: updatedData.bedrooms }),
            ...(updatedData.bathrooms && { bathrooms: updatedData.bathrooms }),
            ...(updatedData.size && { size: updatedData.size }),
            ...(updatedData.type && { type: updatedData.type }),
            ...(updatedData.amenities && { amenities: updatedData.amenities }),
            ...(updatedData.images && { images: updatedData.images }),
            location: {
              ...listing.location,
              ...(updatedData.city && { city: updatedData.city }),
              ...(updatedData.district && { district: updatedData.district }),
              ...(updatedData.address && { address: updatedData.address }),
              ...(updatedData.latitude && updatedData.longitude && { 
                coordinates: {
                  latitude: updatedData.latitude,
                  longitude: updatedData.longitude,
                }
              }),
            },
            updatedAt: new Date()
          };
          return updatedListing;
        }
        return listing;
      });
      
      // Mettre à jour également dans le store de recherche
      const searchStore = useSearchStore.getState();
      const updatedAllListings = searchStore.listings.map(listing => {
        if (listing.id === id) {
          const updatedListingInSearch = updatedHostListings.find(l => l.id === id);
          if (updatedListingInSearch) {
            return updatedListingInSearch;
          }
        }
        return listing;
      });

      useSearchStore.setState({
        listings: updatedAllListings,
        filteredListings: updatedAllListings
      });

      return { hostListings: updatedHostListings };
    });
  },

  deleteListing: (id) => {
    set(state => {
      const filteredListings = state.hostListings.filter(listing => listing.id !== id);
      
      // Supprimer également du store de recherche
      const searchStore = useSearchStore.getState();
      const updatedAllListings = searchStore.listings.filter(listing => listing.id !== id);
      
      useSearchStore.setState({
        listings: updatedAllListings,
        filteredListings: updatedAllListings
      });

      return { hostListings: filteredListings };
    });
  },

  getHostListings: () => {
    return get().hostListings;
  }
})); 