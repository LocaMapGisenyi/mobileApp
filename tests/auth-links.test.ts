import { beforeEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ calls: [] as string[], state: {} as Record<string, unknown>, error: null as any, scheme: 'locamap' as string | string[], executionEnvironment: 'standalone' }));
vi.mock('react-native', () => ({ Platform: { OS: 'android' }, Linking: {} }));
vi.mock('expo-constants', () => ({ ExecutionEnvironment: { StoreClient: 'storeClient' }, default: { get executionEnvironment() { return fake.executionEnvironment; }, expoConfig: { get scheme() { return fake.scheme; } } } }));
vi.mock('expo-linking', () => ({ createURL: (path: string) => `exp://192.0.2.10:8081/--/${path}` }));
vi.mock('../src/store/user', () => ({ useUserStore: { setState: (state: object) => Object.assign(fake.state, state) } }));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: {
  exchangeCodeForSession: async (code: string) => { fake.calls.push(code); return { data: { session: fake.error ? null : { user: { id: 'alice' } } }, error: fake.error }; },
} } }));
beforeEach(() => { vi.resetModules(); fake.calls = []; fake.state = {}; fake.error = null; fake.scheme = 'locamap'; fake.executionEnvironment = 'standalone'; delete process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL; });
it('uses the Expo Go development URL and accepts only recovery links for that server', async () => {
  fake.executionEnvironment = 'storeClient';
  const { authRedirectUrl, handleAuthUrl } = await import('../src/lib/authLinks');
  expect(authRedirectUrl()).toBe('exp://192.0.2.10:8081/--/auth/recovery');
  await handleAuthUrl('locamap://auth/recovery?code=wrong-client');
  await handleAuthUrl('exp://192.0.2.11:8081/--/auth/recovery?code=wrong-server');
  expect(fake.calls).toEqual([]);
  await handleAuthUrl('exp://192.0.2.10:8081/--/auth/recovery?code=expo-code');
  expect(fake.calls).toEqual(['expo-code']);
  expect(fake.state.passwordRecovery).toBe(true);
});
it('uses the installed staging scheme and ignores production recovery links', async () => {
  fake.scheme = 'locamap-staging';
  const { authRedirectUrl, handleAuthUrl } = await import('../src/lib/authLinks');
  expect(authRedirectUrl()).toBe('locamap-staging://auth/recovery');
  await handleAuthUrl('locamap://auth/recovery?code=wrong-app');
  expect(fake.calls).toEqual([]);
  await handleAuthUrl('locamap-staging://auth/recovery?code=staging-code');
  expect(fake.calls).toEqual(['staging-code']);
  expect(fake.state.passwordRecovery).toBe(true);
});
it('uses the first configured scheme when Expo provides multiple schemes', async () => {
  fake.scheme = ['locamap-staging', 'exp+locamap'];
  const { authRedirectUrl } = await import('../src/lib/authLinks');
  expect(authRedirectUrl()).toBe('locamap-staging://auth/recovery');
});
it('ignores credentials embedded in an unrelated deep link', async () => {
  const { handleAuthUrl } = await import('../src/lib/authLinks');
  await handleAuthUrl('locamap://unrelated/recovery?code=untrusted');
  expect(fake.calls).toEqual([]);
  expect(fake.state).toEqual({});
});
it('opens the new-password flow only after exchanging a valid recovery code', async () => {
  const { handleAuthUrl } = await import('../src/lib/authLinks');
  await handleAuthUrl('locamap://auth/recovery?code=recovery-code');
  expect(fake.calls).toEqual(['recovery-code']);
  expect(fake.state.passwordRecovery).toBe(true);
});
it('keeps recovery closed when a link has expired', async () => {
  const { handleAuthUrl } = await import('../src/lib/authLinks');
  fake.error = new Error('expired');
  await expect(handleAuthUrl('locamap://auth/recovery?code=expired')).rejects.toThrow('expired');
  expect(fake.state.passwordRecovery).toBeUndefined();
});
