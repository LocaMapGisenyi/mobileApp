import { beforeEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ failure: null as any, result: null as any, calls: [] as any[] }));
vi.mock('../src/lib/supabase', () => ({ supabase: {
  auth: { signOut: async () => ({ error: null }), getUser: async () => ({ data: { user: { id: 'alice' } }, error: null }) },
  functions: { invoke: async (name: string, options: any) => { fake.calls.push({ name, options }); return { data: fake.result, error: fake.failure }; } },
  from: () => ({ insert: async () => ({ error: new Error('write refused') }), upsert: async () => ({ error: new Error('write refused') }) }),
} }));
beforeEach(() => { fake.failure = null; fake.result = null; fake.calls = []; });
it('account deletion is rejected when the authenticated backend refuses deletion', async () => {
  const { hostAccountService } = await import('../src/services/api/user.service');
  fake.failure = new Error('active bookings');
  await expect(hostAccountService.deleteAccount()).rejects.toThrow('active bookings');
});
it('saving a favorite never reports success after a refused database write', async () => {
  const { userService } = await import('../src/services/api/user.service');
  await expect(userService.saveProperty('property')).rejects.toThrow('write refused');
});
it('export produces server data for the current user instead of an empty success', async () => {
  const { hostAccountService } = await import('../src/services/api/user.service');
  fake.result = { exportedAt: '2026-09-29T12:00:00Z', user: { id: 'alice' }, data: { messages: [{ content: 'Bonjour' }] } };
  expect(await hostAccountService.requestDataExport()).toEqual(fake.result);
});
