export interface ExploreCategory {
  id: string;
  name: string;
  icon: string;
  emoji?: string;
}

export interface ExploreListing {
  id: string;
  title: string;
  type: string;
  price: number;
  currency: string;
  bedrooms: number;
  size: number;
  location: {
    district: string;
    city: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  images: string[];
  rating: number;
  furnished?: boolean;
  longTerm?: boolean;
  forStudents?: boolean;
  nearLake?: boolean;
  available?: boolean;
}

export const exploreCategories: ExploreCategory[] = [
  { id: 'all', name: 'Tous', icon: 'apps', emoji: '🏠' },
  { id: 'apartment', name: 'Appartements', icon: 'apartment', emoji: '🏢' },
  { id: 'house', name: 'Maisons', icon: 'home', emoji: '🏡' },
  { id: 'villa', name: 'Villas', icon: 'villa', emoji: '🏰' },
  { id: 'studio', name: 'Studios', icon: 'meeting-room', emoji: '🚪' },
  { id: 'lake_view', name: 'Vue lac', icon: 'water', emoji: '🌊' },
  { id: 'students', name: 'Étudiants', icon: 'school', emoji: '🎓' },
];

export const exploreListings: ExploreListing[] = [];

export default exploreListings;
