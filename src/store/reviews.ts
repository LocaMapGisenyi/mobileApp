import { create } from 'zustand';
import { Review, ReviewsState, ReviewSortOrder } from '../types';
import { v4 as uuidv4 } from 'uuid';

const useReviewsStore = create<ReviewsState>((set, get) => ({
  reviews: {},
  isLoading: false,
  error: null,

  // Récupérer les avis pour un logement spécifique
  fetchReviews: async (propertyId: string) => {
    set({ isLoading: true, error: null });
    set({ isLoading: false });
  },

  // Ajouter un nouvel avis
  addReview: (review) => {
    set((state) => {
      // Créer un nouvel avis avec ID et date
      const newReview: Review = {
        ...review,
        id: uuidv4(),
        date: new Date(),
      };

      // Si aucun avis n'existe encore pour ce logement, initialiser avec un tableau vide
      const propertyReviews = state.reviews[review.propertyId] || [];

      return {
        reviews: {
          ...state.reviews,
          [review.propertyId]: [...propertyReviews, newReview],
        },
        error: null,
      };
    });
  },

  // Supprimer un avis
  deleteReview: (reviewId, propertyId) => {
    set((state) => {
      const propertyReviews = state.reviews[propertyId] || [];
      
      return {
        reviews: {
          ...state.reviews,
          [propertyId]: propertyReviews.filter(review => review.id !== reviewId),
        },
      };
    });
  },

  // Répondre à un avis (pour les propriétaires)
  replyToReview: (reviewId, propertyId, replyText) => {
    set((state) => {
      const propertyReviews = state.reviews[propertyId] || [];
      
      const updatedReviews = propertyReviews.map(review => {
        if (review.id === reviewId) {
          return {
            ...review,
            ownerReply: {
              text: replyText,
              date: new Date(),
            },
          };
        }
        return review;
      });

      return {
        reviews: {
          ...state.reviews,
          [propertyId]: updatedReviews,
        },
      };
    });
  },

  // Calculer la note moyenne pour un logement
  getAverageRating: (propertyId) => {
    const state = get();
    const propertyReviews = state.reviews[propertyId] || [];
    
    if (propertyReviews.length === 0) {
      return 0;
    }
    
    const sum = propertyReviews.reduce((acc, review) => acc + review.rating, 0);
    return Number((sum / propertyReviews.length).toFixed(1));
  },

  // Récupérer tous les avis pour un logement spécifique
  getReviewsForProperty: (propertyId) => {
    const state = get();
    return state.reviews[propertyId] || [];
  },

  // Récupérer les avis triés
  getSortedReviews: (propertyId, sortOrder: ReviewSortOrder) => {
    const reviews = get().getReviewsForProperty(propertyId);
    
    const sortedReviews = [...reviews];
    
    switch (sortOrder) {
      case 'recent':
        return sortedReviews.sort((a, b) => b.date.getTime() - a.date.getTime());
      case 'highest':
        return sortedReviews.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return sortedReviews.sort((a, b) => a.rating - b.rating);
      default:
        return sortedReviews;
    }
  },
}));

export default useReviewsStore; 