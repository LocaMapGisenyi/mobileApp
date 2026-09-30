import { supabase } from '../../lib/supabase';
import * as reviewSvc from '../review.service';
import { Review } from '../../types';

const toReview = (r: reviewSvc.ReviewRow): Review => {
  const reply = Array.isArray(r.reply) ? r.reply[0] : r.reply;
  return ({
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
  ownerReply: reply
    ? { text: reply.text, date: new Date(reply.created_at) }
    : undefined,
});
};

export const reviewService = {
  getReviewsByPropertyId: async (propertyId: string): Promise<Review[]> => {
    const rows = await reviewSvc.getReviewsByProperty(propertyId);
    return rows.map(toReview);
  },

  getReviewById: async (reviewId: string): Promise<Review> => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, reply:review_replies(*)')
      .eq('id', reviewId)
      .single();
    if (error) throw error;
    return toReview((await reviewSvc.withReviewAuthors([data]))[0]);
  },

  addReview: async (
    review: Omit<Review, 'id' | 'date' | 'authorAvatar' | 'authorName' | 'isVerified'> & { bookingId?: string },
  ): Promise<Review> => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error('Connectez-vous pour laisser un avis.');
    if (!review.bookingId) throw new Error('Un séjour terminé est nécessaire pour laisser un avis.');
    const row = await reviewSvc.addReview({
      property_id: review.propertyId,
      author_id: user.id,
      booking_id: review.bookingId,
      rating: review.rating,
      comment: review.comment,

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
    const { data: propIds, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', user.id);
    if (propertyError) throw propertyError;
    const { data: collaborations, error: collaborationError } = await supabase.from('co_hosts')
      .select('listing_ids,permissions').eq('co_host_id', user.id).eq('status', 'ACTIVE');
    if (collaborationError) throw collaborationError;
    const visibleIds = [...new Set([...(propIds ?? []).map(p => p.id), ...(collaborations ?? [])
      .filter(c => c.permissions.reviews).flatMap(c => c.listing_ids)])];
    if (!visibleIds.length) return [];
    const { data, error } = await supabase
      .from('reviews')
      .select('*, reply:review_replies(*)')
      .in('property_id', visibleIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (await reviewSvc.withReviewAuthors(data ?? [])).map(toReview);
  },
};
