import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Tables } from '../types/database';
import {
  getReviewsByProperty,
  addReview as addReviewService,
  getUserReviews,
} from '../services/review.service';

type ReviewWithMeta = Tables<'reviews'> & {
  author: Tables<'profiles'> | null;
  reply: Tables<'review_replies'> | null;
};

export function useReviews(propertyId: string | null): {
  reviews: ReviewWithMeta[];
  averageRating: number;
  loading: boolean;
  error: string | null;
  addReview: (data: {
    booking_id?: string;
    author_id: string;
    rating: number;
    comment: string;
    stay_duration?: 'court terme' | 'long terme';
  }) => Promise<void>;
  refetch: () => Promise<void>;
} {
  const [reviews, setReviews] = useState<ReviewWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!propertyId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getReviewsByProperty(propertyId);
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (!propertyId) return;
    fetchReviews();
  }, [propertyId, fetchReviews]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  const addReview = useCallback(
    async (data: {
      booking_id?: string;
      author_id: string;
      rating: number;
      comment: string;
      stay_duration?: 'court terme' | 'long terme';
    }) => {
      if (!propertyId) return;
      await addReviewService({ ...data, property_id: propertyId });
      await fetchReviews();
    },
    [propertyId, fetchReviews],
  );

  return { reviews, averageRating, loading, error, addReview, refetch: fetchReviews };
}

export function useUserReviews(authorId: string | null): {
  reviews: Tables<'reviews'>[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [reviews, setReviews] = useState<Tables<'reviews'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!authorId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getUserReviews(authorId);
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user reviews');
    } finally {
      setLoading(false);
    }
  }, [authorId]);

  useEffect(() => {
    if (!authorId) return;
    fetchReviews();
  }, [authorId, fetchReviews]);

  return { reviews, loading, error, refetch: fetchReviews };
}
