import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';

export async function getReviewsByProperty(
  propertyId: string,
): Promise<(Tables<'reviews'> & { author: Tables<'profiles'> | null; reply: Tables<'review_replies'> | null })[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, author:profiles!author_id(full_name, avatar_url), reply:review_replies(*)')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!Array.isArray(data)) return [];
    return data as (Tables<'reviews'> & {
      author: Tables<'profiles'> | null;
      reply: Tables<'review_replies'> | null;
    })[];
  } catch (err) {
    throw err;
  }
}

export async function addReview(data: {
  property_id: string;
  booking_id?: string;
  author_id: string;
  rating: number;
  comment: string;
  stay_duration?: 'court terme' | 'long terme';
}): Promise<Tables<'reviews'>> {
  try {
    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert(data)
      .select()
      .single();
    if (insertError) throw insertError;

    const { data: allRatings, error: ratingsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('property_id', data.property_id);
    if (ratingsError) throw ratingsError;

    if (Array.isArray(allRatings) && allRatings.length > 0) {
      const avg_rating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
      const review_count = allRatings.length;

      const { error: updateError } = await supabase
        .from('properties')
        .update({ avg_rating, review_count })
        .eq('id', data.property_id);
      if (updateError) throw updateError;
    }

    return review as Tables<'reviews'>;
  } catch (err) {
    throw err;
  }
}

export async function replyToReview(
  reviewId: string,
  authorId: string,
  text: string,
): Promise<Tables<'review_replies'>> {
  try {
    const { data, error } = await supabase
      .from('review_replies')
      .insert({ review_id: reviewId, author_id: authorId, text })
      .select()
      .single();
    if (error) throw error;
    return data as Tables<'review_replies'>;
  } catch (err) {
    throw err;
  }
}

export async function getUserReviews(authorId: string): Promise<Tables<'reviews'>[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, property:properties(title, city)')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!Array.isArray(data)) return [];
    return data as Tables<'reviews'>[];
  } catch (err) {
    throw err;
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);
    if (error) throw error;
  } catch (err) {
    throw err;
  }
}
