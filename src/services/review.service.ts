import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database';

export type ReviewRow = Tables<'reviews'> & {
  author?: { full_name: string; avatar_url: string | null } | null;
  reply?: Tables<'review_replies'>[] | Tables<'review_replies'> | null;
};
export async function withReviewAuthors(rows: ReviewRow[]): Promise<ReviewRow[]> {
  if (!rows.length) return rows;
  const { data, error } = await supabase.from('public_profiles').select('id,full_name,avatar_url').in('id', [...new Set(rows.map(row => row.author_id))]);
  if (error) throw error;
  return rows.map(row => ({ ...row, author: data?.find(author => author.id === row.author_id) }));
}
export async function getReviewsByProperty(propertyId: string): Promise<ReviewRow[]> {
  const { data, error } = await supabase.from('reviews').select('*, reply:review_replies(*)').eq('property_id', propertyId).order('created_at', { ascending: false });
  if (error) throw error;
  return withReviewAuthors(data ?? []);
}

export async function addReview(data: {
  property_id: string;
  booking_id?: string;
  author_id: string;
  rating: number;
  comment: string;
  stay_duration?: 'court terme' | 'long terme';
}): Promise<Tables<'reviews'>> {
  const { data: review, error: insertError } = await supabase
    .from('reviews')
    .insert(data)
    .select()
    .single();
  if (insertError) throw insertError;

  return review as Tables<'reviews'>;
}

export async function replyToReview(
  reviewId: string,
  authorId: string,
  text: string,
): Promise<Tables<'review_replies'>> {
  const { data, error } = await supabase
    .from('review_replies')
    .insert({ review_id: reviewId, author_id: authorId, text })
    .select()
    .single();
  if (error) throw error;
  return data as Tables<'review_replies'>;
}

export async function getUserReviews(authorId: string): Promise<Tables<'reviews'>[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, property:properties(title, city)')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data as Tables<'reviews'>[];
}

export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);
  if (error) throw error;
}
