import { beforeEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({
  upload: null as Promise<string> | null,
  initialAuth: null as Promise<{ data: { user: { id: string } }; error: null }> | null,
  finalAuth: null as Promise<{ data: { user: { id: string } }; error: null }> | null,
  rpcResult: null as Promise<{ data: { status: string }; error: null }> | null,
  authCalls: 0,
  accountId: 'alice',
  submissions: [] as { name: string; parameters: Record<string, unknown> }[],
  uploaded: [] as { uri: string; mimeType: string; ownerId: string }[],
}));
vi.mock('../src/lib/supabase', () => ({ supabase: {
  auth: { getUser: async () => {
    const deferred = ++fake.authCalls === 1 ? fake.initialAuth : fake.finalAuth;
    return deferred ?? { data: { user: { id: fake.accountId } }, error: null };
  } },
  rpc: async (name: string, parameters: Record<string, unknown>) => {
    fake.submissions.push({ name, parameters });
    return fake.rpcResult ?? { data: { status: 'PENDING' }, error: null };
  },
} }));
vi.mock('../src/lib/storage', () => ({
  uploadPrivateDocument: async (uri: string, mimeType: string, ownerId: string) => {
    fake.uploaded.push({ uri, mimeType, ownerId });
    return fake.upload ?? `private/${ownerId}/${uri.split('/').pop()}`;
  },
}));
import { useHostOnboardingStore } from '../src/store/hostOnboarding';
import { setAccountIdentity } from '../src/lib/accountScope';

beforeEach(() => {
  fake.upload = null;
  fake.initialAuth = null;
  fake.finalAuth = null;
  fake.rpcResult = null;
  fake.authCalls = 0;
  fake.accountId = 'alice';
  fake.submissions = [];
  fake.uploaded = [];
  setAccountIdentity('alice');
  useHostOnboardingStore.getState().reset();
  useHostOnboardingStore.getState().updateData({
    fullName: ' Alice ', phone: '780000000', dateOfBirth: '01/01/1990', nationality: 'Rwanda',
    propertyTypes: ['house'], kycSelfie: 'file:///selfie.jpg',
    kycIdFront: 'file:///front.png', kycIdBack: 'file:///back.webp',
  });
});

it('submits a KYC application without financial details while retaining identity metadata', async () => {
  await useHostOnboardingStore.getState().complete();

  expect(fake.submissions).toEqual([{
    name: 'submit_host_application',
    parameters: {
      p_legal_name: 'Alice',
      p_document_keys: ['private/alice/selfie.jpg', 'private/alice/front.png', 'private/alice/back.webp'],
      p_payout_details: {
        phone: '780000000', date_of_birth: '01/01/1990', nationality: 'Rwanda', property_types: ['house'],
      },
    },
  }]);
  expect(fake.uploaded).toEqual([
    { uri: 'file:///selfie.jpg', mimeType: 'image/jpeg', ownerId: 'alice' },
    { uri: 'file:///front.png', mimeType: 'image/png', ownerId: 'alice' },
    { uri: 'file:///back.webp', mimeType: 'image/webp', ownerId: 'alice' },
  ]);
  expect(useHostOnboardingStore.getState().completed).toBe(true);
  expect(useHostOnboardingStore.getState().data.kycStatus).toBe('submitted');
});

it('still requires the three KYC documents before sending an application', async () => {
  useHostOnboardingStore.getState().updateData({ kycIdBack: null });

  await expect(useHostOnboardingStore.getState().complete()).rejects.toThrow();

  expect(fake.uploaded).toEqual([]);
  expect(fake.submissions).toEqual([]);
  expect(useHostOnboardingStore.getState().completed).toBe(false);
});

it('changing accounts cancels an in-flight submission without restoring private data', async () => {
  let resolve!: (value: string) => void;
  fake.upload = new Promise(done => { resolve = done; });
  const pending = useHostOnboardingStore.getState().complete();
  await Promise.resolve();
  await Promise.resolve();
  fake.accountId = 'bob';
  setAccountIdentity('bob');
  resolve('private/alice/key');

  await expect(pending).rejects.toThrow();

  expect(fake.submissions).toEqual([]);
  expect(useHostOnboardingStore.getState().completed).toBe(false);
  expect(useHostOnboardingStore.getState().data.fullName).toBe('');
  expect(useHostOnboardingStore.getState().data.kycSelfie).toBeNull();
});

it('does not upload a new account form when an earlier authentication check finishes late', async () => {
  let resolve!: (value: { data: { user: { id: string } }; error: null }) => void;
  fake.initialAuth = new Promise(done => { resolve = done; });
  const pending = useHostOnboardingStore.getState().complete();
  fake.accountId = 'bob';
  setAccountIdentity('bob');
  useHostOnboardingStore.getState().updateData({
    fullName: 'Bob', kycSelfie: 'file:///bob-selfie.jpg',
    kycIdFront: 'file:///bob-front.jpg', kycIdBack: 'file:///bob-back.jpg',
  });
  resolve({ data: { user: { id: 'alice' } }, error: null });

  await expect(pending).rejects.toThrow();

  expect(fake.uploaded).toEqual([]);
  expect(fake.submissions).toEqual([]);
  expect(useHostOnboardingStore.getState().data.fullName).toBe('Bob');
  expect(useHostOnboardingStore.getState().completed).toBe(false);
});

it('does not send an application after the form resets during the last authentication check', async () => {
  let resolve!: (value: { data: { user: { id: string } }; error: null }) => void;
  fake.finalAuth = new Promise(done => { resolve = done; });
  const pending = useHostOnboardingStore.getState().complete();
  await vi.waitFor(() => expect(fake.authCalls).toBe(2));
  useHostOnboardingStore.getState().reset();
  resolve({ data: { user: { id: 'alice' } }, error: null });

  await expect(pending).rejects.toThrow();

  expect(fake.submissions).toEqual([]);
  expect(useHostOnboardingStore.getState().completed).toBe(false);
});

it('rejects a late submission response so the new account cannot advance to confirmation', async () => {
  let resolve!: (value: { data: { status: string }; error: null }) => void;
  fake.rpcResult = new Promise(done => { resolve = done; });
  const pending = useHostOnboardingStore.getState().complete();
  await vi.waitFor(() => expect(fake.submissions).toHaveLength(1));
  fake.accountId = 'bob';
  setAccountIdentity('bob');
  resolve({ data: { status: 'PENDING' }, error: null });

  await expect(pending).rejects.toThrow();

  expect(useHostOnboardingStore.getState().completed).toBe(false);
  expect(useHostOnboardingStore.getState().data.kycStatus).toBe('idle');
  expect(useHostOnboardingStore.getState().data.fullName).toBe('');
});
