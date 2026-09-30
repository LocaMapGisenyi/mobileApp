import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ error: new Error('service unavailable') as Error | null }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async (key: string) => key === '@resources_bookmarks' ? '["alice-private-bookmark"]' : null, setItem: async () => {} } }));
vi.mock('../src/lib/supabase', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'bob' } }, error: null }) },
  from: () => {
    const query: any = { select: () => query, eq: () => query, order: () => query, limit: () => query, or: () => query,
      then: (resolve: any) => Promise.resolve(resolve({ data: [{ article_slug: 'bob-bookmark' }], error: state.error })),
      upsert: async () => ({ error: state.error }) };
    return query;
  },
} }));
it('failed resource loads are visible rather than presented as an empty catalog', async () => {
  const { resourcesService } = await import('../src/services/api/resources.service');
  state.error = new Error('service unavailable');
  await expect(resourcesService.getArticles()).rejects.toThrow('service unavailable');
});
it('refused course progress never reports a completed step', async () => {
  const { resourcesService } = await import('../src/services/api/resources.service');
  state.error = new Error('service unavailable');
  await expect(resourcesService.markStepComplete('course', 'step')).rejects.toThrow('service unavailable');
});
it('resource bookmarks are read for the active account instead of another users device cache', async () => {
  const { resourcesService } = await import('../src/services/api/resources.service');
  state.error = null;
  expect(await resourcesService.getBookmarks()).toEqual(['bob-bookmark']);
});
it('failed guide loads are not converted into a successful empty catalog', async () => {
  const { guidesService } = await import('../src/services/api/guides.service');
  state.error = new Error('service unavailable');
  await expect(guidesService.getAll()).rejects.toThrow('service unavailable');
});
