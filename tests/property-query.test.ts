import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ calls: [] as { method: string; args: unknown[] }[], result: { data: [], error: null, count: 0 } as any }));
vi.mock('../src/lib/supabase', () => ({ supabase: { from: (table: string) => {
  state.calls.push({ method: 'from', args: [table] });
  const chain: any = { then: (resolve: (result: unknown) => void) => resolve(state.result) };
  for (const method of ['select','lt','eq','or','gte','lte','in','contains','order','range']) chain[method] = (...args: unknown[]) => { state.calls.push({ method, args }); return chain; };
  return chain;
} } }));
import { searchProperties, countProperties, getCalendarDays } from '../src/services/property.service';
beforeEach(() => { state.calls = []; state.result = { data: [], error: null, count: 0 }; });
it('queries published monthly RWF inventory with filters and a stable page range', async () => {
  await searchProperties('Lake', { minPrice: 100000, maxPrice: 500000, bedrooms: 2, propertyType: ['apartment'], amenities: ['wifi'], offset: 40, limit: 40, bounds: { south: -2, north: -1, west: 29, east: 30 } });
  expect(state.calls).toEqual(expect.arrayContaining([
    { method: 'eq', args: ['status', 'ACTIVE'] }, { method: 'eq', args: ['currency', 'RWF'] },
    { method: 'range', args: [40, 79] }, { method: 'gte', args: ['price_per_month', 100000] },
    { method: 'gte', args: ['bedrooms', 2] }, { method: 'contains', args: ['amenities', ['wifi']] },
    { method: 'gte', args: ['latitude', -2] }, { method: 'lte', args: ['longitude', 30] },
  ]));
});
it('does not interpolate filter punctuation from user search text', async () => {
  await searchProperties('lake),status.eq.DRAFT');
  const expression = state.calls.find(call => call.method === 'or')?.args[0] as string;
  expect(expression).not.toContain('),status.eq.DRAFT');
});
it('propagates an alert count failure instead of reporting zero matches', async () => {
  state.result = { data: null, count: null, error: new Error('Offline') };
  await expect(countProperties('', {})).rejects.toThrow('Offline');
});

it('uses the next month boundary for February instead of an invalid February 31', async () => {
  await getCalendarDays('p', '2026-02');
  expect(state.calls).toContainEqual({ method: 'lt', args: ['date', '2026-03-01'] });
});
