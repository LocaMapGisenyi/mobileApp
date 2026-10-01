import { beforeEach, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({
  owned: [] as { id: string; title: string; property_type: string | null; status: string }[],
  delegated: [] as { id: string; title: string; property_type: string | null; status: string }[],
  assignments: [] as { listing_ids: string[]; permissions: { calendar: boolean } }[],
}));
vi.mock('../src/services/host.service', () => ({ getHostListings: async () => fake.owned }));
vi.mock('../src/services/property.service', () => ({}));
vi.mock('../src/lib/supabase', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'host' } }, error: null }) },
  from: (table: string) => {
    let ids: string[] | null = null;
    const query = {
      select: () => query, eq: () => query,
      in: (_column: string, values: string[]) => { ids = values; return query; },
      then: (resolve: (value: unknown) => void) => resolve({ error: null,
        data: table === 'co_hosts' ? fake.assignments : fake.delegated.filter(row => !ids || ids.includes(row.id)) }),
    };
    return query;
  },
} }));
import { hostService } from '../src/services/api/host.service';

beforeEach(() => { fake.owned = []; fake.delegated = []; fake.assignments = []; });
const listing = (id: string, status: string) => ({ id, title: id, status, property_type: null });
it('excludes only archived owned/delegated calendar listings and preserves permission boundaries', async () => {
  fake.owned = [listing('own-draft', 'DRAFT'), listing('own-paused', 'PAUSED'), listing('own-archived', 'ARCHIVED')];
  fake.delegated = [listing('delegate-paused', 'PAUSED'), listing('delegate-archived', 'ARCHIVED'), listing('no-permission', 'ACTIVE')];
  fake.assignments = [
    { listing_ids: ['delegate-paused', 'delegate-archived', 'own-draft'], permissions: { calendar: true } },
    { listing_ids: ['no-permission'], permissions: { calendar: false } },
  ];
  expect(await hostService.getHostListings()).toEqual([
    { id: 'own-draft', title: 'own-draft', type: null, canSetPricing: true },
    { id: 'own-paused', title: 'own-paused', type: null, canSetPricing: true },
    { id: 'delegate-paused', title: 'delegate-paused', type: null, canSetPricing: false },
  ]);
});
