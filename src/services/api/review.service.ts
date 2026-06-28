import { supabase } from '../../lib/supabase';
import * as reviewSvc from '../review.service';
import { Review } from '../../types';

const toReview = (r: any): Review => ({
  id: r.id,
  propertyId: r.property_id,
  authorId: r.author_id,
  authorName: r.author?.full_name ?? 'Utilisateur',
  authorAvatar: r.author?.avatar_url ?? undefined,
  rating: r.rating,
  comment: r.comment,
  date: new Date(r.created_at),
  isVerified: r.is_verified,
  stayDuration: r.stay_duration ?? undefined,
  ownerReply: r.reply
    ? { text: r.reply.text, date: new Date(r.reply.created_at) }
    : undefined,
});

export const reviewService = {
  getReviewsByPropertyId: async (propertyId: string): Promise<Review[]> => {
    const rows = await reviewSvc.getReviewsByProperty(propertyId);
    return rows.map(toReview);
  },

  getReviewById: async (reviewId: string): Promise<Review> => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, author:profiles!author_id(full_name, avatar_url), reply:review_replies(*)')
      .eq('id', reviewId)
      .single();
    if (error) throw error;
    return toReview(data);
  },

  addReview: async (
    review: Omit<Review, 'id' | 'date' | 'authorAvatar' | 'authorName' | 'isVerified'>,
  ): Promise<Review> => {
    const row = await reviewSvc.addReview({
      property_id: review.propertyId,
      author_id: review.authorId,
      rating: review.rating,
      comment: review.comment,
      stay_duration: review.stayDuration,
    });
    return toReview(row);
  },

  deleteReview: async (reviewId: string): Promise<void> => reviewSvc.deleteReview(reviewId),

  updateReview: async (reviewId: string, reviewData: Partial<Review>): Promise<Review> => {
    const { data, error } = await supabase
      .from('reviews')
      .update({ rating: reviewData.rating, comment: reviewData.comment })
      .eq('id', reviewId)
      .select()
      .single();
    if (error) throw error;
    return toReview(data);
  },

  replyToReview: async (reviewId: string, replyText: string): Promise<Review> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    await reviewSvc.replyToReview(reviewId, user.id, replyText);
    return reviewService.getReviewById(reviewId);
  },

  getUserReviews: async (): Promise<Review[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const rows = await reviewSvc.getUserReviews(user.id);
    return rows.map(toReview);
  },

  getHostReviews: async (): Promise<Review[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: propIds } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', user.id);
    if (!Array.isArray(propIds) || propIds.length === 0) return [];
    const { data, error } = await supabase
      .from('reviews')
      .select('*, author:profiles!author_id(full_name, avatar_url), reply:review_replies(*)')
      .in('property_id', propIds.map(p => p.id))
      .order('created_at', { ascending: false });
    if (error) return [];
    return (Array.isArray(data) ? data : []).map(toReview);
  },
};
