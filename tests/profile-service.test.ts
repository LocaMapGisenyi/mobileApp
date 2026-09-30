import { beforeEach, expect, it, vi } from 'vitest';
import type { Tables } from '../src/types/database';

type DatabaseProfile = Omit<Tables<'profiles'>, 'full_name' | 'languages'> & {
  full_name: string | null;
  languages: string[] | null;
};
const response = vi.hoisted(() => ({
  data: null as DatabaseProfile | null,
  updates: null as Record<string, unknown> | null,
  error: null as { code: string; message: string } | null,
}));
vi.mock('../src/lib/supabase', () => ({ supabase: {
  from: () => {
    const query = {
      select: () => query,
      eq: () => query,
      update: (updates: Record<string, unknown>) => { response.updates = updates; return query; },
      single: async () => ({ data: response.data, error: response.error }),
    };
    return query;
  },
} }));
import { getProfile, updateProfile } from '../src/services/profile.service';

beforeEach(() => {
  response.data = {
    id: 'alice', full_name: 'Alice', email: 'alice@example.test', phone_number: null,
    avatar_url: null, bio: null, languages: null, kyc_status: 'NOT_VERIFIED', is_host: false,
    preferred_currency: 'RWF', preferred_language: 'fr',
    created_at: '2026-09-30T08:00:00Z', updated_at: '2026-09-30T08:00:00Z',
  };
  response.error = null;
  response.updates = null;
});

it('formats the languages of a newly created profile whose SQL array is null', async () => {
  const profile = await getProfile('alice');

  expect(profile!.languages.join(', ')).toBe('');
  expect(profile!.languages).toEqual([]);
});

it('returns an editable empty name when a legacy profile has no full name', async () => {
  response.data!.full_name = null;

  const profile = await getProfile('alice');

  expect(profile!.full_name.trim()).toBe('');
});

it('preserves saved languages and optional profile details', async () => {
  response.data!.languages = ['Français', 'Kinyarwanda'];
  response.data!.bio = 'Bienvenue au lac Kivu.';

  const profile = await getProfile('alice');

  expect(profile!.languages.join(', ')).toBe('Français, Kinyarwanda');
  expect(profile).toMatchObject({ full_name: 'Alice', bio: 'Bienvenue au lac Kivu.', phone_number: null });
});

it('normalizes the profile returned after updating an unrelated field', async () => {
  response.data!.full_name = null;

  const profile = await updateProfile('alice', { bio: 'Présentation' });

  expect(profile.languages).toEqual([]);
  expect(profile.full_name).toBe('');
});

it('keeps a missing profile distinguishable from an empty profile', async () => {
  response.data = null;
  response.error = { code: 'PGRST116', message: 'No rows' };

  await expect(getProfile('alice')).resolves.toBeNull();
});

it.each(['read', 'update'] as const)('propagates a refused profile %s', async operation => {
  response.data = null;
  response.error = { code: '42501', message: 'Permission denied' };

  const pending = operation === 'read' ? getProfile('alice') : updateProfile('alice', { bio: 'Présentation' });

  await expect(pending).rejects.toEqual({ code: '42501', message: 'Permission denied' });
});

it('leaves server-managed timestamps out of the column-restricted profile update', async () => {
  await updateProfile('alice', { full_name: 'Alice', languages: [] });

  expect(response.updates).toEqual({ full_name: 'Alice', languages: [] });
  expect(response.updates).not.toHaveProperty('updated_at');
});
