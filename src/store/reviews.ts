import { create } from 'zustand';
import { Review, ReviewsState, ReviewSortOrder } from '../types';
import { reviewService } from '../services/api/review.service';
import { useUserStore } from './user';
let generation = 0;
const requests = new Map<string, number>();

const useReviewsStore = create<Omit<ReviewsState, 'addReview'> & { addReview: (review: Omit<Review, 'id' | 'date'> & { bookingId?: string }) => Promise<void> }>((set, get) => ({
  reviews: {},
  isLoading: false,
  error: null,

  fetchReviews: async propertyId => {
    const request = (requests.get(propertyId) ?? 0) + 1;
    requests.set(propertyId, request);
    const account = generation;
    set({ isLoading: true, error: null });
    try {
      const reviews = await reviewService.getReviewsByPropertyId(propertyId);
      if (account === generation && requests.get(propertyId) === request) set(state => ({ reviews: { ...state.reviews, [propertyId]: reviews }, isLoading: false }));
    } catch (error) { if (account === generation) set({ isLoading: false, error: (error as Error).message }); }
  },
  addReview: async review => {
    const account = generation;
    set({ error: null, isLoading: true });
    try {
      const created = await reviewService.addReview(review);
      if (account === generation) set(state => ({ reviews: { ...state.reviews, [review.propertyId]: [created, ...(state.reviews[review.propertyId] ?? []).filter(item => item.id !== created.id)] }, isLoading: false }));
    } catch (error) { if (account === generation) set({ error: (error as Error).message, isLoading: false }); throw error; }
  },
  deleteReview: async (reviewId, propertyId) => {
    await reviewService.deleteReview(reviewId);
    await get().fetchReviews(propertyId);
  },
  replyToReview: async (reviewId, propertyId, text) => {
    await reviewService.replyToReview(reviewId, text);
    await get().fetchReviews(propertyId);
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
useUserStore.subscribe((state, previous) => { if (state.user.id !== previous.user.id) { generation++; requests.clear(); useReviewsStore.setState({ reviews: {}, error: null, isLoading: false }); } });
