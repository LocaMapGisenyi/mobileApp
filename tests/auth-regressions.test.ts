import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: any) => unknown),
  session: null as any,
  profile: { full_name: 'Alice', phone_number: null, avatar_url: null },
  signOutError: null as any,
  profileResponse: null as Promise<any> | null,
}));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: async () => null, setItem: async () => {}, removeItem: async () => {}, multiRemove: async () => {},
} }));
vi.mock('../src/lib/supabase', () => ({ supabase: {
  auth: {
    getSession: async () => ({ data: { session: fake.session }, error: null }),
    onAuthStateChange: (listener: any) => { fake.listener = listener; return { data: { subscription: { unsubscribe() {} } } }; },
    signOut: async () => ({ error: fake.signOutError }),
  },
  from: () => ({ select: () => ({ eq: () => ({ single: async () => fake.profileResponse ?? ({ data: fake.profile, error: null }) }) }) }),
} }));
const session = (id: string) => ({ user: { id, email: `${id}@example.com`, user_metadata: {} }, access_token: 'private-token' });

describe('authentication boundaries', () => {
  beforeEach(() => { vi.resetModules(); fake.listener = null; fake.session = null; fake.signOutError = null; fake.profileResponse = null; });
  it('auth event callbacks finish synchronously so profile requests cannot deadlock the auth lock', async () => {
    const { useUserStore } = await import('../src/store/user');
    await useUserStore.getState().actions.initAuth();
    expect(fake.listener!('SIGNED_IN', session('alice'))).toBeUndefined();
  });
  it('an absent authoritative session clears a previously cached identity', async () => {
    const { useUserStore } = await import('../src/store/user');
    useUserStore.setState({ user: { ...useUserStore.getState().user, id: 'old-user', isLoggedIn: true } });
    await useUserStore.getState().actions.initAuth();
    expect(useUserStore.getState().user.id).toBeNull();
    expect(useUserStore.getState().user.isLoggedIn).toBe(false);
  });
  it('sign-out failure is surfaced and does not pretend that server credentials were removed', async () => {
    const { useUserStore } = await import('../src/store/user');
    fake.signOutError = new Error('offline');
    await expect(useUserStore.getState().actions.logout()).rejects.toThrow('offline');
  });
  it('a delayed profile response cannot restore the identity after signing out', async () => {
    const { useUserStore } = await import('../src/store/user');
    fake.session = session('alice');
    await useUserStore.getState().actions.initAuth();
    let resolve!: (value: any) => void;
    fake.profileResponse = new Promise(done => { resolve = done; });
    const pending = useUserStore.getState().actions.fetchCurrentUser();
    fake.listener!('SIGNED_OUT', null);
    resolve({ data: { full_name: 'Alice private', phone_number: '123', avatar_url: null }, error: null });
    await pending;
    expect(useUserStore.getState().user).toMatchObject({ id: null, fullName: null, phoneNumber: null, isLoggedIn: false });
  });
});
