import { beforeEach, expect, it, vi } from 'vitest';
const boundary = vi.hoisted(() => ({ tables: [] as string[], review: { id: 'review', property_id: 'p', author_id: 'a', rating: 5, comment: 'Great home' },
  from: vi.fn(), getUser: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { from: boundary.from, auth: { getUser: boundary.getUser } } }));
import { addReview } from '../src/services/review.service';
beforeEach(() => { boundary.tables = []; boundary.getUser.mockResolvedValue({ data: { user: { id: 'a' } }, error: null }); boundary.from.mockImplementation((table: string) => {
  boundary.tables.push(table);
  const chain: any = { insert: () => chain, select: () => chain, eq: () => chain, update: () => chain, single: async () => ({ data: boundary.review, error: null }), then: (resolve: (v: unknown) => void) => resolve({ data: [{ rating: 5 }], error: null }) }; return chain;
}); });
it('leaves review aggregate updates to the server instead of writing another owners property', async () => {
  await addReview({ property_id: 'p', author_id: 'a', booking_id: 'booking', rating: 5, comment: 'Great home' });
  expect(boundary.tables).toEqual(['reviews']);
});
